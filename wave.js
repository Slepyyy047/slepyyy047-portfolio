const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const WAVE_DURATION_MS = 2200;

export function advanceWaveProgress(current, target, elapsedMs) {
  const from = clamp01(current), to = clamp01(target);
  const step = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / WAVE_DURATION_MS;
  return to > from ? Math.min(to, from + step) : Math.max(to, from - step);
}

// A small intentional scroll starts the complete dissolve, even on a fine wheel.
export function getWaveTarget(offset) {
  return Number.isFinite(offset) && offset > 6 ? 1 : 0;
}

/** Compute a bounded staggered dissolve state for one headline character. */
export function computeWaveState(progress, index, count) {
  const safeProgress = clamp01(progress);
  const safeIndex = Math.max(0, Math.floor(Number.isFinite(index) ? index : 0));
  const safeCount = Math.max(1, Math.floor(Number.isFinite(count) ? count : 1));
  const stagger = safeIndex / safeCount * 0.62;
  const local = clamp01((safeProgress - stagger) / 0.3);
  const eased = local * local * (3 - 2 * local);
  const direction = Math.sin(safeIndex * 0.65);
  const displacement = eased === 0 ? 0 : direction * eased;
  return {
    progress: eased,
    y: displacement * 32,
    rotation: displacement * 6,
    blur: eased * 12,
    opacity: 1 - eased,
  };
}

function wrapTextCharacters(node, letters) {
  const fragment = document.createDocumentFragment();
  for (const character of node.data) {
    const span = document.createElement('span');
    span.className = 'wave-letter';
    span.textContent = character === ' ' ? '\u00a0' : character;
    fragment.append(span);
    letters.push(span);
  }
  node.replaceWith(fragment);
}

function wrapExistingText(container, letters) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) wrapTextCharacters(node, letters);
}

/** Trigger a timed heading dissolve from native page scroll. */
export function initScrollWave(element) {
  if (!element || typeof window === 'undefined' || typeof document === 'undefined') return { destroy() {} };
  const section = element.closest('.intro-landscape');
  if (!section) return { destroy() {} };

  const originalMarkup = element.innerHTML;
  const previousLabel = element.getAttribute('aria-label');
  const previousProgress = section.style.getPropertyValue('--hero-progress');
  const visualText = element.innerText || element.textContent || '';
  const visual = document.createElement('span');
  visual.className = 'wave-visual';
  visual.setAttribute('aria-hidden', 'true');
  while (element.firstChild) visual.append(element.firstChild);
  element.append(visual);
  element.setAttribute('aria-label', visualText.replace(/\s+/g, ' ').trim());

  const letters = [];
  wrapExistingText(visual, letters);
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = Boolean(reduceMotion?.matches);
  let visible = typeof IntersectionObserver === 'undefined';
  let current = 0;
  let target = 0;
  let frame = 0;
  let previousTime = null;

  function paint(progress) {
    section.style.setProperty('--hero-progress', String(progress));
    letters.forEach((letter, index) => {
      const state = computeWaveState(progress, index, letters.length);
      if (state.progress === 0) {
        letter.style.transform = '';
        letter.style.filter = '';
        letter.style.opacity = '1';
        return;
      }
      letter.style.transform = `translate3d(0, ${state.y.toFixed(2)}px, 0) rotate(${state.rotation.toFixed(2)}deg)`;
      letter.style.filter = `blur(${state.blur.toFixed(2)}px)`;
      letter.style.opacity = state.opacity.toFixed(3);
    });
  }

  function cancel() {
    previousTime = null;
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function readProgress() {
    const rect = section.getBoundingClientRect();
    const headerHeight = document.querySelector('.header')?.getBoundingClientRect().height || 0;
    return getWaveTarget(headerHeight - rect.top);
  }

  function animate(now) {
    frame = 0;
    if (reduced || !visible || document.hidden) return;
    const elapsed = previousTime === null ? 0 : Math.min(64, now - previousTime);
    previousTime = now;
    current = advanceWaveProgress(current, target, elapsed);
    paint(current);
    if (current !== target) frame = requestAnimationFrame(animate);
    else previousTime = null;
  }

  function schedule() {
    if (reduced || !visible || document.hidden || frame || current === target) return;
    frame = requestAnimationFrame(animate);
  }

  function onScroll() {
    if (reduced) return;
    target = readProgress();
    schedule();
  }

  function onVisibilityChange() {
    if (document.hidden) cancel();
    else onScroll();
  }

  function onMotionChange(event) {
    reduced = event.matches;
    if (reduced) {
      cancel();
      current = 0;
      target = 0;
      paint(0);
    } else onScroll();
  }

  function observeVisibility() {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) onScroll();
      else cancel();
    });
    observer.observe(section);
    return observer;
  }

  paint(0);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  reduceMotion?.addEventListener?.('change', onMotionChange);
  const observer = typeof IntersectionObserver === 'undefined' ? null : observeVisibility();
  if (!reduced) onScroll();

  return {
    destroy() {
      cancel();
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reduceMotion?.removeEventListener?.('change', onMotionChange);
      element.innerHTML = originalMarkup;
      if (previousLabel === null) element.removeAttribute('aria-label');
      else element.setAttribute('aria-label', previousLabel);
      if (previousProgress) section.style.setProperty('--hero-progress', previousProgress);
      else section.style.removeProperty('--hero-progress');
    },
  };
}
