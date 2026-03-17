import * as THREE from 'three';

// Maximaler Schwenkwinkel in jede Richtung (±45°)
const MAX_ANGLE_RAD = THREE.MathUtils.degToRad(45);

export interface LookAroundControls {
  /** Aktueller Yaw-/Pitch-Versatz in Radiant. Nach dem Setzen der Kamera auf die Standardvorgabe anwenden. */
  getOffset(): { yaw: number; pitch: number };
  /** Controller aktivieren oder deaktivieren. Setzt den Ziehzustand zurück. */
  setEnabled(enabled: boolean): void;
  /** Vertikales Umschauen (Pitch) zulassen oder sperren. Wenn gesperrt, wird nur Yaw angewendet. */
  setAllowPitch(allow: boolean): void;
  /** Maximalen Yaw-Winkel zum Blick nach links (positives Yaw) in Grad festlegen. Standard 45. */
  setMaxYawLeft(degrees: number): void;
  /** Yaw/Pitch auf Null zurücksetzen (aufrufen beim Navigieren zu einem neuen Bereich). */
  reset(): void;
  /** Alle Event-Listener entfernen. */
  dispose(): void;
}

/**
 * Umschau-Controller — nur Touch.
 * Hält die Kameraposition fest, aber lässt den Benutzer die Blickrichtung
 * durch Ziehen mit einem Finger drehen. Begrenzt auf ±45° in beiden Achsen.
 *
 * Die Empfindlichkeit wird auf die DOM-Elementgröße normalisiert, sodass ein
 * vollständiger Breitenwisch den gesamten ±45°-Bereich abdeckt, unabhängig
 * von der Bildschirmgröße.
 *
 * Multi-Touch wird erkannt: Wenn ein zweiter Finger landet, wird das Ziehen
 * unterbrochen, damit Pinch-to-Zoom (an anderer Stelle behandelt) keine wilden
 * Kamerasprünge verursacht.
 *
 * @param domElement  Canvas-Element zum Anhängen.
 * @param onChange    Wird bei jedem Touch-Move aufgerufen, der den Versatz ändert.
 *                    Verwenden Sie dies, um DOM-Overlays (Hotspots) mit der
 *                    gedrehten Kamera synchron zu halten, ohne auf das nächste
 *                    State-Event zu warten.
 */
export function createLookAroundControls(
  domElement: HTMLElement,
  onChange?: () => void
): LookAroundControls {
  let enabled = false;
  let allowPitch = true;
  let maxYawPositive = MAX_ANGLE_RAD; // positives Yaw = nach links blicken
  let yaw = 0;   // horizontaler Versatz (Radiant)
  let pitch = 0; // vertikaler Versatz (Radiant)

  // Aktive Touch-Pointer verfolgen, um Multi-Touch zu erkennen und Pinch-Gesten zu ignorieren.
  let primaryPointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;
  let activeTouchCount = 0;
  // Snapshot von Yaw/Pitch, wenn der erste Finger landet. Wenn ein zweiter Finger
  // ankommt (= Pinch-Absicht), stellen wir diese wieder her, um alle versehentlichen
  // Umschau-Bewegungen zwischen dem ersten und zweiten Finger zu stornieren.
  let snapshotYaw = 0;
  let snapshotPitch = 0;
  let gestureContaminated = false; // true sobald ≥2 Finger in dieser Geste gesehen wurden

  function onPointerDown(e: PointerEvent): void {
    // Nur Touch — Maus-Ziehen auf dem Desktop wird hier nicht behandelt.
    if (!enabled || e.pointerType !== 'touch') return;

    activeTouchCount++;

    // Nur mit dem ersten Finger beginnen zu ziehen
    if (activeTouchCount === 1) {
      primaryPointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      snapshotYaw = yaw;
      snapshotPitch = pitch;
      gestureContaminated = false;
      domElement.setPointerCapture(e.pointerId);
    } else {
      // Zweiter+ Finger angekommen → das ist ein Pinch, kein Umschauen.
      // Machen Sie alle Versätze rückgängig, die seit dem ersten Finger angesammelt wurden.
      if (!gestureContaminated) {
        gestureContaminated = true;
        const changed = yaw !== snapshotYaw || pitch !== snapshotPitch;
        yaw = snapshotYaw;
        pitch = snapshotPitch;
        if (changed) onChange?.();
      }
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (!enabled || e.pointerType !== 'touch') return;
    // Nur Bewegungen vom primären Finger verarbeiten, nur wenn genau 1 Touch
    // aktiv ist, und nur wenn die Geste nie ein Pinch war.
    if (e.pointerId !== primaryPointerId || activeTouchCount !== 1 || gestureContaminated) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // Delta auf DOM-Elementgröße normalisieren — vollständiger Breitenwisch = vollständiger ±MAX-Bereich
    const w = Math.max(domElement.clientWidth, 1);
    const h = Math.max(domElement.clientHeight, 1);

    yaw   = THREE.MathUtils.clamp(yaw   - (dx / w) * MAX_ANGLE_RAD * 2, -MAX_ANGLE_RAD, maxYawPositive);
    if (allowPitch) {
      pitch = THREE.MathUtils.clamp(pitch - (dy / h) * MAX_ANGLE_RAD * 2, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);
    }

    onChange?.();
  }

  function onPointerUp(e: PointerEvent): void {
    if (e.pointerType !== 'touch') return;

    activeTouchCount = Math.max(0, activeTouchCount - 1);

    if (e.pointerId === primaryPointerId) {
      primaryPointerId = null;
    }
  }

  domElement.addEventListener('pointerdown',   onPointerDown);
  domElement.addEventListener('pointermove',   onPointerMove);
  domElement.addEventListener('pointerup',     onPointerUp);
  domElement.addEventListener('pointercancel', onPointerUp);

  return {
    getOffset: () => ({ yaw, pitch }),

    setEnabled(val: boolean): void {
      enabled = val;
      if (!val) {
        primaryPointerId = null;
        activeTouchCount = 0;
      }
    },

    setAllowPitch(allow: boolean): void {
      allowPitch = allow;
      if (!allow && pitch !== 0) {
        pitch = 0;
      }
    },

    setMaxYawLeft(degrees: number): void {
      maxYawPositive = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(degrees), 0, MAX_ANGLE_RAD);
      if (yaw > maxYawPositive) {
        yaw = maxYawPositive;
      }
    },

    reset(): void {
      yaw = 0;
      pitch = 0;
      primaryPointerId = null;
      activeTouchCount = 0;
    },

    dispose(): void {
      domElement.removeEventListener('pointerdown',   onPointerDown);
      domElement.removeEventListener('pointermove',   onPointerMove);
      domElement.removeEventListener('pointerup',     onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerUp);
    }
  };
}
