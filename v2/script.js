const menuButton = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');
const heroVideos = [...document.querySelectorAll('[data-hero-video]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const syncHeroMotion = () => {
  heroVideos.forEach((video) => {
    video.muted = true;
    if (reducedMotion.matches || document.hidden) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      // Das Poster bleibt als robuste Fallback-Ebene sichtbar.
    });
  });
};

syncHeroMotion();
reducedMotion.addEventListener?.('change', syncHeroMotion);
document.addEventListener('visibilitychange', syncHeroMotion);

const clipboardSection = document.querySelector('[data-clipboard-section]');
const clipboard = document.querySelector('[data-clipboard]');
const clipboardTrack = clipboardSection?.querySelector('.clipboard-track');
const clipboardItems = [...document.querySelectorAll('[data-clipboard-item]')];
const serviceCurrent = clipboard?.querySelector('[data-service-current]');
const serviceProgress = [...(clipboard?.querySelectorAll('.service-progress i') ?? [])];

const syncClipboardMotion = () => {
  if (!clipboardSection || !clipboard || !clipboardItems.length) return;

  if (reducedMotion.matches) {
    clipboardItems.forEach((item) => {
      item.classList.remove('is-active');
      item.classList.add('is-checked');
      item.style.removeProperty('--service-offset');
      item.style.removeProperty('--service-opacity');
    });
    if (serviceCurrent) serviceCurrent.textContent = '04';
    serviceProgress.forEach((bar) => bar.classList.remove('is-current'));
    return;
  }

  const rect = clipboardTrack?.getBoundingClientRect() ?? clipboardSection.getBoundingClientRect();
  const distance = Math.max(1, (clipboardTrack?.offsetHeight ?? clipboardSection.offsetHeight) - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -rect.top / distance));
  const timeline = progress * (clipboardItems.length * 2 - 1);
  const segment = Math.min(clipboardItems.length * 2 - 2, Math.floor(timeline));
  const segmentProgress = timeline - segment;
  const baseIndex = Math.floor(segment / 2);
  const transitionProgress = segmentProgress * segmentProgress * (3 - 2 * segmentProgress);
  const rawIndex = segment % 2 === 0 ? baseIndex : baseIndex + transitionProgress;
  const activeIndex = Math.min(clipboardItems.length - 1, Math.round(rawIndex));

  clipboardItems.forEach((item, index) => {
    const offset = index - rawIndex;
    const opacity = Math.max(0, 1 - Math.abs(offset));
    item.style.setProperty('--service-offset', offset.toFixed(3));
    item.style.setProperty('--service-opacity', opacity.toFixed(3));
    item.classList.toggle('is-active', index === activeIndex);
    item.classList.toggle('is-checked', index <= activeIndex);
  });
  const currentLabel = String(activeIndex + 1).padStart(2, '0');
  clipboard.dataset.currentService = currentLabel;
  if (serviceCurrent) serviceCurrent.textContent = currentLabel;
  serviceProgress.forEach((bar, index) => bar.classList.toggle('is-current', index === activeIndex));
};

if (clipboardSection && clipboard) {
  syncClipboardMotion();
  window.addEventListener('scroll', syncClipboardMotion, { passive: true });
  window.addEventListener('resize', syncClipboardMotion);
  reducedMotion.addEventListener?.('change', syncClipboardMotion);
}

const closeMenu = () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Menü öffnen');
  nav?.classList.remove('is-open');
  document.body.classList.remove('menu-open');
};

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  nav?.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

document.querySelectorAll('.faq-item').forEach((item) => {
  const button = item.querySelector('button');
  const icon = item.querySelector('.faq-icon');
  button?.addEventListener('click', () => {
    const nextOpen = !item.classList.contains('is-open');
    item.classList.toggle('is-open', nextOpen);
    button.setAttribute('aria-expanded', String(nextOpen));
    item.querySelector('.faq-answer')?.setAttribute('aria-hidden', String(!nextOpen));
    if (icon) icon.textContent = nextOpen ? '−' : '+';
  });
});

document.querySelectorAll('[data-legal]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector(`[data-dialog="${button.dataset.legal}"]`)?.showModal();
  });
});

document.querySelectorAll('[data-dialog-close]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog')?.close());
});

document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});
