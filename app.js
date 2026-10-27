import { portfolio } from './content.js';
import { initScrollWave } from './wave.js';
import { initRevealMotion } from './motion.js';
import { initLetterInteractions } from './letters.js';
import { normalizeCategory, filterProjects, categoryUrl, initWorkDirectory } from './work-directory.js';
import { safeUrl, validEmail, escapeHtml as esc, safeImage } from './utils.js';

const $ = selector => document.querySelector(selector);
const worksPage = /^\/works\/?$/.test(location.pathname);
document.body.classList.toggle('gallery-route', worksPage);
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
$('#home-page').hidden = worksPage;
$('#works-page').hidden = !worksPage;
if (worksPage) $('[data-nav-works]').setAttribute('aria-current', 'page');
document.title = `${worksPage ? 'Усі роботи' : 'Створення сайтів та портфоліо'} — ${portfolio.name}`;
document.querySelector('meta[property="og:title"]').content = document.title;
document.querySelectorAll('.identity-name').forEach(element => { element.textContent = portfolio.name; });
$('#intro-title').innerHTML = portfolio.headline.split('\n').map((line, index) => index ? `<em>${esc(line)}</em>` : esc(line)).join('<br>');
$('#about-description').textContent = portfolio.about;
$('#portrait-image').alt = `Ілюстрований портрет ${portfolio.name}`;
const portraitImage = $('#portrait-image');
function showPortraitFallback() {
  if (!portraitImage.isConnected) return;
  const placeholder = document.createElement('span');
  placeholder.className = 'portrait-fallback';
  placeholder.setAttribute('role', 'img');
  placeholder.textContent = 'S';
  placeholder.setAttribute('aria-label', 'Портрет тимчасово недоступний');
  portraitImage.replaceWith(placeholder);
}
portraitImage.addEventListener('error', showPortraitFallback, { once: true });
if (portraitImage.complete && !portraitImage.naturalWidth) showPortraitFallback();
if (!worksPage) {
  initScrollWave($('#intro-title'));
}

function externalLink(url, label, className = 'text-link') {
  const valid = safeUrl(url);
  return valid ? `<a class="${className}" href="${esc(valid)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>` : '';
}
function placeholderPreview(index, missing = false) {
  return `<div class="preview-placeholder" aria-label="${missing ? 'Зображення недоступне' : 'Заглушка — матеріали проєкту ще не додані'}"><div class="placeholder-top"><span>${missing ? 'ЗОБРАЖЕННЯ НЕДОСТУПНЕ' : 'ПРОЄКТ У ПІДГОТОВЦІ'}</span><span>${String(index + 1).padStart(2, '0')}</span></div><span class="placeholder-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="placeholder-type" aria-hidden="true">${index % 2 ? 'Увага<br>до деталей.' : 'Форма.<br>Сенс.'}</span><span class="placeholder-bottom">${missing ? 'Спробуйте переглянути пізніше' : 'Матеріали готуються · Заглушка'}</span></div>`;
}
function preview(project, index, extra = '', sealed = false) {
  const src = safeImage(project.cover);
  const normalized = src?.match(/^(?:\.\/)?assets\//) ? '/' + src.replace(/^\.\//, '') : src;
  const veil = sealed ? '<span class="project-veil" aria-hidden="true"><span class="veil-action">Показати прев’ю <b>↗</b></span></span>' : '';
  return `<div class="project-preview preview-${index % 2 + 1} ${extra}">${src ? `<img src="${esc(normalized)}" alt="${esc(project.title)} — вигляд проєкту" width="950" height="500" loading="lazy">` : placeholderPreview(index)}${veil}</div>`;
}
function handleMissingImages(root) {
  root.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    const box = img.closest('.project-preview');
    if (box) { img.insertAdjacentHTML('beforebegin', placeholderPreview(0, true)); img.remove(); }
    else { const message = document.createElement('p'); message.textContent = 'Зображення тимчасово недоступне.'; img.replaceWith(message); }
  }, { once: true }));
}
const projects = portfolio.projects || [];
const categories = portfolio.workCategories || [];
const previewRail = $('.hero-preview-rail');
const previewTrack = previewRail.querySelector('.preview-track');
function heroPreview(project, index, copy = false) {
  const src = safeImage(project.cover);
  const image = src ? '/' + src.replace(/^\.?\//, '') : '';
  return `<figure class="hero-preview">${image ? `<img src="${esc(image)}" alt="${copy ? '' : esc(project.title + ' — вигляд сайту')}" width="1440" height="745" decoding="async" loading="lazy">` : placeholderPreview(index)}<figcaption class="preview-caption"><span>${esc(project.title)}</span><span>${esc(project.category)}</span></figcaption></figure>`;
}
previewTrack.innerHTML = `<div class="preview-group">${projects.map((project, index) => heroPreview(project, index)).join('')}</div><div class="preview-group" aria-hidden="true">${projects.map((project, index) => heroPreview(project, index, true)).join('')}</div>`;
const selectedCategory = normalizeCategory(new URLSearchParams(location.search).get('category'), categories);
const selectedCategoryData = categories.find(category => category.id === selectedCategory);
function renderProjects(root, entries) {
  root.innerHTML = entries.length ? entries.map(project => {
    const index = projects.indexOf(project);
    return `<article class="project-card reveal is-sealed" data-card="${index}"><button class="project-open" data-project="${index}" aria-label="Показати прев’ю: ${esc(project.title)}">${preview(project, index, '', true)}<div class="project-meta"><h3>${esc(project.title)}</h3><span class="project-arrow" aria-hidden="true">↗</span></div></button><div class="project-footer"><span>${esc(project.category || '')}</span><div class="project-actions"><button class="text-link project-details" data-project="${index}" hidden>Деталі <span aria-hidden="true">↗</span></button>${externalLink(project.liveUrl, 'Відкрити сайт')}</div></div></article>`;
  }).join('') : '<div class="gallery-empty" role="status"><h2>Поки що порожньо.</h2><a class="text-link" href="/works">Усі роботи <span aria-hidden="true">↗</span></a></div>';
  handleMissingImages(root);
}
const filteredProjects = filterProjects(projects, categories, selectedCategory);
renderProjects($('#all-projects'), filteredProjects);
$('#gallery-note').textContent = `Проєктів: ${filteredProjects.length}`;
$('#gallery-category').textContent = selectedCategoryData?.title || 'Усі напрями';
if (worksPage && selectedCategoryData) {
  document.title = `${selectedCategoryData.title} — роботи ${portfolio.name}`;
  document.querySelector('meta[property="og:title"]').content = document.title;
}
$('#work-filters').innerHTML = [{ id: 'all', title: 'Усі роботи' }, ...categories].map(category => `<a class="work-filter" href="${esc(categoryUrl(category.id))}"${category.id === selectedCategory ? ' aria-current="true"' : ''}>${esc(category.title)}</a>`).join('');
$('#directory-list').innerHTML = categories.map((category, index) => {
  const count = filterProjects(projects, categories, category.id).length;
  return `<li><a class="directory-option" href="${esc(categoryUrl(category.id))}" aria-label="${esc(category.title)} — ${count ? `проєктів: ${count}` : 'незабаром'}"><span class="directory-label">${esc(category.title)}</span><span class="directory-count">${String(count).padStart(2, '0')}</span><span class="directory-arrow" aria-hidden="true">↗</span></a></li>`;
}).join('');
initWorkDirectory($('#work-directory'));

const email = validEmail(portfolio.contacts.email);
let contactHtml = email ? `<a class="text-link" href="mailto:${encodeURIComponent(email)}">${esc(email)} <span aria-hidden="true">↗</span></a><button class="copy-button" id="copy-email">Скопіювати email <span aria-hidden="true">⧉</span></button>` : '';
contactHtml += externalLink(portfolio.contacts.telegram, portfolio.contacts.telegramLabel || 'Telegram');
contactHtml += (portfolio.contacts.links || []).map(link => externalLink(link.url, link.label || link.name || 'Посилання')).join('');
$('#contact-methods').innerHTML = contactHtml || '<p class="contact-placeholder">Контакти з’являться незабаром.<span>Прямі посилання ще не додані.</span></p>';
const channel = portfolio.channel;
if (safeUrl(channel.url)) $('#channel-link').innerHTML = externalLink(channel.url, 'Мій канал');
let toastTimer;
function notify(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200); }
$('#copy-email')?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(email); notify('Email скопійовано'); }
  catch { notify('Не вдалося скопіювати. Виділіть і скопіюйте адресу вручну.'); }
});

const dialog = $('#project-dialog');
let trigger, closeTimer;
function closeDialog() {
  if (!dialog.open || dialog.classList.contains('closing')) return;
  if (motionQuery.matches) dialog.close();
  else { dialog.classList.add('closing'); closeTimer = setTimeout(() => dialog.close(), 180); }
}
dialog.addEventListener('close', () => { clearTimeout(closeTimer); dialog.classList.remove('closing'); document.body.style.overflow = ''; trigger?.focus({ preventScroll: true }); });
$('.dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [...dialog.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length);
  const first = focusable[0], last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
});
function openProject(event) {
  const button = event.target.closest('[data-project]');
  if (!button) return;
  const index = Number(button.dataset.project), project = projects[index];
  const card = button.closest('.project-card');
  if (card?.classList.contains('is-sealed')) {
    document.querySelectorAll('[data-card="' + index + '"]').forEach(item => {
      item.classList.remove('is-sealed');
      item.classList.add('is-revealed');
      item.querySelector('.project-open').setAttribute('aria-label', 'Відкрити деталі: ' + project.title);
      item.querySelector('.project-details').hidden = false;
    });
    return;
  }
  trigger = button;
  $('#dialog-content').innerHTML = `<span class="dialog-tag">${esc(project.placeholder ? 'Матеріали проєкту готуються' : project.category)}</span><h2 id="dialog-title">${esc(project.title)}</h2>${preview(project, index, 'dialog-preview')}<p>${esc(project.description)}</p>${project.role ? `<p><strong>Мій внесок:</strong> ${esc(project.role)}</p>` : ''}<div class="dialog-links">${externalLink(project.liveUrl, 'Переглянути сайт', 'button button-light')}${externalLink(project.sourceUrl, 'Вихідний код')}</div><div class="dialog-gallery">${(project.screenshots || []).map((shot, i) => { const src = safeImage(typeof shot === 'string' ? shot : shot?.src); const normalized = src?.match(/^(?:\.\/)?assets\//) ? '/' + src.replace(/^\.\//, '') : src; return src ? `<img src="${esc(normalized)}" alt="${esc(shot?.alt || `${project.title} — екран ${i + 1}`)}" loading="lazy">` : ''; }).join('')}</div>`;
  handleMissingImages($('#dialog-content'));
  document.body.style.overflow = 'hidden';
  dialog.showModal();
  dialog.scrollTop = 0;
  $('.dialog-close').focus();
}
$('#all-projects').addEventListener('click', openProject);
initRevealMotion();
initLetterInteractions();
