/** Short reveal sequences finish in time, rather than consuming scroll distance. */
export function getRevealDelay(index, count) {
  return Math.round(Math.max(0, Math.min(1, index / Math.max(1, count - 1))) * 160);
}

function prepareText(element) {
  const label = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
  if (!label) return;
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  while (element.firstChild) visual.append(element.firstChild);
  element.append(visual);
  // Keep paragraphs readable as text instead of relying on aria-label on a <p>.
  const accessible = document.createElement('span');
  accessible.className = 'sr-only';
  accessible.textContent = label;
  element.prepend(accessible);
  const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const words = [];
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const token of node.data.split(/(\s+)/)) {
      if (!token.trim()) { fragment.append(document.createTextNode(token)); continue; }
      const word = document.createElement('span');
      word.className = 'flow-word';
      word.textContent = token;
      fragment.append(word);
      words.push(word);
    }
    node.replaceWith(fragment);
  }
  words.forEach((word, index) => word.style.setProperty('--word-delay', `${getRevealDelay(index, words.length)}ms`));
}

export function initRevealMotion(root = document) {
  const elements = [...root.querySelectorAll('.reveal')];
  if (!('IntersectionObserver' in window)) {
    elements.forEach(element => element.classList.add('visible'));
    return;
  }
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  elements.forEach(element => {
    element.querySelectorAll('h2, h3, p:not([hidden])').forEach(prepareText);
  });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });
  function revealAll() {
    if (!motionQuery.matches) return;
    elements.forEach(element => element.classList.add('visible'));
    observer.disconnect();
  }
  // A keyboard jump must never focus an element still waiting for its reveal.
  root.addEventListener('focusin', event => {
    const element = event.target.closest('.reveal');
    if (element) { element.classList.add('visible'); observer.unobserve(element); }
  });
  document.documentElement.classList.add('motion-ready');
  elements.forEach(element => observer.observe(element));
  motionQuery.addEventListener('change', revealAll);
  revealAll();
}
