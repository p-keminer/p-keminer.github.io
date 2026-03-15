import { useCallback, useEffect, useRef, useState } from "react";

// ── Arena & iso constants ──────────────────────────────────────────────────────
const ARENA_W  = 1080;
const ARENA_H  = 640;
const TILE_W   = 110;    // iso tile horizontal screen span
const TILE_H   = 55;     // iso tile depth screen span
const LIFT_U   = 65;     // screen px per z-unit of elevation
const ISO_OX   = 450;    // iso origin x  (shifted left → free space on right for operator)
const ISO_OY   = 268;    // iso origin y  (back-top corner of grid)
const GRID_C   = 6;
const GRID_R   = 5;
const RAIL_Z   = 2.5;    // crane rail height (z units above floor)
const HOOK_MAX = 2.15;   // max hook elevation (z units)
const HOOK_SPEED  = 1.8; // z-units/s  (W/S key)
const GRAB_Z      = 0.24;// max hookZ to allow grab/release

// Heavy piece timing (4th piece requires F lock within 2 s)
const HEAVY_WARN_RED_AT   = 1.0; // s: switch orange→red after this
const HEAVY_FAIL_TIME     = 2.0; // s: trigger fail if F not pressed in time

// Crane movement
const CRANE_C_MIN   = 0.05;
const CRANE_C_MAX   = 5.95;
const CRANE_R_MIN   = 0.05;
const CRANE_R_MAX   = 4.85;
const CRANE_COARSE  = 2.4;  // tiles/s arrow keys
const CRANE_FINE    = 0.55; // tiles/s A/D
const CRANE_ACCEL   = 9;

// Target zone — top-left corner, far from bolt (bolt starts at col≈5.25, row≈4.65)
const TGT_C1 = 0.45, TGT_C2 = 2.15;
const TGT_R1 = 0.45, TGT_R2 = 2.15;

// ── Iso projection ─────────────────────────────────────────────────────────────
function isoX(col: number, row: number): number {
  return ISO_OX + (col - row) * (TILE_W / 2);
}
function isoY(col: number, row: number, z = 0): number {
  return ISO_OY + (col + row) * (TILE_H / 2) - z * LIFT_U;
}

// ── Pieces ────────────────────────────────────────────────────────────────────
type ScrapType = "plate" | "gear" | "rod" | "bolt" | "ball" | "plant";

const PIECE_COL: Record<ScrapType, { fill: string; dark: string; light: string; glow: string }> = {
  plate: { fill: "#e07030", dark: "#803000", light: "#f8a868", glow: "rgba(255,130,40,0.55)" },
  gear:  { fill: "#28bce0", dark: "#0870a8", light: "#74e0ff", glow: "rgba(40,200,240,0.55)" },
  rod:   { fill: "#d4c240", dark: "#7a6800", light: "#f0de70", glow: "rgba(220,200,40,0.55)" },
  bolt:  { fill: "#b060e0", dark: "#581898", light: "#d8a0ff", glow: "rgba(180,80,240,0.65)" },
  ball:  { fill: "#8b4a14", dark: "#3e1c02", light: "#c47840", glow: "rgba(160,80,30,0.55)" },
  plant: { fill: "#48a830", dark: "#1a5010", light: "#80d860", glow: "rgba(70,180,50,0.50)" },
};

/** Piece id=3 (bolt) is HEAVY and requires F-lock to carry safely */
const HEAVY_ID = 3;

interface Piece {
  id: number;
  type: ScrapType;
  col: number; row: number;
  pileCol: number; pileRow: number;
  inTarget: boolean;
  grabbed: boolean;
  isJunk?: boolean;
}

// Pieces placed at fractional positions requiring both arrow + A/D fine-adj
const MAKE_PIECES = (): Piece[] => [
  { id: 0, type: "plate", col: 0.45, row: 0.55,
    pileCol: 0.75, pileRow: 0.75, inTarget: false, grabbed: false },
  { id: 1, type: "gear",  col: 0.60, row: 4.55,
    pileCol: 1.60, pileRow: 0.80, inTarget: false, grabbed: false },
  { id: 2, type: "rod",   col: 5.45, row: 0.60,
    pileCol: 0.80, pileRow: 1.60, inTarget: false, grabbed: false },
  { id: 3, type: "bolt",  col: 5.25, row: 4.65,
    pileCol: 1.55, pileRow: 1.65, inTarget: false, grabbed: false },
  // Junk objects — must NOT be sorted into the target zone
  { id: 4, type: "ball",  col: 2.80, row: 2.50,
    pileCol: 0.65, pileRow: 1.20, inTarget: false, grabbed: false, isJunk: true },
  { id: 5, type: "plant", col: 3.80, row: 1.80,
    pileCol: 1.35, pileRow: 1.25, inTarget: false, grabbed: false, isJunk: true },
];

// ── Floor ─────────────────────────────────────────────────────────────────────
function drawFloor(ctx: CanvasRenderingContext2D, sortedCount: number) {
  for (let r = GRID_R - 1; r >= 0; r--) {
    for (let c = 0; c < GRID_C; c++) {
      const inZone = c + 0.5 >= TGT_C1 && c + 0.5 <= TGT_C2
                  && r + 0.5 >= TGT_R1 && r + 0.5 <= TGT_R2;
      const full   = inZone && sortedCount >= 4;
      const sx = isoX(c, r), sy = isoY(c, r);

      ctx.beginPath();
      ctx.moveTo(sx,             sy);
      ctx.lineTo(sx + TILE_W/2,  sy + TILE_H/2);
      ctx.lineTo(sx,             sy + TILE_H);
      ctx.lineTo(sx - TILE_W/2,  sy + TILE_H/2);
      ctx.closePath();

      ctx.fillStyle = full
        ? "rgba(40,160,70,0.24)"
        : inZone
          ? (c + r) % 2 === 0 ? "rgba(30,120,60,0.20)" : "rgba(20,90,50,0.18)"
          : (c + r) % 2 === 0 ? "rgba(14,32,68,0.82)"  : "rgba(10,24,52,0.82)";
      ctx.fill();

      ctx.strokeStyle = inZone ? "rgba(60,200,100,0.30)" : "rgba(0,90,200,0.14)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // Target zone dashed border
  type Corner = [number, number];
  const corners: Corner[] = [
    [TGT_C1, TGT_R1], [TGT_C2, TGT_R1], [TGT_C2, TGT_R2], [TGT_C1, TGT_R2],
  ];
  ctx.strokeStyle = sortedCount >= 4
    ? "rgba(60,220,100,0.80)"
    : "rgba(50,200,90,0.48)";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  corners.forEach(([c, r], i) => {
    const px = isoX(c, r), py = isoY(c, r);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]);

  // Zone label
  const lx = isoX((TGT_C1 + TGT_C2) / 2, (TGT_R1 + TGT_R2) / 2);
  const ly = isoY((TGT_C1 + TGT_C2) / 2, (TGT_R1 + TGT_R2) / 2);
  ctx.fillStyle = sortedCount >= 4 ? "rgba(60,220,100,0.85)" : "rgba(50,200,90,0.50)";
  ctx.font = "bold 10px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("SORTIERZONE", lx, ly - 5);
  ctx.fillText(`${sortedCount} / 4`, lx, ly + 9);
  ctx.textAlign = "left";
}

// ── Rails / gantry scaffold ──────────────────────────────────────────────────
function drawRails(ctx: CanvasRenderingContext2D, craneCol: number, craneRow: number) {
  const rz = RAIL_Z;

  // Fixed side beams (full col span at back/front rows)
  const rowEdges = [0.15, GRID_R - 0.15];
  ctx.lineWidth = 5;
  rowEdges.forEach(rOff => {
    const x0 = isoX(0, rOff), y0 = isoY(0, rOff, rz);
    const x1 = isoX(GRID_C, rOff), y1 = isoY(GRID_C, rOff, rz);
    ctx.strokeStyle = "#192e5e"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = "rgba(60,120,200,0.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0 - 1); ctx.lineTo(x1, y1 - 1); ctx.stroke();
    ctx.lineWidth = 5;
  });

  // Moving cross-beam at crane's row
  const cx0 = isoX(0, craneRow),      cy0 = isoY(0, craneRow, rz);
  const cx1 = isoX(GRID_C, craneRow), cy1 = isoY(GRID_C, craneRow, rz);
  ctx.strokeStyle = "#243870"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx1, cy1); ctx.stroke();
  ctx.strokeStyle = "rgba(80,150,255,0.38)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx0, cy0 - 1); ctx.lineTo(cx1, cy1 - 1); ctx.stroke();

  // Moving depth-beam at crane's col
  const dr0x = isoX(craneCol, 0),      dr0y = isoY(craneCol, 0,      rz);
  const dr1x = isoX(craneCol, GRID_R), dr1y = isoY(craneCol, GRID_R, rz);
  ctx.strokeStyle = "#1c2e60"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(dr0x, dr0y); ctx.lineTo(dr1x, dr1y); ctx.stroke();

  // Corner vertical struts
  ctx.strokeStyle = "rgba(0,60,180,0.16)"; ctx.lineWidth = 1;
  rowEdges.forEach(rOff => {
    [0.15, GRID_C - 0.15].forEach(cOff => {
      ctx.beginPath();
      ctx.moveTo(isoX(cOff, rOff), isoY(cOff, rOff, rz));
      ctx.lineTo(isoX(cOff, rOff), isoY(cOff, rOff, 0));
      ctx.stroke();
    });
  });
}

// ── Crane robot body + variable-height hook ────────────────────────────────────
function drawCraneBot(
  ctx: CanvasRenderingContext2D,
  col: number, row: number,
  holding: boolean,
  hookZ: number,
  locked: boolean,
  heavyWarning: boolean,
  heavyHoldTime: number,
) {
  const bsx   = isoX(col, row);
  const bsy   = isoY(col, row, RAIL_Z);
  const clawX = isoX(col, row);
  const clawY = isoY(col, row, hookZ);

  // ── ISO box body ─────────────────────────────────────
  const hw = 26, hd = 13, hh = 22;

  // Top face
  ctx.fillStyle = "#4a94e4";
  ctx.beginPath();
  ctx.moveTo(bsx,      bsy - hd);
  ctx.lineTo(bsx + hw, bsy);
  ctx.lineTo(bsx,      bsy + hd);
  ctx.lineTo(bsx - hw, bsy);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(160,225,255,0.28)"; ctx.lineWidth = 0.8; ctx.stroke();

  // Left face
  ctx.fillStyle = "#153c82";
  ctx.beginPath();
  ctx.moveTo(bsx - hw, bsy);
  ctx.lineTo(bsx,      bsy + hd);
  ctx.lineTo(bsx,      bsy + hd + hh);
  ctx.lineTo(bsx - hw, bsy + hh);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(90,155,255,0.18)"; ctx.lineWidth = 0.6; ctx.stroke();

  // Right face
  ctx.fillStyle = "#2570c2";
  ctx.beginPath();
  ctx.moveTo(bsx + hw, bsy);
  ctx.lineTo(bsx,      bsy + hd);
  ctx.lineTo(bsx,      bsy + hd + hh);
  ctx.lineTo(bsx + hw, bsy + hh);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(100,185,255,0.18)"; ctx.lineWidth = 0.6; ctx.stroke();

  // Eyes on right face
  const eyeY = bsy + hd + hh * 0.44;
  [bsx + hw * 0.33, bsx + hw * 0.70].forEach(ex => {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath(); ctx.ellipse(ex, eyeY + 1, 4.5, 3.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#88d8ff";
    ctx.shadowColor = "#88d8ff"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(ex, eyeY, 2.8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Chest panel
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.roundRect(bsx + hw * 0.08, bsy + hd + hh * 0.22, hw * 0.72, hh * 0.44, 2);
  ctx.fill();

  // Antenna
  ctx.strokeStyle = "#2865c8"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bsx - 5, bsy - hd); ctx.lineTo(bsx - 5, bsy - hd - 12); ctx.stroke();
  ctx.fillStyle = "#66ccff";
  ctx.shadowColor = "#66ccff"; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.arc(bsx - 5, bsy - hd - 14, 3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Crane boom
  ctx.strokeStyle = "#184080"; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(bsx + hw, bsy + hd * 0.3);
  ctx.lineTo(bsx + hw + 32, bsy - hd * 0.6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(80,165,255,0.35)"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(bsx + hw, bsy + hd * 0.3 - 1);
  ctx.lineTo(bsx + hw + 32, bsy - hd * 0.6 - 1);
  ctx.stroke();

  // ── Cable (variable length based on hookZ) ──────────────────
  const cableTopY = bsy + hd + hh;
  const lockCol = locked ? "#60e8a0" : (holding ? "#5090d8" : "#283860");
  const cableGrad = ctx.createLinearGradient(clawX, cableTopY, clawX, clawY - 14);
  cableGrad.addColorStop(0, holding ? "#5090d8" : "#283860");
  cableGrad.addColorStop(1, holding ? "#2860a0" : "#122038");
  ctx.strokeStyle = locked ? "#3ab878" : cableGrad;
  ctx.lineWidth = 3;
  ctx.setLineDash(locked ? [4, 3] : []);
  ctx.beginPath();
  ctx.moveTo(clawX, cableTopY);
  ctx.lineTo(clawX, clawY - 14);
  ctx.stroke();
  ctx.setLineDash([]);
  void lockCol; // suppress unused warning

  // ── Claw at current hookZ position ──────────────────────────
  const spread = holding ? 5 : 14;
  ctx.fillStyle = "#1e2e58";
  ctx.beginPath(); ctx.roundRect(clawX - 12, clawY - 18, 24, 11, 3); ctx.fill();
  ctx.strokeStyle = "#4080c8"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(clawX - 12, clawY - 18, 24, 11, 3); ctx.stroke();

  const fc = holding
    ? (locked ? "#50c888" : "#60a0e8")
    : "#3a6090";
  [-1, 1].forEach(side => {
    ctx.save(); ctx.translate(clawX + side * spread, clawY - 7);
    ctx.rotate(side * (holding ? 0.13 : 0.36));
    ctx.fillStyle = fc;
    ctx.beginPath(); ctx.roundRect(-3.5, 0, 7, 20, 3); ctx.fill();
    ctx.strokeStyle = "#88ccff"; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.restore();
  });

  if (holding) {
    const glowCol = locked ? "rgba(60,210,120,0.6)" : "rgba(80,180,255,0.6)";
    ctx.shadowColor = glowCol; ctx.shadowBlur = 16;
    ctx.fillStyle   = locked ? "rgba(60,210,120,0.14)" : "rgba(80,180,255,0.14)";
    ctx.beginPath(); ctx.arc(clawX, clawY + 5, 14, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
  }

  // Heavy-piece warning indicator on claw (orange 0-1s, red fast 1-2s)
  if (heavyWarning && !locked) {
    const isRed   = heavyHoldTime >= HEAVY_WARN_RED_AT;
    const period  = isRed ? 130 : 400; // ms half-cycle (red = fast)
    const blink   = Math.sin((Date.now() / period) * Math.PI) > 0;
    if (blink) {
      const fColor = isRed ? "#ff3b3b" : "#ffaa20";
      const sColor = isRed ? "rgba(255,50,50,0.9)" : "rgba(255,160,20,0.85)";
      ctx.fillStyle = fColor;
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = sColor; ctx.shadowBlur = 12;
      ctx.fillText("F", clawX, clawY - 24);
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }
    // Progress arc around claw showing how close to fail
    const angle = (heavyHoldTime / HEAVY_FAIL_TIME) * Math.PI * 2;
    ctx.strokeStyle = isRed ? "rgba(255,60,60,0.6)" : "rgba(255,160,30,0.55)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(clawX, clawY, 17, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.stroke();
  }
  if (locked) {
    ctx.fillStyle = "#4ade80";
    ctx.shadowColor = "#4ade80"; ctx.shadowBlur = 6;
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("FIXIERT", clawX, clawY - 22);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }

  // Hook Z indicator (small vertical bar on side)
  const barX = bsx - hw - 10;
  const barH = LIFT_U * HOOK_MAX;
  const fillH = (hookZ / HOOK_MAX) * barH;
  ctx.fillStyle = "rgba(0,50,130,0.35)";
  ctx.beginPath(); ctx.roundRect(barX - 4, bsy - barH + hd, 4, barH, 2); ctx.fill();
  ctx.fillStyle = locked ? "#4ade80" : "rgba(80,160,255,0.7)";
  ctx.beginPath(); ctx.roundRect(barX - 4, bsy - fillH + hd, 4, fillH, 2); ctx.fill();
}

// ── Scrap pieces (iso perspective with z-height) ───────────────────────────────
function drawPieceIso(
  ctx: CanvasRenderingContext2D,
  p: Piece,
  z = 0,
) {
  const px = isoX(p.col, p.row);
  const py = isoY(p.col, p.row, z);
  const c  = PIECE_COL[p.type];
  const fc = p.grabbed ? c.light : p.inTarget ? c.light : c.fill;
  const isHeavy = p.id === HEAVY_ID;

  if (p.grabbed || p.inTarget) {
    ctx.shadowColor = p.grabbed
      ? (isHeavy ? "rgba(255,100,255,0.7)" : "rgba(100,200,255,0.7)")
      : c.glow;
    ctx.shadowBlur = p.grabbed ? 16 : 9;
  }

  switch (p.type) {
    case "plate": {
      const pw = 28, pd = 11;
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.moveTo(px,       py - pd / 2);
      ctx.lineTo(px + pw,  py);
      ctx.lineTo(px,       py + pd / 2);
      ctx.lineTo(px - pw,  py);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.dark; ctx.lineWidth = 1.2; ctx.stroke();
      // Raised edge
      ctx.fillStyle = c.dark;
      ctx.beginPath();
      ctx.moveTo(px + pw, py);
      ctx.lineTo(px,      py + pd / 2);
      ctx.lineTo(px,      py + pd / 2 + 6);
      ctx.lineTo(px + pw, py + 6);
      ctx.closePath(); ctx.fill();
      // Rivets
      [px - pw * 0.44, px + pw * 0.44].forEach(rx => {
        ctx.fillStyle = c.dark;
        ctx.beginPath(); ctx.arc(rx, py, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.light;
        ctx.beginPath(); ctx.arc(rx - 0.6, py - 0.6, 1.2, 0, Math.PI * 2); ctx.fill();
      });
      break;
    }
    case "gear": {
      const gr = 17;
      for (let i = 0; i < 8; i++) {
        const a   = (i / 8) * Math.PI * 2;
        const tx  = px + Math.cos(a) * (gr + 6);
        const ty  = py + Math.sin(a) * (gr + 6) * 0.5;
        ctx.fillStyle = fc;
        ctx.save(); ctx.translate(tx, ty); ctx.scale(1, 0.5);
        ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = fc;
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.5);
      ctx.beginPath(); ctx.arc(0, 0, gr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c.dark; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = c.dark;
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.5);
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#040c1c";
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.5);
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case "rod": {
      const rw = 34, rh = 8;
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.moveTo(px,       py - rh * 0.5);
      ctx.lineTo(px + rw,  py);
      ctx.lineTo(px,       py + rh * 0.5);
      ctx.lineTo(px - rw,  py);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.dark; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = c.dark;
      ctx.beginPath();
      ctx.moveTo(px + rw, py);
      ctx.lineTo(px,      py + rh * 0.5);
      ctx.lineTo(px,      py + rh * 0.5 + 6);
      ctx.lineTo(px + rw, py + 6);
      ctx.closePath(); ctx.fill();
      [-18, -7, 7, 18].forEach(ox => {
        ctx.fillStyle = c.dark;
        ctx.beginPath(); ctx.ellipse(px + ox * 0.84, py + ox * 0.08, 3, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      });
      break;
    }
    case "bolt": {
      // Heavy bolt — slightly larger
      ctx.fillStyle = fc;
      ctx.save(); ctx.translate(px, py - 5); ctx.scale(1, 0.55);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        if (i === 0) ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
        else ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.dark; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = c.dark;
      ctx.save(); ctx.translate(px, py - 5); ctx.scale(1, 0.55);
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = c.dark; ctx.fillRect(px - 5, py - 2, 10, 11);
      ctx.fillStyle = fc; ctx.fillRect(px - 3.5, py, 7, 8);
      ctx.strokeStyle = c.dark; ctx.lineWidth = 0.9;
      [1, 3, 5, 7].forEach(dy => {
        ctx.beginPath(); ctx.moveTo(px - 3.5, py + dy); ctx.lineTo(px + 3.5, py + dy); ctx.stroke();
      });
      
      break;
    }
    case "ball": {
      // American football — brown prolate spheroid
      const fw = 18, fh = 9;
      ctx.fillStyle = fc;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, 0.55);
      // Body: pointed oval with bezier ends
      ctx.beginPath();
      ctx.moveTo(-fw, 0);
      ctx.bezierCurveTo(-fw * 0.55, -fh, fw * 0.55, -fh, fw, 0);
      ctx.bezierCurveTo(fw * 0.55, fh, -fw * 0.55, fh, -fw, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5; ctx.stroke();
      // White lace seam — horizontal center line
      ctx.strokeStyle = "rgba(255,255,255,0.80)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-fw * 0.48, 0); ctx.lineTo(fw * 0.48, 0);
      ctx.stroke();
      // Lace stitches — short vertical marks crossing the seam
      ctx.lineWidth = 0.9;
      [-8, -3, 3, 8].forEach(lx => {
        ctx.beginPath();
        ctx.moveTo(lx, -fh * 0.48); ctx.lineTo(lx, fh * 0.48);
        ctx.stroke();
      });
      ctx.restore();
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.26)";
      ctx.save();
      ctx.translate(px - 5, py - 3);
      ctx.scale(1, 0.55);
      ctx.beginPath(); ctx.ellipse(0, 0, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case "plant": {
      // Potted plant
      const potW = 11, potH = 13;
      // Pot body
      ctx.fillStyle = "#9e6b45";
      ctx.beginPath();
      ctx.moveTo(px - potW,        py + 2);
      ctx.lineTo(px + potW,        py + 2);
      ctx.lineTo(px + potW * 0.68, py + potH);
      ctx.lineTo(px - potW * 0.68, py + potH);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#5c3a1a"; ctx.lineWidth = 1; ctx.stroke();
      // Pot rim (ellipse top edge)
      ctx.fillStyle = "#b07848";
      ctx.beginPath(); ctx.ellipse(px, py + 2, potW, potW * 0.40, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.strokeStyle = "#5c3a1a"; ctx.lineWidth = 0.8; ctx.stroke();
      // Soil
      ctx.fillStyle = "#3d2b0f";
      ctx.beginPath(); ctx.ellipse(px, py + 2, potW * 0.88, potW * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      // Leaves
      ctx.fillStyle = fc; ctx.strokeStyle = c.dark; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.bezierCurveTo(px - 13, py - 13, px - 19, py - 4, px - 7, py - 1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.bezierCurveTo(px + 13, py - 13, px + 19, py - 4, px + 7, py - 1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py - 17);
      ctx.bezierCurveTo(px - 9, py - 10, px + 9, py - 10, px, py - 4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Stem
      ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px, py + 2); ctx.stroke();
      break;
    }
  }
  ctx.shadowBlur = 0; ctx.shadowColor = "transparent";

  // Red dashed outline for junk pieces wrongly placed in zone
  if (p.isJunk && p.inTarget) {
    ctx.strokeStyle = "rgba(255,55,55,0.88)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.ellipse(px, py, 26, 13, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ── Operator robot (right edge of canvas) ─────────────────────────────────────
function drawOperatorRobot(
  ctx: CanvasRenderingContext2D,
  keys: GameKeys,
  hookZ: number,
  locked: boolean,
) {
  const rx = 985, ry = 415;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(rx, ry + 88, 30, 10, 0, 0, Math.PI * 2); ctx.fill();

  // Feet
  [-13, 13].forEach(ox => {
    ctx.fillStyle = "#152848";
    ctx.beginPath(); ctx.roundRect(rx + ox - 8, ry + 74, 16, 9, 3); ctx.fill();
  });

  // Legs
  [-11, 11].forEach(ox => {
    ctx.fillStyle = "#1e4490";
    ctx.beginPath(); ctx.roundRect(rx + ox - 6, ry + 46, 12, 30, 3); ctx.fill();
    ctx.strokeStyle = "rgba(80,140,200,0.2)"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.roundRect(rx + ox - 6, ry + 46, 12, 30, 3); ctx.stroke();
  });

  // Body
  ctx.fillStyle = "#2870bc";
  ctx.beginPath(); ctx.roundRect(rx - 24, ry + 2, 48, 44, 7); ctx.fill();
  ctx.strokeStyle = "#4898e0"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(rx - 24, ry + 2, 48, 44, 7); ctx.stroke();

  // Chest panel
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.roundRect(rx - 15, ry + 10, 30, 24, 3); ctx.fill();

  // LEDs (match piece colors)
  const ledColors = ["#e07030", "#28bce0", "#d4c240"];
  ledColors.forEach((lc, i) => {
    ctx.fillStyle = lc; ctx.shadowColor = lc; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(rx - 8 + i * 8, ry + 31, 3, 0, Math.PI * 2); ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Arms — angled forward holding controller
  // Left arm
  ctx.fillStyle = "#1a5090";
  ctx.save(); ctx.translate(rx - 24, ry + 16);
  ctx.rotate(-0.5);
  ctx.beginPath(); ctx.roundRect(-9, -6, 10, 38, 3); ctx.fill();
  ctx.restore();
  // Right arm
  ctx.save(); ctx.translate(rx + 24, ry + 16);
  ctx.rotate(0.5);
  ctx.beginPath(); ctx.roundRect(-1, -6, 10, 38, 3); ctx.fill();
  ctx.restore();

  // Neck
  ctx.fillStyle = "#122240";
  ctx.beginPath(); ctx.roundRect(rx - 7, ry - 8, 14, 12, 2); ctx.fill();

  // Head
  ctx.fillStyle = "#163c80";
  ctx.beginPath(); ctx.roundRect(rx - 22, ry - 40, 44, 32, 7); ctx.fill();
  ctx.strokeStyle = "#2e64c0"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(rx - 22, ry - 40, 44, 32, 7); ctx.stroke();

  // Eyes
  [-8, 8].forEach(ox => {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.ellipse(rx + ox, ry - 26, 5.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#88d8ff"; ctx.shadowColor = "#88d8ff"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(rx + ox, ry - 27, 3, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Antenna
  ctx.strokeStyle = "#2565b8"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(rx + 6, ry - 40); ctx.lineTo(rx + 6, ry - 53); ctx.stroke();
  ctx.fillStyle = "#66ccff"; ctx.shadowColor = "#66ccff";
  ctx.shadowBlur = Object.values(keys).some(v => v) ? 8 : 3;
  ctx.beginPath(); ctx.arc(rx + 6, ry - 55, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // ── Controller ────────────────────────────────────────────────
  const cx = rx, cy = ry + 60;
  ctx.fillStyle = "#08102a";
  ctx.beginPath(); ctx.roundRect(cx - 28, cy - 9, 56, 24, 6); ctx.fill();
  ctx.strokeStyle = "rgba(80,160,255,0.55)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(cx - 28, cy - 9, 56, 24, 6); ctx.stroke();

  // Grips (bottom)
  [-1, 1].forEach(s => {
    ctx.fillStyle = "#06101e";
    ctx.beginPath(); ctx.roundRect(cx + s * 18 - 6, cy + 12, 12, 12, 3); ctx.fill();
  });

  // D-pad (left side of controller)
  ctx.fillStyle = "#1a2e54";
  ctx.beginPath(); ctx.roundRect(cx - 26, cy - 3, 13, 5, 1); ctx.fill(); // H
  ctx.beginPath(); ctx.roundRect(cx - 21, cy - 7, 5, 13, 1); ctx.fill(); // V

  // Active arrow highlights
  if (keys.left)  { ctx.fillStyle = "#60a8ff"; ctx.fillRect(cx - 26, cy - 1.5, 5, 2); }
  if (keys.right) { ctx.fillStyle = "#60a8ff"; ctx.fillRect(cx - 14, cy - 1.5, 5, 2); }
  if (keys.up)    { ctx.fillStyle = "#60a8ff"; ctx.fillRect(cx - 22.5, cy - 7, 2, 5); }
  if (keys.down)  { ctx.fillStyle = "#60a8ff"; ctx.fillRect(cx - 22.5, cy + 2, 2, 5); }

  // Hook-height stick (analog-style, right side, shows hookZ)
  const stickX = cx + 12, stickY = cy + 1;
  ctx.fillStyle = "#0e1c38";
  ctx.beginPath(); ctx.ellipse(stickX, stickY, 9, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(80,140,200,0.35)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(stickX, stickY, 9, 9, 0, 0, Math.PI * 2); ctx.stroke();
  const knobDY = (0.5 - hookZ / HOOK_MAX) * 7; // up = W keys, down = S
  ctx.fillStyle = keys.w || keys.s ? "#60c8ff" : "#3868a0";
  ctx.beginPath(); ctx.ellipse(stickX, stickY + knobDY, 5, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Colored buttons (A=orange, B=cyan, X=yellow, Y=purple matching piece colors)
  const btnDefs: [number, number, string][] = [
    [cx + 14, cy - 2, "#e07030"],
    [cx + 9,  cy - 6, "#28bce0"],
    [cx + 19, cy - 6, "#d4c240"],
    [cx + 14, cy - 10, "#b060e0"],
  ];
  btnDefs.forEach(([bx, by, bc]) => {
    ctx.fillStyle = bc; ctx.shadowColor = bc; ctx.shadowBlur = 3;
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
  });
  ctx.shadowBlur = 0;

  // F button (active when locked)
  ctx.fillStyle = locked ? "#4ade80" : "#1e3050";
  if (locked) { ctx.shadowColor = "#4ade80"; ctx.shadowBlur = 8; }
  ctx.beginPath(); ctx.roundRect(cx - 5, cy - 8, 8, 7, 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = locked ? "#001a08" : "#4a7aaa";
  ctx.font = "bold 5px 'JetBrains Mono', monospace";
  ctx.textAlign = "center"; ctx.fillText("F", cx - 1, cy - 3); ctx.textAlign = "left";

  // Central LED
  const anyActive = Object.values(keys).some(v => v);
  ctx.fillStyle = anyActive ? "#4ade80" : "rgba(50,100,60,0.35)";
  if (anyActive) { ctx.shadowColor = "#4ade80"; ctx.shadowBlur = 10; }
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // OPERATOR label
  ctx.fillStyle = "rgba(80,150,255,0.50)";
  ctx.font = "7.5px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("OPERATOR", rx, ry - 58);
  ctx.fillText("EINHEIT", rx, ry - 48);
  ctx.textAlign = "left";

  // Wire from operator to grid (thin rope visual)
  const wireEndX = isoX(GRID_C, GRID_R / 2);
  const wireEndY = isoY(GRID_C, GRID_R / 2, RAIL_Z * 0.6);
  ctx.strokeStyle = "rgba(60,100,200,0.14)"; ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(rx - 28, cy); ctx.quadraticCurveTo((rx + wireEndX) / 2, cy - 30, wireEndX, wireEndY);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ── HUD key guide ─────────────────────────────────────────────────────────────
interface GameKeys {
  left: boolean; right: boolean; up: boolean; down: boolean;
  w: boolean; s: boolean; a: boolean; d: boolean;
  space: boolean; f: boolean;
}

function drawHUD(ctx: CanvasRenderingContext2D, keys: GameKeys, hookZ: number, grabReady: boolean) {
  const MONO = "'JetBrains Mono', monospace";
  const groups = [
    { k: "← →",  label: "Ost / West",     on: keys.left  || keys.right },
    { k: "↑ ↓",  label: "Nord / Süd",     on: keys.up    || keys.down  },
    { k: "A D",  label: "Feinjust. O/W",  on: keys.a     || keys.d     },
    { k: "W",    label: "Arm hoch",        on: keys.w     },
    { k: "S",    label: "Arm runter",      on: keys.s     },
    { k: "SPC",  label: grabReady ? "GREIFEN" : "nur am Boden", on: keys.space },
    { k: "F",    label: "Arm fixieren",   on: keys.f     },
  ];
  groups.forEach((g, i) => {
    ctx.fillStyle = g.on ? "rgba(165,220,255,0.92)" : "rgba(65,105,175,0.48)";
    ctx.font = `${g.on ? "bold " : ""}8px ${MONO}`;
    ctx.fillText(`${g.k}  ${g.label}`, 8, ARENA_H - 8 - (groups.length - 1 - i) * 13);
  });

  // hookZ readout
  const hookPct = Math.round((hookZ / HOOK_MAX) * 100);
  ctx.fillStyle = hookZ < GRAB_Z ? "#4ade80" : "rgba(80,160,255,0.65)";
  ctx.font = `bold 8px ${MONO}`;
  ctx.textAlign = "right";
  ctx.fillText(`ARM ${hookPct.toString().padStart(3)}%  ${hookZ < GRAB_Z ? "▼ BEREIT" : "▲ ANGEHOBEN"}`, ARENA_W - 10, ARENA_H - 8);
  ctx.textAlign = "left";
}

// ── Main game component ────────────────────────────────────────────────────────
type GamePhase = "playing" | "fail" | "heavyFail" | "success";

interface ScrapSorterGameProps { onComplete: () => void; }

export default function ScrapSorterGame({ onComplete }: ScrapSorterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sortedCount, setSortedCount] = useState(0);
  const [phase, setPhase]             = useState<GamePhase>("playing");

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const stateRef = useRef({
    craneCol: 2.5, craneRow: 1.0,
    craneVCol: 0,  craneVRow: 0,
    hookZ:  0.02,    // starts near floor
    phase: "playing" as GamePhase,
    grabbedId:    null as number | null,
    pieces:       MAKE_PIECES(),
    keys: {
      left: false, right: false, up: false, down: false,
      w: false, s: false, a: false, d: false,
      space: false, f: false,
    } as GameKeys,
    spaceWasDown:     false,
    spaceJustPressed: false,
    fJustPressed:     false,
    fWasDown:         false,
    locked:       false,
    heavyWarning: false,
    heavyHoldTime: 0,
    sortedCount:  0,
    lastTime:     0,
    flashTimer:   0,
    failTimer:    0,
    wrongSortTimer: 0,
    wrongSortMsg:   "",
  });

  // ── Draw ─────────────────────────────────────────────────────────────────────
  const drawScene = useCallback((
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
  ) => {
    const W = ARENA_W, H = ARENA_H;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#060d1e"); bg.addColorStop(1, "#030810");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Back walls (iso side faces for depth feel)
    ctx.fillStyle = "rgba(6,16,50,0.40)";
    ctx.beginPath();
    ctx.moveTo(isoX(0,      0), isoY(0,      0, 0));
    ctx.lineTo(isoX(0,      0), isoY(0,      0, RAIL_Z + 0.5));
    ctx.lineTo(isoX(GRID_C, 0), isoY(GRID_C, 0, RAIL_Z + 0.5));
    ctx.lineTo(isoX(GRID_C, 0), isoY(GRID_C, 0, 0));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,60,180,0.10)"; ctx.lineWidth = 0.6; ctx.stroke();

    ctx.fillStyle = "rgba(4,12,40,0.32)";
    ctx.beginPath();
    ctx.moveTo(isoX(0, 0),      isoY(0, 0,      0));
    ctx.lineTo(isoX(0, 0),      isoY(0, 0,      RAIL_Z + 0.5));
    ctx.lineTo(isoX(0, GRID_R), isoY(0, GRID_R, RAIL_Z + 0.5));
    ctx.lineTo(isoX(0, GRID_R), isoY(0, GRID_R, 0));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,60,180,0.08)"; ctx.lineWidth = 0.6; ctx.stroke();

    // Floor
    drawFloor(ctx, s.sortedCount);

    // Pieces on floor (depth sorted, non-grabbed)
    const ds = [...s.pieces]
      .filter(p => !p.grabbed)
      .sort((a, b) => (a.col + a.row) - (b.col + b.row));
    for (const p of ds) drawPieceIso(ctx, p, 0);

    // Flash overlay
    if (s.flashTimer > 0) {
      const lx = isoX((TGT_C1 + TGT_C2) / 2, (TGT_R1 + TGT_R2) / 2);
      const ly = isoY((TGT_C1 + TGT_C2) / 2, (TGT_R1 + TGT_R2) / 2);
      ctx.fillStyle = `rgba(50,220,90,${s.flashTimer * 0.18})`;
      ctx.beginPath(); ctx.arc(lx, ly, 80, 0, Math.PI * 2); ctx.fill();
    }

    // Wrong-sort toast (junk placed in zone)
    if (s.wrongSortTimer > 0) {
      const alpha = Math.min(1, s.wrongSortTimer * 1.5);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(160,10,10,0.88)";
      ctx.beginPath(); ctx.roundRect(W / 2 - 230, 28, 460, 42, 6); ctx.fill();
      ctx.strokeStyle = "rgba(255,80,80,0.70)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(W / 2 - 230, 28, 460, 42, 6); ctx.stroke();
      ctx.fillStyle = "#ff8888"; ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.wrongSortMsg, W / 2, 49);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.globalAlpha = 1;
    }

    // Rails
    drawRails(ctx, s.craneCol, s.craneRow);

    // Grabbed piece (follows crane at hookZ height)
    const held = s.pieces.find(p => p.grabbed);
    if (held) {
      const tempCol = held.col; const tempRow = held.row;
      held.col = s.craneCol; held.row = s.craneRow;
      drawPieceIso(ctx, held, s.hookZ);
      held.col = tempCol; held.row = tempRow;
    }

    // Crane robot
    drawCraneBot(ctx, s.craneCol, s.craneRow, s.grabbedId !== null,
      s.hookZ, s.locked, s.heavyWarning, s.heavyHoldTime);

    // Operator robot
    drawOperatorRobot(ctx, s.keys, s.hookZ, s.locked);

    // HUD
    const grabReady = s.hookZ < GRAB_Z;
    drawHUD(ctx, s.keys, s.hookZ, grabReady);

    // ── FAIL overlay ───────────────────────────────────────────
    if (s.phase === "fail") {
      const alpha = Math.min(0.72, (3.0 - s.failTimer) / 3.0 * 0.72);
      ctx.fillStyle = `rgba(110,10,10,${alpha})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = Math.min(1, (3.0 - s.failTimer) / 0.3);
      ctx.fillStyle = "#ff5555"; ctx.font = "bold 17px 'JetBrains Mono', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("TEIL FALLENGELASSEN!", W / 2, H / 2 - 18);
      ctx.fillStyle = "rgba(255,170,170,0.88)"; ctx.font = "11.5px 'JetBrains Mono', monospace";
      ctx.fillText("Teile nicht fallen lassen, wir brauchen die noch!", W / 2, H / 2 + 10);
      ctx.fillStyle = "rgba(200,100,100,0.6)"; ctx.font = "9.5px 'JetBrains Mono', monospace";
      ctx.fillText(`Neustart in ${Math.ceil(s.failTimer)} s …`, W / 2, H / 2 + 28);
      ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    }

    // ── HEAVY FAIL overlay ─────────────────────────────────────
    if (s.phase === "heavyFail") {
      const alpha = Math.min(0.80, (3.5 - s.failTimer) / 3.5 * 0.80);
      ctx.fillStyle = `rgba(80,0,100,${alpha})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = Math.min(1, (3.5 - s.failTimer) / 0.3);
      ctx.fillStyle = "#d880ff"; ctx.font = "bold 17px 'JetBrains Mono', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("WUMMS!", W / 2, H / 2 - 28);
      ctx.fillStyle = "#e8a0ff"; ctx.font = "12.5px 'JetBrains Mono', monospace";
      ctx.fillText("Oh, das Teil war wohl zu schwer", W / 2, H / 2 - 5);
      ctx.fillStyle = "rgba(200,160,220,0.75)"; ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillText("Fixierung (F) vergessen!", W / 2, H / 2 + 15);
      ctx.fillStyle = "rgba(180,120,200,0.55)"; ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText(`Neustart in ${Math.ceil(s.failTimer)} s …`, W / 2, H / 2 + 33);
      ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    }

    // ── SUCCESS overlay ────────────────────────────────────────
    if (s.phase === "success") {
      ctx.fillStyle = "rgba(4,28,12,0.80)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#4ade80"; ctx.font = "bold 18px 'JetBrains Mono', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("SORTIERUNG ABGESCHLOSSEN", W / 2, H / 2);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    }
  }, []);

  // ── Game loop ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let rafId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(e.key)) e.preventDefault();
      const k = stateRef.current;
      const ks = k.keys;
      if (e.key === "ArrowLeft")  ks.left  = true;
      if (e.key === "ArrowRight") ks.right = true;
      if (e.key === "ArrowUp")    ks.up    = true;
      if (e.key === "ArrowDown")  ks.down  = true;
      if (e.key === "a" || e.key === "A") ks.a = true;
      if (e.key === "d" || e.key === "D") ks.d = true;
      if (e.key === "w" || e.key === "W") ks.w = true;
      if (e.key === "s" || e.key === "S") ks.s = true;
      if (e.key === " ") {
        if (!k.spaceWasDown) k.spaceJustPressed = true;
        k.spaceWasDown = true; ks.space = true;
      }
      if (e.key === "f" || e.key === "F") {
        if (!k.fWasDown) k.fJustPressed = true;
        k.fWasDown = true; ks.f = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const ks = stateRef.current.keys;
      if (e.key === "ArrowLeft")  ks.left  = false;
      if (e.key === "ArrowRight") ks.right = false;
      if (e.key === "ArrowUp")    ks.up    = false;
      if (e.key === "ArrowDown")  ks.down  = false;
      if (e.key === "a" || e.key === "A") ks.a = false;
      if (e.key === "d" || e.key === "D") ks.d = false;
      if (e.key === "w" || e.key === "W") ks.w = false;
      if (e.key === "s" || e.key === "S") ks.s = false;
      if (e.key === " ") { ks.space = false; stateRef.current.spaceWasDown = false; }
      if (e.key === "f" || e.key === "F") { ks.f = false; stateRef.current.fWasDown = false; }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup",   handleKeyUp);

    function tick(now: number) {
      const s  = stateRef.current;
      const dt = s.lastTime > 0 ? Math.min((now - s.lastTime) / 1000, 0.05) : 0.016;
      s.lastTime = now;

      // ── Fail cooldowns ─────────────────────────────────────────
      if (s.phase === "fail" || s.phase === "heavyFail") {
        s.failTimer -= dt;
        if (s.failTimer <= 0) {
          s.pieces      = MAKE_PIECES();
          s.grabbedId   = null;
          s.sortedCount = 0;
          s.locked      = false;
          s.heavyWarning = false;
          s.heavyHoldTime = 0;
          s.wrongSortTimer = 0;
          s.wrongSortMsg   = "";
          setSortedCount(0);
          s.phase = "playing";
          setPhase("playing");
        }
        drawScene(ctx!, s);
        rafId = requestAnimationFrame(tick); return;
      }

      if (s.phase !== "playing") {
        drawScene(ctx!, s); rafId = requestAnimationFrame(tick); return;
      }

      // Flash decay
      if (s.flashTimer > 0) s.flashTimer = Math.max(0, s.flashTimer - dt * 2.5);
      // Wrong-sort toast decay
      if (s.wrongSortTimer > 0) s.wrongSortTimer = Math.max(0, s.wrongSortTimer - dt);

      // ── Crane horizontal movement ──────────────────────────────
      const coarseCol = s.keys.right ? CRANE_COARSE : s.keys.left ? -CRANE_COARSE : 0;
      const coarseRow = s.keys.down  ? CRANE_COARSE : s.keys.up   ? -CRANE_COARSE : 0;
      const fineCol   = s.keys.d     ? CRANE_FINE   : s.keys.a    ? -CRANE_FINE   : 0;
      const fineRow   = 0; // A/D is only col  (row fine via arrow speed already)

      const tVCol = coarseCol + fineCol;
      const tVRow = coarseRow + fineRow;
      s.craneVCol += (tVCol - s.craneVCol) * Math.min(1, dt * CRANE_ACCEL);
      s.craneVRow += (tVRow - s.craneVRow) * Math.min(1, dt * CRANE_ACCEL);
      s.craneCol = Math.max(CRANE_C_MIN, Math.min(CRANE_C_MAX, s.craneCol + s.craneVCol * dt));
      s.craneRow = Math.max(CRANE_R_MIN, Math.min(CRANE_R_MAX, s.craneRow + s.craneVRow * dt));

      // ── Hook height (W/S) ──────────────────────────────────────
      if (s.keys.w) s.hookZ = Math.min(HOOK_MAX, s.hookZ + HOOK_SPEED * dt);
      if (s.keys.s) s.hookZ = Math.max(0, s.hookZ - HOOK_SPEED * dt);

      // 2-second timer for 4th piece without lock
      if (s.grabbedId === HEAVY_ID && !s.locked) {
        s.heavyHoldTime += dt;
        s.heavyWarning = true;

        if (s.heavyHoldTime >= HEAVY_FAIL_TIME) {
          // Time up — arm crashes
          const p = s.pieces.find(q => q.id === s.grabbedId)!;
          p.grabbed = false;
          s.grabbedId = null;
          s.heavyHoldTime = 0;
          s.phase    = "heavyFail";
          s.failTimer = 3.5;
          setPhase("heavyFail");
        }
      }

      // F key → lock for heavy piece
      if (s.fJustPressed) {
        s.fJustPressed = false;
        if (s.grabbedId === HEAVY_ID && !s.locked) {
          s.locked       = true;
          s.heavyWarning = false;
          s.heavyHoldTime = 0;
        }
      }

      // ── Space: grab or release (only near floor) ───────────────
      if (s.spaceJustPressed) {
        s.spaceJustPressed = false;

        if (s.hookZ < GRAB_Z) {
          if (s.grabbedId === null) {
            // Try to grab nearest free piece
            // Junk pieces can be grabbed from zone too (to remove them)
            let best: Piece | null = null;
            let bestDist = Infinity;
            for (const p of s.pieces) {
              if (p.grabbed) continue;
              if (p.inTarget && !p.isJunk) continue;
              const dc = s.craneCol - p.col;
              const dr = s.craneRow - p.row;
              const dist = Math.sqrt(dc * dc + dr * dr);
              if (dist < 0.44 && dist < bestDist) { bestDist = dist; best = p; }
            }
            if (best) {
              if (best.inTarget) best.inTarget = false; // remove junk from zone on pickup
              best.grabbed  = true;
              s.grabbedId   = best.id;
              s.locked      = false;
              s.heavyHoldTime = 0;
              s.heavyWarning = best.id === HEAVY_ID;
            }
          } else {
            // Release
            const p     = s.pieces.find(q => q.id === s.grabbedId)!;
            const wasHeavy = p.id === HEAVY_ID;
            p.grabbed   = false;
            s.grabbedId = null;
            s.locked    = false;
            s.heavyWarning = false;
            s.heavyHoldTime = 0;
            void wasHeavy;

            const inZone = s.craneCol >= TGT_C1 && s.craneCol <= TGT_C2
                        && s.craneRow >= TGT_R1 && s.craneRow <= TGT_R2;

            if (p.isJunk) {
              // Junk objects: dropping anywhere is OK — no fail triggered
              if (inZone) {
                // Placed in zone: show error toast, mark with red outline
                p.inTarget = true;
                p.col = p.pileCol; p.row = p.pileRow;
                const name = p.type === "ball" ? "Football" : "Topfpflanze";
                s.wrongSortTimer = 3.2;
                s.wrongSortMsg   = `Wir brauchen kein ${name}!`;
              } else {
                // Dropped outside zone: just leave at current crane position
                p.col = s.craneCol; p.row = s.craneRow;
                // If all 4 scrap are sorted and no junk is in zone → success
                if (s.sortedCount >= 4 && !s.pieces.some(q => q.isJunk && q.inTarget)) {
                  s.phase = "success";
                  setPhase("success");
                  setTimeout(() => onCompleteRef.current(), 1600);
                }
              }
            } else if (inZone) {
              p.inTarget = true;
              p.col = p.pileCol; p.row = p.pileRow;
              s.sortedCount += 1;
              s.flashTimer   = 1.2;
              setSortedCount(s.sortedCount);
              if (s.sortedCount >= 4 && !s.pieces.some(q => q.isJunk && q.inTarget)) {
                s.phase = "success";
                setPhase("success");
                setTimeout(() => onCompleteRef.current(), 1600);
              }
            } else {
              // Scrap dropped outside zone → fail / restart
              p.col = s.craneCol; p.row = s.craneRow;
              s.phase    = "fail";
              s.failTimer = 3.0;
              setPhase("fail");
            }
          }
        }
        // If hookZ >= GRAB_Z: Space press ignored near-silently (floor indicator shows)
      }

      drawScene(ctx!, s);
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup",   handleKeyUp);
    };
  }, [drawScene]);

  const MONO = "'JetBrains Mono', monospace";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Touch helpers — directly manipulate stateRef so game loop picks up changes without re-renders
  const tk = (key: keyof GameKeys, down: boolean) => {
    stateRef.current.keys[key] = down;
  };
  const touchSpace = (down: boolean) => {
    const s = stateRef.current;
    if (down) {
      if (!s.spaceWasDown) s.spaceJustPressed = true;
      s.spaceWasDown = true;
      s.keys.space = true;
    } else {
      s.keys.space = false;
      s.spaceWasDown = false;
    }
  };
  const touchF = (down: boolean) => {
    const s = stateRef.current;
    if (down) {
      if (!s.fWasDown) s.fJustPressed = true;
      s.fWasDown = true;
      s.keys.f = true;
    } else {
      s.keys.f = false;
      s.fWasDown = false;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{
        position: "relative",
        borderRadius: "8px 8px 0 0",
        overflow: "hidden",
        border: "1px solid rgba(0,140,255,0.22)",
        borderBottom: "none",
      }}>
        <canvas ref={canvasRef} width={ARENA_W} height={ARENA_H} style={{ display: "block", width: "100%", height: "auto" }} />
        {/* Sorted counter */}
        <div style={{
          position: "absolute", top: 10, right: 12,
          display: "flex", gap: 5, alignItems: "center",
        }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: "50%",
              background: i < sortedCount ? "#4ade80" : "rgba(0,140,255,0.10)",
              border: `1px solid ${i < sortedCount ? "rgba(80,220,120,0.7)" : "rgba(0,140,255,0.28)"}`,
              boxShadow: i < sortedCount ? "0 0 9px rgba(80,220,120,0.55)" : "none",
              transition: "all 0.3s ease",
            }} />
          ))}
          <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "rgba(0,150,255,0.55)", marginLeft: 3 }}>
            {sortedCount}/4
          </span>
        </div>
        {/* Phase badge */}
        {phase === "fail" && (
          <div style={{
            position: "absolute", top: 10, left: "50%",
            transform: "translateX(-50%)",
            fontFamily: MONO, fontSize: "0.65rem",
            color: "#ff6060", background: "rgba(80,0,0,0.7)",
            border: "1px solid rgba(200,50,50,0.5)",
            borderRadius: 6, padding: "3px 10px",
          }}>⚠ TEIL VERLOREN</div>
        )}
        {phase === "heavyFail" && (
          <div style={{
            position: "absolute", top: 10, left: "50%",
            transform: "translateX(-50%)",
            fontFamily: MONO, fontSize: "0.65rem",
            color: "#d880ff", background: "rgba(60,0,80,0.75)",
            border: "1px solid rgba(140,50,200,0.5)",
            borderRadius: 6, padding: "3px 10px",
          }}>⚠ ZU SCHWER – F VERGESSEN</div>
        )}
      </div>

      {/* Controls bar */}
      <div style={{
        background: "rgba(4,10,24,0.97)",
        border: "1px solid rgba(0,140,255,0.22)",
        borderRadius: isMobile ? 0 : "0 0 8px 8px",
        padding: "10px 18px",
        display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap",
      }}>
        {/* Grobfahrt */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "rgba(80,130,200,0.5)", marginBottom: 5, letterSpacing: "0.1em" }}>
            GROBFAHRT
          </div>
          {[{ key: "← →", desc: "Ost / West" }, { key: "↑ ↓", desc: "Nord / Süd" }].map(({ key, desc }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: "0.66rem", color: "rgba(155,215,255,0.85)", background: "rgba(0,80,180,0.2)", border: "1px solid rgba(0,130,255,0.30)", borderRadius: 4, padding: "1px 5px" }}>{key}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.56rem", color: "rgba(90,140,210,0.6)" }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Arm */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "rgba(80,130,200,0.5)", marginBottom: 5, letterSpacing: "0.1em" }}>
            ARM-HÖHE
          </div>
          {[{ key: "W", desc: "Hoch" }, { key: "S", desc: "Runter" }].map(({ key, desc }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: "0.66rem", color: "rgba(155,215,255,0.85)", background: "rgba(0,80,180,0.2)", border: "1px solid rgba(0,130,255,0.30)", borderRadius: 4, padding: "1px 5px" }}>{key}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.56rem", color: "rgba(90,140,210,0.6)" }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Feinjust */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "rgba(80,130,200,0.5)", marginBottom: 5, letterSpacing: "0.1em" }}>
            FEINJUST.
          </div>
          {[{ key: "A D", desc: "Ost / West" }].map(({ key, desc }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: "0.66rem", color: "rgba(175,200,255,0.75)", background: "rgba(40,60,160,0.18)", border: "1px solid rgba(60,100,220,0.26)", borderRadius: 4, padding: "1px 5px" }}>{key}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.56rem", color: "rgba(90,140,210,0.6)" }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Grab + Lock */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "rgba(80,130,200,0.5)", marginBottom: 5, letterSpacing: "0.1em" }}>
            AKTION
          </div>
          {[
            { key: "SPC", desc: "Greifen/Ablegen (nur am Boden)", col: "rgba(255,220,80,0.9)", bg: "rgba(120,80,0,0.2)", border: "rgba(200,150,0,0.32)" },
            { key: "F",   desc: "Arm fixieren (4. Teil!)",       col: "rgba(180,100,255,0.9)", bg: "rgba(80,0,140,0.18)", border: "rgba(140,60,220,0.30)" },
          ].map(({ key, desc, col, bg, border }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: "0.66rem", color: col, background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: "1px 5px" }}>{key}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.56rem", color: "rgba(90,140,210,0.6)" }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Status */}
        <div style={{ marginLeft: "auto", paddingTop: 14 }}>
          <span style={{
            fontFamily: MONO, fontSize: "0.62rem",
            color: phase === "fail"      ? "#ff6060"
                 : phase === "heavyFail" ? "#d880ff"
                 : phase === "success"   ? "#4ade80"
                 : sortedCount > 0       ? "rgba(80,210,120,0.75)"
                 :                         "rgba(70,120,200,0.5)",
          }}>
            {phase === "fail"      ? "⚠ TEIL VERLOREN – Neustart"
           : phase === "heavyFail" ? "⚠ ZU SCHWER – F vergessen!"
           : phase === "success"   ? "✓ ABGESCHLOSSEN"
           : sortedCount > 0       ? `${sortedCount}/4 Teile sortiert`
           :                         "Arm absenken → Greifen → Sortierzone"}
          </span>
        </div>
      </div>

      {/* ── Mobile touch controls — hidden on desktop ────────────────── */}
      {isMobile && (
        <div style={{
          background: "rgba(4,10,24,0.97)",
          border: "1px solid rgba(0,140,255,0.22)",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          padding: "10px 10px 14px",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
        }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.48rem",
            color: "rgba(80,130,200,0.45)", textAlign: "center",
            letterSpacing: "0.1em", marginBottom: 9,
          }}>
            TOUCH-STEUERUNG
          </div>

          {/* Two clusters: D-pad left, WASD+Actions right */}
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", gap: 6 }}>

            {/* ── Left: D-pad (arrow keys / coarse movement) ── */}
            <div>
              <div style={{
                fontFamily: MONO, fontSize: "0.42rem",
                color: "rgba(80,130,200,0.4)", textAlign: "center",
                letterSpacing: "0.08em", marginBottom: 5,
              }}>FAHRT</div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 52px)",
                gridTemplateRows: "repeat(3, 52px)",
                gap: 3,
              }}>
                {/* Row 1 */}
                <div />
                <div
                  onPointerDown={(e) => { e.preventDefault(); tk("up", true); }}
                  onPointerUp={() => tk("up", false)}
                  onPointerLeave={() => tk("up", false)}
                  onPointerCancel={() => tk("up", false)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(6,16,42,0.95)", border: "1px solid rgba(0,110,255,0.35)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    fontSize: "1.3rem", color: "rgba(140,200,255,0.9)",
                  }}
                >↑</div>
                <div />
                {/* Row 2 */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); tk("left", true); }}
                  onPointerUp={() => tk("left", false)}
                  onPointerLeave={() => tk("left", false)}
                  onPointerCancel={() => tk("left", false)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(6,16,42,0.95)", border: "1px solid rgba(0,110,255,0.35)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    fontSize: "1.3rem", color: "rgba(140,200,255,0.9)",
                  }}
                >←</div>
                <div style={{
                  background: "rgba(0,50,130,0.18)", borderRadius: 8,
                  border: "1px solid rgba(0,70,180,0.15)",
                }} />
                <div
                  onPointerDown={(e) => { e.preventDefault(); tk("right", true); }}
                  onPointerUp={() => tk("right", false)}
                  onPointerLeave={() => tk("right", false)}
                  onPointerCancel={() => tk("right", false)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(6,16,42,0.95)", border: "1px solid rgba(0,110,255,0.35)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    fontSize: "1.3rem", color: "rgba(140,200,255,0.9)",
                  }}
                >→</div>
                {/* Row 3 */}
                <div />
                <div
                  onPointerDown={(e) => { e.preventDefault(); tk("down", true); }}
                  onPointerUp={() => tk("down", false)}
                  onPointerLeave={() => tk("down", false)}
                  onPointerCancel={() => tk("down", false)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(6,16,42,0.95)", border: "1px solid rgba(0,110,255,0.35)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    fontSize: "1.3rem", color: "rgba(140,200,255,0.9)",
                  }}
                >↓</div>
                <div />
              </div>
            </div>

            {/* ── Right: Hook height (W/S), fine adjust (A/D), F, Space ── */}
            <div>
              <div style={{
                fontFamily: MONO, fontSize: "0.42rem",
                color: "rgba(80,130,200,0.4)", textAlign: "center",
                letterSpacing: "0.08em", marginBottom: 5,
              }}>HAKEN &amp; AKTION</div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 52px)",
                gridTemplateRows: "repeat(2, 52px)",
                gap: 3,
              }}>
                {/* Row 1: W | F | SPC */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); tk("w", true); }}
                  onPointerUp={() => tk("w", false)}
                  onPointerLeave={() => tk("w", false)}
                  onPointerCancel={() => tk("w", false)}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(6,16,42,0.95)", border: "1px solid rgba(0,110,255,0.35)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    color: "rgba(140,200,255,0.9)", gap: 2,
                  }}
                >
                  <span style={{ fontSize: "1.0rem" }}>▲</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.52rem", color: "rgba(100,170,255,0.65)" }}>ARM</span>
                </div>
                <div
                  onPointerDown={(e) => { e.preventDefault(); touchF(true); }}
                  onPointerUp={() => touchF(false)}
                  onPointerLeave={() => touchF(false)}
                  onPointerCancel={() => touchF(false)}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(30,8,60,0.95)", border: "1px solid rgba(140,60,220,0.40)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    color: "rgba(190,120,255,0.95)", gap: 2,
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: "0.9rem", fontWeight: 700 }}>F</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.42rem", color: "rgba(160,100,240,0.65)" }}>LOCK</span>
                </div>
                <div
                  onPointerDown={(e) => { e.preventDefault(); touchSpace(true); }}
                  onPointerUp={() => touchSpace(false)}
                  onPointerLeave={() => touchSpace(false)}
                  onPointerCancel={() => touchSpace(false)}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(40,28,0,0.95)", border: "1px solid rgba(200,150,0,0.40)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    color: "rgba(240,200,60,0.95)", gap: 2,
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>●</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.42rem", color: "rgba(210,170,50,0.65)" }}>GRAB</span>
                </div>
                {/* Row 2: A | S | D */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); tk("a", true); }}
                  onPointerUp={() => tk("a", false)}
                  onPointerLeave={() => tk("a", false)}
                  onPointerCancel={() => tk("a", false)}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(6,16,42,0.95)", border: "1px solid rgba(0,90,200,0.28)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    color: "rgba(120,175,255,0.75)", gap: 1,
                  }}
                >
                  <span style={{ fontSize: "0.9rem" }}>◀</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.42rem", color: "rgba(90,140,210,0.55)" }}>FEIN</span>
                </div>
                <div
                  onPointerDown={(e) => { e.preventDefault(); tk("s", true); }}
                  onPointerUp={() => tk("s", false)}
                  onPointerLeave={() => tk("s", false)}
                  onPointerCancel={() => tk("s", false)}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(6,16,42,0.95)", border: "1px solid rgba(0,110,255,0.35)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    color: "rgba(140,200,255,0.9)", gap: 2,
                  }}
                >
                  <span style={{ fontSize: "1.0rem" }}>▼</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.52rem", color: "rgba(100,170,255,0.65)" }}>ARM</span>
                </div>
                <div
                  onPointerDown={(e) => { e.preventDefault(); tk("d", true); }}
                  onPointerUp={() => tk("d", false)}
                  onPointerLeave={() => tk("d", false)}
                  onPointerCancel={() => tk("d", false)}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(6,16,42,0.95)", border: "1px solid rgba(0,90,200,0.28)",
                    borderRadius: 8, cursor: "pointer", touchAction: "none",
                    color: "rgba(120,175,255,0.75)", gap: 1,
                  }}
                >
                  <span style={{ fontSize: "0.9rem" }}>▶</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.42rem", color: "rgba(90,140,210,0.55)" }}>FEIN</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
