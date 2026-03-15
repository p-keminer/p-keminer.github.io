/**
 * Flugbahn-Kalibrierung — Physics engine
 *
 * 4 parameters and their effects:
 *   drehzahl      → raw launch speed (more RPM = more velocity)
 *   loslasspunkt  → release-angle efficiency (peaks at 45°, falls off toward extremes)
 *   wurfmasse     → air drag + slight gravity factor (lighter = shorter range, heavier = straighter)
 *   winkel        → launch elevation angle (controls arc shape and range)
 */

export interface PhysicsParams {
  drehzahl: number;      // 1.0 – 10.0  (rotation speed → launch velocity)
  loslasspunkt: number;  // 10 – 90 °   (catapult release point efficiency)
  wurfmasse: number;     // 0.5 – 5.0 kg (mass → air drag, minor gravity effect)
  winkel: number;        // 10 – 80 °   (launch elevation angle)
}

export interface TPoint {
  x: number;
  y: number;
  t: number; // elapsed time in seconds
}

// ── Canvas constants ──────────────────────────────────────────────────────────
export const ARENA_W = 700;
export const ARENA_H = 310;
export const GROUND_Y = 278;        // y-coordinate of ground line in canvas
export const LAUNCHER_X = 62;
export const LAUNCHER_Y = 234;      // actual projectile launch point (top of catapult arm)
export const BOT_RADIUS = 28;       // hit detection radius (generous for game feel)
export const BOT_MIN_X = 165;
export const BOT_MAX_X = 640;

/**
 * Effective launch speed from drehzahl + loslasspunkt.
 * Release-point efficiency uses sin(2θ) which peaks at θ=45°.
 */
export function computeV0(params: PhysicsParams): number {
  const { drehzahl, loslasspunkt } = params;
  const v0Raw = drehzahl * 50;                          // 50 – 500 px/s
  const lossRad = (loslasspunkt * Math.PI) / 180;
  const releaseEff = Math.abs(Math.sin(lossRad * 2));   // 0 – 1, peaks at 45°
  return v0Raw * (0.35 + 0.65 * releaseEff);
}

/**
 * Simulate the full projectile trajectory and return a list of (x, y, t) points.
 *
 * Parameter effects:
 *   - drehzahl + loslasspunkt together determine v0 (initial speed)
 *   - winkel       determines launch angle (shape of arc)
 *   - wurfmasse    determines air drag (drag = 0.020 / masse) and a slight
 *                  gravity boost (heavier → steeper, shorter arc for same v0)
 */
export function calcTrajectory(params: PhysicsParams): TPoint[] {
  const { wurfmasse, winkel } = params;
  const v0 = computeV0(params);

  const angleRad = (winkel * Math.PI) / 180;
  let vx = v0 * Math.cos(angleRad);
  let vy = -v0 * Math.sin(angleRad); // negative = upward in screen coords

  // Air drag: inversely proportional to mass
  const drag = 0.020 / wurfmasse;   // 0.004 (heavy) – 0.040 (light)

  // Effective gravity: heavier objects experience slightly stronger pull (gameplay interest)
  const gEff = (0.88 + wurfmasse * 0.07) * 9.8 * 25;  // ~251 px/s² at masse=2.5

  const points: TPoint[] = [];
  const dt = 1 / 60; // 60 fps time step
  let x = LAUNCHER_X;
  let y = LAUNCHER_Y;
  let t = 0;

  for (let i = 0; i < 720; i++) {
    points.push({ x, y, t });

    vx *= (1 - drag);
    vy = vy * (1 - drag * 0.3) + gEff * dt;

    x += vx * dt;
    y += vy * dt;
    t += dt;

    if (y >= GROUND_Y) {
      points.push({ x, y: GROUND_Y, t });
      break;
    }
    if (x > ARENA_W + 30) {
      points.push({ x, y, t });
      break;
    }
  }

  return points;
}

export function getLandingX(params: PhysicsParams): number {
  const pts = calcTrajectory(params);
  return pts[pts.length - 1].x;
}
