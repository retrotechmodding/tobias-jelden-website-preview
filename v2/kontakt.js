(() => {
  const form = document.querySelector('#anfrage');
  const steps = [...form.querySelectorAll('[data-step]')];
  const error = document.querySelector('#form-error');
  const summary = document.querySelector('#summary');
  const method = document.querySelector('#rueckweg');
  const contact = document.querySelector('#rueckkontakt');
  const send = document.querySelector('#send-button');
  const status = document.querySelector('#send-status');
  const edit = document.querySelector('#edit-button');
  let step = 0, payload = null, previous = '', requestId = '', busy = false;
  form.hidden = false; form.noValidate = true;
  const selected = () => [...form.querySelectorAll('[name="anlage"]:checked')].map(el => el.value);
  const show = next => {
    step = next; error.textContent = '';
    steps.forEach((el, index) => { el.hidden = index !== step; });
    document.querySelector('#progress').textContent = `Schritt ${step + 1} von 3`;
    document.querySelector('#progress-bar').style.width = `${(step + 1) / 3 * 100}%`;
    document.querySelector(`#step-${step}-title`).focus();
  };
  const next = () => {
    if (step === 0 && !selected().length) { error.textContent = 'Bitte wählen Sie eine Anlage oder „Ich bin unsicher“.'; return; }
    if (step === 1 && !form.querySelector('[name="anlass"]:checked')) { error.textContent = 'Bitte wählen Sie ein Anliegen oder „Das möchte ich gemeinsam klären“.'; return; }
    show(Math.min(2, step + 1));
  };
  form.querySelectorAll('[data-next]').forEach(el => el.addEventListener('click', next));
  form.querySelectorAll('[data-back]').forEach(el => el.addEventListener('click', () => show(step - 1)));
  form.querySelectorAll('[name="anlage"]').forEach(input => input.addEventListener('change', () => {
    if (!input.checked) return;
    if (input.id === 'unsicher') form.querySelectorAll('[name="anlage"]:not(#unsicher)').forEach(el => { el.checked = false; });
    else document.querySelector('#unsicher').checked = false;
  }));
  contact.addEventListener('input', () => { error.textContent = ''; });
  method.addEventListener('change', () => {
    error.textContent = '';
    contact.value = ''; contact.disabled = !method.value; contact.required = !!method.value;
    document.querySelector('#kontaktfeld').hidden = !method.value;
    const email = method.value === 'email';
    contact.type = email ? 'email' : 'tel'; contact.autocomplete = email ? 'email' : 'tel';
    contact.inputMode = email ? 'email' : 'tel';
    document.querySelector('#kontakt-label').textContent = email ? 'Ihre E-Mail-Adresse' : 'Ihre Telefonnummer';
    contact.placeholder = email ? 'name@beispiel.de' : '+49 …';
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); if (step < 2) { next(); return; }
    const ort = document.querySelector('#ort');
    const fail = (text, field) => { error.textContent = text; field.focus(); };
    if (ort.value.trim().length < 2) { fail('Bitte geben Sie die PLZ oder den Ort des Objekts ein.', ort); return; }
    if (!method.value) { fail('Wie möchten Sie eine Rückmeldung erhalten?', method); return; }
    const value = contact.value.trim();
    if (method.value === 'email' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || !contact.checkValidity())) { fail('Bitte geben Sie eine gültige E-Mail-Adresse ein.', contact); return; }
    if (method.value === 'telefon' && (!/^[+\d\s()/.-]+$/.test(value) || value.replace(/\D/g, '').length < 6 || value.replace(/\D/g, '').length > 20)) { fail('Bitte geben Sie eine erreichbare Telefonnummer ein.', contact); return; }
    payload = {anlagen: selected(), anlass: form.querySelector('[name="anlass"]:checked').value, ort: ort.value.trim(), rueckweg: method.value, kontakt: value, name: document.querySelector('#name').value.trim(), termin: document.querySelector('#termin').value.trim(), nachricht: document.querySelector('#nachricht').value.trim(), website: document.querySelector('#website').value};
    const signature = JSON.stringify(payload);
    if (signature !== previous) { requestId = crypto.randomUUID(); previous = signature; }
    payload.request_id = requestId;
    const fields = [['Anlagen', payload.anlagen.join(', ')], ['Anliegen', payload.anlass], ['Objektstandort', payload.ort], ['Rückmeldung', method.value === 'email' ? 'Per E-Mail' : 'Telefonischer Rückruf'], ['Kontakt', value], ['Name', payload.name], ['Zeitraum', payload.termin], ['Weitere Angaben', payload.nachricht]];
    const list = document.querySelector('#summary-list'); list.replaceChildren();
    fields.filter(([,v]) => v).forEach(([label,v]) => { const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = v; row.append(dt,dd); list.append(row); });
    const configured = !!form.dataset.endpoint && (location.protocol === 'https:' || ['localhost','127.0.0.1'].includes(location.hostname));
    send.disabled = !configured; document.querySelector('#preview-note').hidden = configured;
    status.textContent = ''; form.hidden = true; summary.hidden = false; document.querySelector('#summary-title').focus();
  });
  edit.addEventListener('click', () => { if (busy) return; summary.hidden = true; form.hidden = false; show(2); });
  send.addEventListener('click', async () => {
    if (busy || !payload || !form.dataset.endpoint || send.disabled) return;
    busy = true; send.disabled = true; edit.disabled = true; status.textContent = 'Ihre Anfrage wird übermittelt …';
    try {
      const response = await fetch(form.dataset.endpoint, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit',signal:AbortSignal.timeout(20000)});
      const data = await response.json();
      if (!response.ok || data.status !== 'accepted') {
        if (data.status === 'uncertain') throw new Error('uncertain');
        status.textContent = data.status === 'rate_limit' ? 'Zu viele Versuche. Bitte versuchen Sie es später erneut.' : 'Die Anfrage konnte nicht übermittelt werden. Ihre Angaben bleiben erhalten. Bitte versuchen Sie es später erneut.';
        send.disabled = false; edit.disabled = false; busy = false; return;
      }
      status.textContent = 'Vielen Dank. Ihre Anfrage wurde vom Versanddienst angenommen. Tobias erhält Ihren gewünschten Rückmeldeweg mit den Angaben zur Prüfung.';
      send.textContent = 'Anfrage übermittelt'; payload = null;
    } catch {
      status.textContent = 'Der Übermittlungsstatus ist unklar. Bitte senden Sie nicht erneut, um eine doppelte Anfrage zu vermeiden. Klären Sie den Eingang bei info@sv-jelden.de.';
      // Keep retry disabled: a lost response does not prove a failed delivery.
    }
  });
})();
