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
const clipboardItems = [...document.querySelectorAll('[data-clipboard-item]')];
const compactClipboard = window.matchMedia('(max-width: 1100px)');

const syncClipboardMotion = () => {
  if (!clipboardSection || !clipboard || !clipboardItems.length) return;

  if (reducedMotion.matches || compactClipboard.matches) {
    clipboard.style.removeProperty('--clipboard-rotate');
    clipboard.style.removeProperty('--clipboard-lift');
    clipboardItems.forEach((item) => {
      item.classList.remove('is-active');
      item.classList.add('is-checked');
    });
    return;
  }

  const rect = clipboardSection.getBoundingClientRect();
  const distance = Math.max(1, clipboardSection.offsetHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -rect.top / distance));
  const rotation = -2.4 + progress * 4.8 + Math.sin(progress * Math.PI * 4) * 0.45;
  const lift = Math.sin(progress * Math.PI) * -10;
  const activeIndex = Math.min(clipboardItems.length - 1, Math.floor(progress * clipboardItems.length));

  clipboard.style.setProperty('--clipboard-rotate', `${rotation.toFixed(2)}deg`);
  clipboard.style.setProperty('--clipboard-lift', `${lift.toFixed(1)}px`);
  clipboardItems.forEach((item, index) => {
    item.classList.toggle('is-active', index === activeIndex);
    item.classList.toggle('is-checked', index <= activeIndex);
  });
};

if (clipboardSection && clipboard) {
  syncClipboardMotion();
  window.addEventListener('scroll', syncClipboardMotion, { passive: true });
  window.addEventListener('resize', syncClipboardMotion);
  reducedMotion.addEventListener?.('change', syncClipboardMotion);
  compactClipboard.addEventListener?.('change', syncClipboardMotion);
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
