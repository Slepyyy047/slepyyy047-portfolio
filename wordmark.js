const WORDMARK_TEXT = 'PORTFOLIO';
const MAX_DISPLACEMENT = 8;
const INFLUENCE_RADIUS = 70;
const STRIP_HEIGHT = 2;

/** Return a smooth, local horizontal displacement for one point in the wordmark. */
export function getSliceOffset(x, y, pointerX, pointerY, radius = INFLUENCE_RADIUS, maximum = MAX_DISPLACEMENT) {
  const dx = x - pointerX;
  const dy = y - pointerY;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius || radius <= 0) return 0;
  const proximity = 1 - distance / radius;
  const eased = proximity * proximity * (3 - 2 * proximity);
  // The vertical wave gives neighboring slices different motion while keeping
  // the pointer's nearby letters responsive and the whole effect bounded.
  const wave = Math.sin((y - pointerY) * 0.12 + dx * 0.035);
  return Math.max(-maximum, Math.min(maximum, wave * eased * maximum));
}

/** Add an accessible, pointer-reactive canvas rendering over a static wordmark. */
export function initWordmark(element) {
  if (!element || typeof document === 'undefined') return { destroy() {} };
  const staticText = element.querySelector('.wordmark-static');
  if (!staticText || typeof element.append !== 'function') return { destroy() {} };

  const canvas = document.createElement('canvas');
  canvas.className = 'wordmark-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  element.append(canvas);
  const previousPosition = element.style.position;
  if (getComputedStyle(element).position === 'static') element.style.position = 'relative';

  const context = canvas.getContext('2d');
  if (!context) { canvas.remove(); return { destroy() {} }; }

  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let enabled = !motion?.matches;
  let ready = false;
  let frame = 0;
  let pointer = null;
  let targetPointer = null;
  let strength = 0;
  let targetStrength = 0;
  let source;
  let width = 0;
  let height = 0;
  let scale = 1;
  let font = '26px Georgia, serif';
  let letterSpacing = 0;
  let textLeft = 0;
  let textTop = 0;
  let glyphCenters = [];

  function measure() {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const style = getComputedStyle(staticText);
    font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const spacing = Number.parseFloat(style.letterSpacing);
    letterSpacing = Number.isFinite(spacing) ? spacing : 0;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.font = font;
    context.textBaseline = 'alphabetic';
    const widths = [...WORDMARK_TEXT].map(char => context.measureText(char).width);
    const total = widths.reduce((sum, value) => sum + value, 0) + letterSpacing * (widths.length - 1);
    textLeft = (width - total) / 2;
    const fontSize = Number.parseFloat(style.fontSize) || 26;
    textTop = (height - fontSize) / 2 + fontSize * 0.82;
    glyphCenters = [];
    let cursor = textLeft;
    widths.forEach((glyphWidth, index) => {
      glyphCenters.push(cursor + glyphWidth / 2);
      cursor += glyphWidth + letterSpacing;
    });
    ready = true;
    source = document.createElement('canvas');
    source.width = canvas.width;
    source.height = canvas.height;
    staticText.style.opacity = '0';
    element.dataset.slicing = 'ready';
    render();
  }

  function drawBase() {
    context.clearRect(0, 0, width, height);
    context.font = font;
    context.textBaseline = 'alphabetic';
    context.fillStyle = getComputedStyle(staticText).color;
    let cursor = textLeft;
    [...WORDMARK_TEXT].forEach((char, index) => {
      context.fillText(char, cursor, textTop);
      cursor += context.measureText(char).width + letterSpacing;
    });
  }

  function render() {
    frame = 0;
    if (!ready) return;
    strength += (targetStrength - strength) * .24;
    if (Math.abs(targetStrength - strength) < .002) strength = targetStrength;
    let unsettled = strength !== targetStrength;
    if (pointer && targetPointer) {
      pointer.x += (targetPointer.x - pointer.x) * .3;
      pointer.y += (targetPointer.y - pointer.y) * .3;
      unsettled ||= Math.hypot(pointer.x - targetPointer.x, pointer.y - targetPointer.y) > .05;
    }
    if (!strength && !targetStrength) pointer = null;
    drawBase();
    if (enabled && pointer) {
      const nearest = Math.min(...glyphCenters.map(center => Math.hypot(center - pointer.x, textTop - pointer.y)));
      if (nearest >= INFLUENCE_RADIUS) {
        element.dataset.slicing = 'ready';
        if (unsettled) schedule();
        return;
      }
      // Copy from a clean backing canvas so each row is shifted from the exact
      // original glyph position and never accumulates rounding or drift.
      const sourceContext = source.getContext('2d');
      sourceContext.clearRect(0, 0, source.width, source.height);
      sourceContext.drawImage(canvas, 0, 0);
      context.clearRect(0, 0, width, height);
      const cssSlice = STRIP_HEIGHT;
      for (let y = 0; y < height; y += cssSlice) {
        const sampleY = y + cssSlice / 2;
        for (let index = 0; index < glyphCenters.length; index += 1) {
          const center = glyphCenters[index];
          const left = index === 0 ? textLeft : (glyphCenters[index - 1] + center) / 2;
          const right = index === glyphCenters.length - 1 ? width - textLeft : (center + glyphCenters[index + 1]) / 2;
          const offset = getSliceOffset(center, sampleY, pointer.x, pointer.y) * strength;
          const sx = Math.max(0, Math.round(left * scale));
          const sw = Math.min(source.width - sx, Math.round((right - left) * scale));
          const sy = Math.round(y * scale);
          const sh = Math.min(source.height - sy, Math.ceil(cssSlice * scale));
          if (sw > 0 && sh > 0) context.drawImage(source, sx, sy, sw, sh, sx / scale + offset, sy / scale, sw / scale, sh / scale);
        }
      }
      context.globalCompositeOperation = 'source-over';
    }
    element.dataset.slicing = enabled && pointer ? 'active' : 'ready';
    if (unsettled) schedule();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function onPointerMove(event) {
    if (!enabled) return;
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
      pointer = null; targetPointer = null; strength = 0; targetStrength = 0; schedule(); return;
    }
    const rect = element.getBoundingClientRect();
    targetPointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (!pointer) pointer = { ...targetPointer };
    targetStrength = 1;
    schedule();
  }
  function onPointerLeave() { targetStrength = 0; schedule(); }
  function onMotionChange(event) {
    enabled = !event.matches;
    if (!enabled) { pointer = null; targetPointer = null; strength = 0; targetStrength = 0; }
    schedule();
  }
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
  resizeObserver?.observe(element);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerleave', onPointerLeave);
  motion?.addEventListener?.('change', onMotionChange);

  const fontsReady = document.fonts?.ready;
  if (fontsReady) fontsReady.then(measure); else measure();

  return {
    canvas,
    destroy() {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerleave', onPointerLeave);
      motion?.removeEventListener?.('change', onMotionChange);
      staticText.style.opacity = '';
      element.style.position = previousPosition;
      delete element.dataset.slicing;
      canvas.remove();
    },
  };
}
