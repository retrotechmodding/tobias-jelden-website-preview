const menuButton = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  nav?.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Menü öffnen');
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  });
});

document.querySelectorAll('.faq-item').forEach((item) => {
  const button = item.querySelector('button');
  const icon = item.querySelector('.faq-icon');
  button?.addEventListener('click', () => {
    const nextOpen = !item.classList.contains('is-open');
    item.classList.toggle('is-open', nextOpen);
    button.setAttribute('aria-expanded', String(nextOpen));
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
