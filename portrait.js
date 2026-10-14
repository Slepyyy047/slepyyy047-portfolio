// A light 2D rig: the original texture is shared by the body, head and waving hand.
// Coordinates refer to a normalized 1280px artboard. No animation dependency.
export function createPortrait(container, { reduced = false } = {}) {
  const headPath = 'M 145 120 H 932 V 743 L 793 800 L 652 818 L 604 876 Q 511 917 379 848 L 396 806 L 296 763 L 145 685 Z';
  const handPath = 'M 921 463 H 1265 V 855 L 1107 876 Q 1044 877 996 852 L 972 802 L 918 706 L 897 635 Z';
  container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 1280" aria-hidden="true">
    <defs>
      <image id="character-image" href="assets/danylo.png" width="1280" height="1280"/>
      <clipPath id="head-clip"><path d="${headPath}"/></clipPath>
      <clipPath id="hand-clip"><path d="${handPath}"/></clipPath>
      <mask id="body-mask"><rect width="1280" height="1280" fill="white"/><path d="${headPath}" fill="black"/><path d="${handPath}" fill="black"/><path d="M376 842 Q509 901 610 863 L603 882 Q499 922 376 858Z" fill="white"/></mask>
      <linearGradient id="lid-skin" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dc936c"/><stop offset="1" stop-color="#f9bd94"/></linearGradient>
    </defs>
    <g id="character-body"><use href="#character-image" mask="url(#body-mask)"/>
      <g id="character-hand"><use href="#character-image" clip-path="url(#hand-clip)"/></g>
      <g id="character-head"><use href="#character-image" clip-path="url(#head-clip)"/>
        <g id="character-blink" opacity="0">
          <path d="M453 527 Q470 512 492 514 Q535 515 552 540 L555 574 Q498 571 450 545Z" fill="url(#lid-skin)"/>
          <path d="M625 570 Q640 553 663 555 Q700 555 714 584 L715 615 Q666 609 623 589Z" fill="url(#lid-skin)"/>
          <path d="M458 538 Q505 569 548 551 M633 582 Q675 613 709 594" fill="none" stroke="#5b3024" stroke-width="5" stroke-linecap="round"/>
        </g>
      </g>
    </g>
  </svg>`;
  const image = new Image();
  image.src = 'assets/danylo.png';
  image.onerror = () => { failed = true; stopped = true; reset(); observer.disconnect(); container.innerHTML = '<div class="portrait-error">Портрет Данила<br>Зображення тимчасово недоступне</div>'; };
  const head = container.querySelector('#character-head');
  const hand = container.querySelector('#character-hand');
  const body = container.querySelector('#character-body');
  const blink = container.querySelector('#character-blink');
  let stopped = reduced, failed = false, visible = true, frame = 0, elapsed = 0, previous = 0, greeting = 0, pointer = 0;
  function render(now) {
    frame = 0;
    if (stopped || !visible || document.hidden) return;
    const delta = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now;
    elapsed += delta;
    greeting += delta;
    const cycle = greeting % 12;
    const wave = cycle < 2.6 ? Math.sin(cycle * 10) * Math.sin(Math.PI * cycle / 2.6) * 8 : 0;
    hand.setAttribute('transform', `rotate(${wave} 1050 846)`);
    head.setAttribute('transform', `rotate(${Math.sin(elapsed * .8) * .65 + pointer * .65} 539 838)`);
    body.setAttribute('transform', `translate(0 ${Math.sin(elapsed * 1.25) * 2.2 + Math.min(window.scrollY * .025, 12)})`);
    const blinkPhase = elapsed % 4.9;
    blink.setAttribute('opacity', blinkPhase > 4.57 && blinkPhase < 4.72 ? '1' : '0');
    frame = requestAnimationFrame(render);
  }
  function schedule() { if (!frame && !stopped && visible && !document.hidden) { previous = 0; frame = requestAnimationFrame(render); } }
  function reset() { cancelAnimationFrame(frame); frame = 0; head.removeAttribute('transform'); hand.removeAttribute('transform'); body.removeAttribute('transform'); blink.setAttribute('opacity', '0'); }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else { cancelAnimationFrame(frame); frame = 0; } });
  observer.observe(container);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else schedule(); });
  container.parentElement.addEventListener('pointermove', event => { if (event.pointerType !== 'mouse' || stopped) return; const rect = container.getBoundingClientRect(); pointer = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)); });
  container.parentElement.addEventListener('pointerleave', () => { pointer = 0; });
  schedule();
  return { wave() { greeting = 0; schedule(); }, setReduced(value) { stopped = value || failed; if (stopped) reset(); else schedule(); } };
}
