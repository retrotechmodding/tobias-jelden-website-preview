const heroVideo = document.querySelector('[data-hero-video]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (heroVideo) {
  const prepareHeroVideo = () => {
    if (reducedMotion.matches) {
      heroVideo.pause();
      heroVideo.classList.remove('is-ready');
      return;
    }

    const revealVideo = () => heroVideo.classList.add('is-ready');
    if (heroVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) revealVideo();
    else heroVideo.addEventListener('loadeddata', revealVideo, { once: true });
    heroVideo.play().catch(() => {});
  };

  prepareHeroVideo();
  reducedMotion.addEventListener('change', prepareHeroVideo);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) heroVideo.pause();
    else if (!reducedMotion.matches) heroVideo.play().catch(() => {});
  });
}

const menuButton = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

menuButton?.addEventListener('click', () => {
  const nextOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(nextOpen));
  nav.classList.toggle('is-open', nextOpen);
  document.body.classList.toggle('menu-open', nextOpen);
});

nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  nav.classList.remove('is-open');
  document.body.classList.remove('menu-open');
}));

document.querySelectorAll('[data-accordion] button').forEach(button => {
  button.addEventListener('click', () => {
    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    document.querySelectorAll('[data-accordion] button').forEach(item => item.setAttribute('aria-expanded', 'false'));
    button.setAttribute('aria-expanded', String(willOpen));
  });
});

const contactDialog = document.querySelector('[data-contact-dialog]');
document.querySelectorAll('[data-contact-open]').forEach(button => button.addEventListener('click', () => contactDialog?.showModal()));
document.querySelector('[data-dialog-close]')?.addEventListener('click', () => contactDialog?.close());

const contactForm = document.querySelector('[data-contact-form]');
contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  contactForm.querySelector('[data-form-status]').textContent = 'Anfrage vorbereitet. Empfänger und Formular-Endpunkt werden vor dem Livegang ergänzt.';
});

const legalDialog = document.querySelector('[data-legal-dialog]');
const legalContent = document.querySelector('[data-legal-content]');
const legalCopy = {
  impressum: `<h2>Impressum</h2><div class="notice">Entwurfsstand: Anbieterangaben vor Veröffentlichung ergänzen.</div><p><strong>Tobias Jelden</strong><br>Sachverständiger Elektrotechnik</p><p>Anschrift, Telefon, E-Mail und gegebenenfalls berufsrechtliche Angaben müssen mit verifizierten Originaldaten ergänzt werden.</p>`,
  datenschutz: `<h2>Datenschutz</h2><div class="notice">Entwurfsstand: Diese Vorschau versendet keine Formulardaten.</div><p>Vor Veröffentlichung sind eine vollständige Datenschutzerklärung, Angaben zum Hosting und ein sicherer Formular-Endpunkt zu ergänzen.</p><p>Die Schrift wird in dieser Vorschau über Google Fonts geladen und sollte für den Livebetrieb lokal eingebunden werden.</p>`
};

document.querySelectorAll('[data-legal]').forEach(button => button.addEventListener('click', () => {
  legalContent.innerHTML = legalCopy[button.dataset.legal];
  legalDialog?.showModal();
}));
document.querySelector('[data-legal-close]')?.addEventListener('click', () => legalDialog?.close());

document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));

document.querySelector('[data-year]').textContent = new Date().getFullYear();
