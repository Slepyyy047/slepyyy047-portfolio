export function normalizeCategory(value, categories) {
  return categories.some(category => category.id === value) ? value : 'all';
}

export function filterProjects(projects, categories, value) {
  const selected = normalizeCategory(value, categories);
  if (selected === 'all') return [...projects];
  return projects.filter(project => {
    const category = normalizeCategory(project.categoryId, categories);
    return (category === 'all' ? 'other' : category) === selected;
  });
}

export function categoryUrl(id) {
  return id === 'all' ? '/works' : `/works?category=${encodeURIComponent(id)}`;
}

/** Native modal provides Escape, background inertness and keyboard containment. */
export function initWorkDirectory(dialog, root = document) {
  if (!dialog) return;
  let trigger;
  let previousOverflow = '';
  root.querySelectorAll('[data-open-directory]').forEach(button => {
    button.addEventListener('click', () => {
      if (dialog.open) return;
      trigger = button;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
      dialog.scrollTop = 0;
      dialog.querySelector('.directory-close').focus();
    });
  });
  dialog.querySelector('.directory-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    trigger?.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.querySelector('.directory-shell').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
