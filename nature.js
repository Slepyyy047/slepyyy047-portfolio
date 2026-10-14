const PHOTO_X_LIMIT = 9;
const PHOTO_Y_LIMIT = 10;
const MIST_X_LIMIT = 12;
const SETTLE_EPSILON = 0.015;
const EASING = 0.18;

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

/** Map normalized pointer and scroll positions to bounded scene translations. */
export function getNatureTargets(pointerX = 0, pointerY = 0, scroll = 0) {
  const normalizedX = clamp(pointerX, 1);
  const x = normalizedX * PHOTO_X_LIMIT;
  const pointerOffsetY = clamp(pointerY, 1) * 5;
  const scrollOffsetY = clamp(scroll, 1) * 10;
  return {
    x,
    y: clamp(pointerOffsetY + scrollOffsetY, PHOTO_Y_LIMIT),
    mistX: -normalizedX * MIST_X_LIMIT || 0,
  };
}

/** One time-based easing step; exported for deterministic boundary tests. */
export function easeNatureValue(current, target, progress = EASING) {
  const next = current + (target - current) * clamp(progress, 1);
  return Math.abs(target - next) < SETTLE_EPSILON ? target : next;
}

/** Add subtle, event-driven pointer and scroll motion to a nature scene. */
export function initNatureScene(root) {
  if (!root || typeof window === 'undefined') return { destroy() {} };
  const scene = root.matches?.('.nature-scene') ? root : root.querySelector?.('.nature-scene');
  if (!scene) return { destroy() {} };
  const photo = scene.querySelector('.nature-photo');
  const mist = scene.querySelector('.nature-mist');
  if (!photo || !mist) return { destroy() {} };
  const interactionArea = scene.closest('.intro-landscape') || scene.parentElement || scene;

  const reduceQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const coarseQuery = window.matchMedia?.('(pointer: coarse)');
  let enabled = !reduceQuery?.matches && !coarseQuery?.matches;
  let visible = typeof IntersectionObserver === 'undefined';
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let hasPointer = false;
  let current = { x: 0, y: 0, mistX: 0 };
  let target = { ...current };

  function apply(values) {
    scene.style.setProperty('--scene-x', `${values.x.toFixed(3)}px`);
    scene.style.setProperty('--scene-y', `${values.y.toFixed(3)}px`);
    scene.style.setProperty('--mist-x', `${values.mistX.toFixed(3)}px`);
  }

  function differs() {
    return Math.abs(current.x - target.x) > SETTLE_EPSILON
      || Math.abs(current.y - target.y) > SETTLE_EPSILON
      || Math.abs(current.mistX - target.mistX) > SETTLE_EPSILON;
  }

  function cancel() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function animate() {
    frame = 0;
    if (!enabled || !visible || document.hidden) return;
    current = {
      x: easeNatureValue(current.x, target.x),
      y: easeNatureValue(current.y, target.y),
      mistX: easeNatureValue(current.mistX, target.mistX),
    };
    apply(current);
    if (differs()) {
      scene.dataset.motion = 'moving';
      frame = requestAnimationFrame(animate);
    } else {
      current = { ...target };
      apply(current);
      scene.dataset.motion = 'ready';
    }
  }

  function schedule() {
    if (!enabled || !visible || document.hidden || !differs() || frame) return;
    scene.dataset.motion = 'moving';
    frame = requestAnimationFrame(animate);
  }

  function scrollPosition() {
    if (!enabled) return 0;
    const rect = scene.getBoundingClientRect();
    const viewport = window.innerHeight || 1;
    const center = rect.top + rect.height / 2;
    const span = Math.max(1, (viewport + rect.height) / 2);
    return clamp((viewport / 2 - center) / span, 1);
  }

  function updateTarget() {
    if (!enabled) return;
    target = getNatureTargets(hasPointer ? pointerX : 0, hasPointer ? pointerY : 0, scrollPosition());
    schedule();
  }

  function onPointerMove(event) {
    if (!enabled || event.pointerType !== 'mouse') return;
    const rect = scene.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, 1);
    pointerY = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, 1);
    hasPointer = true;
    updateTarget();
  }

  function onPointerLeave() {
    hasPointer = false;
    updateTarget();
  }

  function onVisibilityChange() {
    if (document.hidden) {
      cancel();
      if (enabled) scene.dataset.motion = 'ready';
    } else updateTarget();
  }

  function onMotionPreferenceChange() {
    enabled = !reduceQuery?.matches && !coarseQuery?.matches;
    if (!enabled) {
      cancel();
      pointerX = 0;
      pointerY = 0;
      hasPointer = false;
      current = { x: 0, y: 0, mistX: 0 };
      target = { ...current };
      apply(current);
      scene.dataset.motion = 'static';
    } else {
      scene.dataset.motion = 'ready';
      updateTarget();
    }
  }

  apply(current);
  scene.dataset.motion = enabled ? 'ready' : 'static';
  interactionArea.addEventListener('pointermove', onPointerMove, { passive: true });
  interactionArea.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('scroll', updateTarget, { passive: true });
  window.addEventListener('resize', updateTarget, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  reduceQuery?.addEventListener?.('change', onMotionPreferenceChange);
  coarseQuery?.addEventListener?.('change', onMotionPreferenceChange);

  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) updateTarget();
    else {
      cancel();
      if (enabled) scene.dataset.motion = 'ready';
    }
  });
  observer?.observe(scene);

  return {
    destroy() {
      cancel();
      observer?.disconnect();
      interactionArea.removeEventListener('pointermove', onPointerMove);
      interactionArea.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('scroll', updateTarget);
      window.removeEventListener('resize', updateTarget);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reduceQuery?.removeEventListener?.('change', onMotionPreferenceChange);
      coarseQuery?.removeEventListener?.('change', onMotionPreferenceChange);
      apply({ x: 0, y: 0, mistX: 0 });
      delete scene.dataset.motion;
    },
  };
}
