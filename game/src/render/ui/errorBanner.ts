/** Алдааны товч мэдэгдэл (T-12): «Алдаа гарлаа. Тоглолтоо хадгаллаа» + «Файл татах». Тоглоомыг зогсоохгүй; нууц мэдээлэл үгүй. */
import { t } from '../../i18n/i18n';

let el: HTMLDivElement | null = null;

export function showErrorBanner(saved: boolean, onDownload: (() => void) | null, autoHideMs = 20_000): void {
  el?.remove();
  const d = document.createElement('div');
  d.className = 'errbanner';
  const span = document.createElement('span');
  span.textContent = t(saved ? 'err.banner' : 'err.banner_nosave');
  d.appendChild(span);
  if (onDownload) {
    const b = document.createElement('button');
    b.textContent = t('err.download');
    b.addEventListener('click', () => { try { onDownload(); } catch (e) { console.error(e); } });
    d.appendChild(b);
  }
  const x = document.createElement('button');
  x.textContent = '✕';
  x.setAttribute('aria-label', t('menu.back'));
  x.addEventListener('click', () => d.remove());
  d.appendChild(x);
  document.body.appendChild(d);
  el = d;
  setTimeout(() => d.remove(), autoHideMs);
}
