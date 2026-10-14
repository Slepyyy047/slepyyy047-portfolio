const DEFAULT_RADIUS = 100;
const MAX_LIFT = 8;
const MAX_TURN = 4;
const RESET_EPSILON = 0.01;

const SELECTOR = '#intro-title, #about-title, #selected-title, #contact-title, .project-meta h3, #works-title';

/** Compute a bounded local lift and turn for a letter near the pointer. */
export function computeLetterMotion(x, y, pointerX, pointerY, radius = DEFAULT_RADIUS) {
  const dx = x - pointerX;
  const dy = y - pointerY;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius || radius <= 0) return { y: 0, turn: 0, influence: 0 };
  const proximity = 1 - distance / radius;
  const influence = proximity * proximity * (3 - 2 * proximity);
  const horizontal = Math.max(-1, Math.min(1, dx / radius));
  return {
    y: -MAX_LIFT * influence,
    turn: MAX_TURN * horizontal * influence,
    influence,
  };
}

function collectFaces(root) {
  const headings = [];
  if (root.matches?.(SELECTOR)) headings.push(root);
  headings.push(...(root.querySelectorAll?.(SELECTOR) || []));
  const faces = [];

  for (const heading of headings) {
    if (heading.closest('.sr-only')) continue;
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.data.length || node.parentElement?.closest('.sr-only, .letter-cell')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    for (const textNode of textNodes) {
      const fragment = document.createDocumentFragment();
      for (const character of textNode.data) {
        const cell = document.createElement('span');
        const face = document.createElement('span');
        cell.className = 'letter-cell';
        face.className = 'letter-face';
        // Preserve actual spaces; preformatted whitespace prevents their
        // collapse inside the inline-block cell while retaining their width.
        if (character === ' ') face.style.whiteSpace = 'pre';
        face.textContent = character;
        cell.append(face);
        fragment.append(cell);
        faces.push(face);
      }
      textNode.replaceWith(fragment);
    }
  }
  return faces;
}

/** Add event-driven pointer motion to decorative heading-letter spans. */
export function initLetterInteractions(root = globalThis.document) {
  if (!root || typeof document === 'undefined' || typeof window === 'undefined') return { destroy() {} };
  const faces = collectFaces(root);
  if (!faces.length) return { destroy() {} };

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia?.('(pointer: coarse)');
  let enabled = !reduceMotion?.matches && !coarsePointer?.matches;
  let frame = 0;
  let pointer = null;
  let pendingPointer = null;

  function clearFaces() {
    for (const face of faces) {
      face.style.removeProperty('--letter-y');
      face.style.removeProperty('--letter-turn');
    }
  }

  function reset() {
    pointer = null;
    pendingPointer = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    clearFaces();
  }

  function render() {
    frame = 0;
    if (!enabled || document.hidden || !pendingPointer) return;
    pointer = pendingPointer;
    pendingPointer = null;

    // Read every geometry value before writing any style to avoid forced
    // layout between per-letter reads and writes.
    const geometry = faces.map(face => {
      const rect = face.parentElement.getBoundingClientRect();
      return { face, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    const changes = geometry.map(({ face, x, y }) => ({
      face,
      motion: computeLetterMotion(x, y, pointer.x, pointer.y),
    }));

    for (const { face, motion } of changes) {
      if (motion.influence < RESET_EPSILON) {
        face.style.removeProperty('--letter-y');
        face.style.removeProperty('--letter-turn');
      } else {
        face.style.setProperty('--letter-y', `${motion.y.toFixed(3)}px`);
        face.style.setProperty('--letter-turn', `${motion.turn.toFixed(3)}deg`);
      }
    }
  }

  function onPointerMove(event) {
    if (!enabled || document.hidden || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
    pendingPointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(render);
  }

  function onMotionChange() {
    enabled = !reduceMotion?.matches && !coarsePointer?.matches;
    if (!enabled) reset();
  }

  root.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('pointerleave', reset, { passive: true });
  document.addEventListener('visibilitychange', reset);
  window.addEventListener('blur', reset);
  reduceMotion?.addEventListener?.('change', onMotionChange);
  coarsePointer?.addEventListener?.('change', onMotionChange);

  return {
    destroy() {
      reset();
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', reset);
      window.removeEventListener('blur', reset);
      reduceMotion?.removeEventListener?.('change', onMotionChange);
      coarsePointer?.removeEventListener?.('change', onMotionChange);
      for (const face of faces) {
        const cell = face.parentElement;
        if (cell?.classList.contains('letter-cell')) cell.replaceWith(document.createTextNode(face.textContent || ''));
      }
    },
  };
}
