/**
 * Port of animation_player.py easing functions +
 * animation_editor.py interpolation logic.
 */

// ==================== Easing Functions ====================
export function easeLinear(t) { return t; }
export function easeIn(t) { return t * t * t; }
export function easeOut(t) { return 1.0 - (1.0 - t) ** 3; }
export function easeInOut(t) {
  return t < 0.5 ? 4.0 * t ** 3 : 1.0 - (-2.0 * t + 2.0) ** 3 / 2.0;
}

const EASING = {
  'linear':      easeLinear,
  'ease-in':     easeIn,
  'ease-out':    easeOut,
  'ease-in-out': easeInOut,
};

export function getEaseFn(name) {
  return EASING[name] || easeLinear;
}

/**
 * Interpolate between two keyframes at parameter t ∈ [0,1].
 * Returns { body, legs } — same format as keyframe data.
 */
export function interpolateKeyframes(kfA, kfB, t) {
  const easingName = kfB.easing || 'ease-in-out';
  const easeFn = getEaseFn(easingName);
  const et = easeFn(t);

  const body = {};
  for (const key of ['x', 'y', 'z', 'roll', 'pitch', 'yaw']) {
    body[key] = kfA.body[key] * (1.0 - et) + kfB.body[key] * et;
  }

  const arcHeight = kfB.arc_height || 0;
  const legs = [];

  for (let i = 0; i < 6; i++) {
    const [p0x, p0y, p0z] = kfA.legs[i];
    const [p2x, p2y, p2z] = kfB.legs[i];

    const dist = Math.hypot(p2x - p0x, p2y - p0y);

    const lx = p0x * (1.0 - et) + p2x * et;
    const ly = p0y * (1.0 - et) + p2y * et;

    // Backwards compat for trajectory: bezier
    const traj = kfB.trajectory || 'linear';
    let effectiveArc = arcHeight;
    if (traj === 'bezier' && effectiveArc < 0.001) effectiveArc = 0.04;

    let lz;
    if (effectiveArc > 0.001 && dist > 0.005) {
      lz = p0z * (1.0 - et) + p2z * et + 4.0 * effectiveArc * et * (1.0 - et);
    } else {
      lz = p0z * (1.0 - et) + p2z * et;
    }

    legs.push([lx, ly, lz]);
  }

  return { body, legs };
}

/**
 * Calculate total duration of a keyframes array (sum of kf[1..n].duration).
 */
export function totalDuration(keyframes) {
  if (keyframes.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < keyframes.length; i++) {
    sum += keyframes[i].duration;
  }
  return sum;
}

/**
 * Given a time t and array of keyframes, find the interpolated frame.
 * Returns { body, legs } or null.
 */
export function getFrameAtTime(keyframes, t) {
  if (keyframes.length < 2) return null;
  let accumulated = 0;
  for (let i = 1; i < keyframes.length; i++) {
    const segDur = keyframes[i].duration;
    if (accumulated + segDur >= t || i === keyframes.length - 1) {
      let localT = segDur > 0 ? (t - accumulated) / segDur : 1.0;
      localT = Math.max(0, Math.min(1, localT));
      return interpolateKeyframes(keyframes[i - 1], keyframes[i], localT);
    }
    accumulated += segDur;
  }
  return null;
}
