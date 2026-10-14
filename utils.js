export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function validEmail(value) {
  return typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && !/[?&#%]/.test(value) ? value : null;
}
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}
export function safeImage(value) {
  if (typeof value !== 'string') return null;
  return safeUrl(value) || (/^(?:\.\/)?assets\/[\w/ .-]+\.(?:png|jpe?g|webp|avif|svg)$/i.test(value) ? value : null);
}
