const menuButton = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

menuButton?.addEventListener('click', () => {
  const nextOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(nextOpen));
  nav?.classList.toggle('is-open', nextOpen);
  document.body.classList.toggle('menu-open', nextOpen);
});

nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  nav?.classList.remove('is-open');
  document.body.classList.remove('menu-open');
}));

document.querySelectorAll('[data-accordion] button').forEach(button => {
  button.addEventListener('click', () => {
    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    document.querySelectorAll('[data-accordion] button').forEach(item => {
      item.setAttribute('aria-expanded', 'false');
      const icon = item.querySelector('i');
      if (icon) icon.textContent = '+';
    });
    button.setAttribute('aria-expanded', String(willOpen));
    const icon = button.querySelector('i');
    if (icon) icon.textContent = willOpen ? '×' : '+';
  });
});

const legalDialog = document.querySelector('[data-legal-dialog]');
const legalContent = document.querySelector('[data-legal-content]');
const legalCopy = {
  impressum: `<h2>Impressum</h2><div class="notice">Designvorschau: Berufsrechtliche Pflichtangaben vor Live-Veröffentlichung vollständig prüfen und ergänzen.</div><p><strong>Tobias Jelden</strong><br>Prüfsachverständiger – Fachrichtung Elektrotechnik (NRW)<br>Brehmstraße 3<br>40239 Düsseldorf</p><p>Telefon: +49 160 794 00 38<br>E-Mail: info@sv-jelden.de</p>`,
  datenschutz: `<h2>Datenschutz</h2><div class="notice">Designvorschau: Diese Seite enthält kein aktives Kontaktformular und speichert keine eingegebenen Formulardaten.</div><p>Vor einer Live-Veröffentlichung sind Hosting, Serverprotokolle, eingebundene Dienste und vollständige Informationspflichten in einer geprüften Datenschutzerklärung abzubilden.</p>`
};

document.querySelectorAll('[data-legal]').forEach(button => button.addEventListener('click', () => {
  if (legalContent) legalContent.innerHTML = legalCopy[button.dataset.legal];
  legalDialog?.showModal();
}));

document.querySelector('[data-legal-close]')?.addEventListener('click', () => legalDialog?.close());
legalDialog?.addEventListener('click', event => {
  if (event.target === legalDialog) legalDialog.close();
});

document.querySelector('[data-year]').textContent = new Date().getFullYear();
