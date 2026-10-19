import { portfolio } from './content.js';
import { initWordmark } from './wordmark.js';
import { initNatureScene } from './nature.js';
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
$('#intro-description').textContent = portfolio.intro;
$('#about-description').textContent = portfolio.about;
$('#about-note').textContent = portfolio.aboutNote;
$('#about-note').hidden = !portfolio.aboutNote;
$('#contact-description').textContent = portfolio.contactIntro;
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
initWordmark($('.wordmark'));
if (!worksPage) {
  initNatureScene($('.nature-scene'));
  initScrollWave($('#intro-title'));
}
const naturePhoto = $('.nature-photo');
function landscapeFallback() { $('.nature-scene').classList.add('image-unavailable'); }
naturePhoto.addEventListener('error', landscapeFallback, { once: true });
if (naturePhoto.complete && !naturePhoto.naturalWidth) landscapeFallback();
const photoSource = safeUrl(portfolio.naturePhoto?.sourceUrl);
if (photoSource) {
  const credit = $('#photo-credit');
  credit.href = photoSource;
  credit.textContent = `Фото: ${portfolio.naturePhoto.photographer || 'джерело'} ↗`;
  credit.target = '_blank';
  credit.rel = 'noopener noreferrer';
  credit.hidden = false;
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
  const veil = sealed ? '<span class="project-veil" aria-hidden="true"><span class="veil-eye"><svg viewBox="0 0 32 32" fill="none"><path d="M3 16s4.5-8 13-8 13 8 13 8-4.5 8-13 8S3 16 3 16Z" stroke="currentColor"/><circle cx="16" cy="16" r="4" stroke="currentColor"/></svg></span><span class="veil-title">За цим — цілий сайт.</span><span class="veil-action">Натисніть, щоб побачити <b>↗</b></span></span>' : '';
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
const selectedCategory = normalizeCategory(new URLSearchParams(location.search).get('category'), categories);
const selectedCategoryData = categories.find(category => category.id === selectedCategory);
function renderProjects(root, entries) {
  root.innerHTML = entries.length ? entries.map(project => {
    const index = projects.indexOf(project);
    return `<article class="project-card reveal is-sealed" data-card="${index}"><button class="project-open" data-project="${index}" aria-label="Показати прев’ю: ${esc(project.title)}">${preview(project, index, '', true)}<div class="project-meta"><div><h3>${esc(project.title)}</h3><p class="project-description">${esc(project.shortDescription || project.description)}</p></div><span class="project-arrow" aria-hidden="true">↗</span></div></button><div class="project-footer"><span>${esc(project.category || '')}</span><div class="project-actions"><button class="text-link project-details" data-project="${index}" hidden>Деталі <span aria-hidden="true">↗</span></button>${externalLink(project.liveUrl, 'Відкрити сайт')}</div></div></article>`;
  }).join('') : '<div class="gallery-empty" role="status"><span class="gallery-empty-icon" aria-hidden="true">↗</span><h2>Нові роботи — незабаром.</h2><p>Цей розділ ще поповнюється. А поки перегляньте інші напрями.</p><a class="text-link" href="/works">Усі роботи <span aria-hidden="true">↗</span></a></div>';
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
  return `<li><a class="directory-option" href="${esc(categoryUrl(category.id))}" aria-label="${esc(category.title)} — ${count ? `проєктів: ${count}` : 'незабаром'}"><span class="directory-number" aria-hidden="true">0${index + 1}</span><span><span class="directory-label">${esc(category.title)}</span><span class="directory-description">${esc(category.description)}</span></span><span class="directory-count">${count ? String(count).padStart(2, '0') : 'НЕЗАБАРОМ'}</span><span class="directory-arrow" aria-hidden="true">↗</span></a></li>`;
}).join('');
initWorkDirectory($('#work-directory'));

const email = validEmail(portfolio.contacts.email);
let contactHtml = email ? `<a class="text-link" href="mailto:${encodeURIComponent(email)}">${esc(email)} <span aria-hidden="true">↗</span></a><button class="copy-button" id="copy-email">Скопіювати email <span aria-hidden="true">⧉</span></button>` : '';
contactHtml += externalLink(portfolio.contacts.telegram, portfolio.contacts.telegramLabel || 'Telegram');
contactHtml += (portfolio.contacts.links || []).map(link => externalLink(link.url, link.label || link.name || 'Посилання')).join('');
$('#contact-methods').innerHTML = contactHtml || '<p class="contact-placeholder">Контакти з’являться незабаром.<span>Прямі посилання ще не додані.</span></p>';
const channel = portfolio.channel;
if (safeUrl(channel.url)) $('#channel-link').innerHTML = externalLink(channel.url, channel.name || 'Мій канал');
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
  $('#dialog-content').innerHTML = `<span class="dialog-tag">${esc(project.placeholder ? 'Матеріали проєкту готуються' : project.category)}</span><h2 id="dialog-title">${esc(project.title)}</h2>${preview(project, index, 'dialog-preview')}<p>${esc(project.description)}</p>${project.role ? `<p><strong>Мій внесок:</strong> ${esc(project.role)}</p>` : ''}${project.details ? `<p>${esc(project.details)}</p>` : ''}<div class="dialog-links">${externalLink(project.liveUrl, 'Переглянути сайт', 'button button-light')}${externalLink(project.sourceUrl, 'Вихідний код')}</div><div class="dialog-gallery">${(project.screenshots || []).map((shot, i) => { const src = safeImage(typeof shot === 'string' ? shot : shot?.src); const normalized = src?.match(/^(?:\.\/)?assets\//) ? '/' + src.replace(/^\.\//, '') : src; return src ? `<img src="${esc(normalized)}" alt="${esc(shot?.alt || `${project.title} — екран ${i + 1}`)}" loading="lazy">` : ''; }).join('')}</div>`;
  handleMissingImages($('#dialog-content'));
  document.body.style.overflow = 'hidden';
  dialog.showModal();
  dialog.scrollTop = 0;
  $('.dialog-close').focus();
}
$('#all-projects').addEventListener('click', openProject);
initRevealMotion();
initLetterInteractions();
