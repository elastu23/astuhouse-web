function handleAstuHouseMessage_(m) {
  const text = normalizeText_(m.text);
  const state = getConversationState_(m.from);

  if (state.stage === 'ASTU_CONFIRM_ALT') {
    const ans = normalizeText_(m.text);
    if (/^(si|sí|ok|dale|perfecto|me sirve|confirmo)$/.test(ans)) {
      const start = new Date(Number(state.suggestedVisitTime));
      setConversationState_(m.from, { stage: '' });
      scheduleAstuHouseVisit_(m, start, state.productName || 'Producto');
      return;
    }
    setConversationState_(m.from, { stage: 'ASTU_WAIT_VISIT_TIME' });
    sendWhatsAppText_(m.from, 'Perfecto, dime qué otra hora te sirve.');
    return;
  }

  if (state.stage === 'ASTU_WAIT_VISIT_TIME') {
    const dt = parseVisitDateTime_(m.text);
    if (!dt) {
      sendWhatsAppText_(m.from, 'Indícame la hora, por ejemplo: “hoy 4:30 pm” o “mañana 10:00 am”.');
      return;
    }
    scheduleAstuHouseVisit_(m, dt, state.productName || 'Producto');
    return;
  }

  if (/\b(ubicacion|direccion|donde queda|donde estan|ir a ver|puedo ver|quiero ver|pasar a ver)\b/.test(text)) {
    const cfg = getAstuHouseConfigMap_();
    setConversationState_(m.from, { stage: 'ASTU_WAIT_VISIT_TIME' });
    sendWhatsAppText_(m.from, 'Estamos en ' + (cfg['Ubicación pública'] || 'Cuenca') + '. ¿A qué hora te gustaría venir?');
    return;
  }

  const match = findAstuHouseProduct_(m.text);
  if (!match) {
    sendWhatsAppText_(m.from, 'Dime qué producto buscas y reviso stock y precio confirmado.');
    return;
  }

  if (match.multiple) {
    sendWhatsAppText_(m.from, 'Encontré varias opciones: ' + match.names.join(', ') + '. ¿Cuál te interesa?');
    return;
  }

  const p = match.product;
  setConversationState_(m.from, { productName: p.displayName, stage: '' });

  sendWhatsAppText_(m.from, 'Sí, está disponible. ' + p.displayName + '. ' +
    (p.condition ? p.condition + '. ' : '') + 'Precio: $' + p.price + '.');

  if (p.sendPhoto && p.photoId) {
    try {
      sendWhatsAppImage_(m.from, p.photoId, p.displayName + ' · $' + p.price);
    } catch (err) {
      console.error('Foto AstuHouse: ' + err);
    }
  }
}

function findAstuHouseProduct_(query) {
  const c = getConfig_();
  const sh = SpreadsheetApp.openById(c.astuHouseSheetId).getSheetByName('Inventario');
  const rows = sh.getDataRange().getDisplayValues();
  const q = normalizeText_(query);
  const qTokens = q.split(' ').filter(function(x){ return x.length > 1; });
  const candidates = [];

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    const stock = Number(String(r[5] || '0').replace(',', '.')) || 0;
    const active = normalizeText_(r[6]) === 'activo';
    const publicable = normalizeText_(r[14]) === 'si';
    if (!active || stock <= 0 || !publicable) continue;

    const display = [r[0], r[1], r[2]].filter(Boolean).join(' · ');
    const haystack = normalizeText_([r[0], r[1], r[2], r[8]].join(' '));
    let score = 0;
    for (let t = 0; t < qTokens.length; t++) {
      const tok = qTokens[t];
      if (haystack.indexOf(tok) >= 0) score += tok.length >= 5 ? 3 : 1;
    }
    if (score > 0) {
      candidates.push({
        score: score,
        product: {
          displayName: display,
          condition: r[3] || '',
          price: r[4] || '',
          photoId: r[10] || '',
          sendPhoto: normalizeText_(r[13]) === 'si'
        }
      });
    }
  }

  candidates.sort(function(a,b){ return b.score - a.score; });
  if (!candidates.length) return null;

  const top = candidates[0].score;
  const tied = candidates.filter(function(x){ return x.score === top; });
  if (tied.length > 1) {
    return { multiple: true, names: tied.slice(0, 3).map(function(x){ return x.product.displayName; }) };
  }
  return { multiple: false, product: candidates[0].product };
}

function parseVisitDateTime_(raw) {
  const s = normalizeText_(raw);
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (s.indexOf('manana') >= 0) d.setDate(d.getDate() + 1);

  const m = s.match(/\b(\d{1,2})(?:[:\.](\d{2}))?\s*(am|pm)?\b/);
  if (!m) return null;

  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3] || '';
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (!ap && h <= 10 && /tarde|noche/.test(s)) h += 12;

  d.setHours(h, min, 0, 0);
  return d;
}

function scheduleAstuHouseVisit_(m, start, productName) {
  const cfg = getAstuHouseConfigMap_();
  const h = start.getHours();
  const min = start.getMinutes();

  if (h < 7 || h > 22 || (h === 22 && min > 30)) {
    sendWhatsAppText_(m.from, 'Las visitas son de 7:00 a. m. a 10:30 p. m. ¿Qué hora dentro de ese rango te sirve?');
    return;
  }

  const end = new Date(start.getTime() + 15 * 60000);
  const cal = CalendarApp.getDefaultCalendar();
  const conflicts = cal.getEvents(start, end).filter(function(ev) {
    const title = normalizeText_(ev.getTitle());
    return title.indexOf('visita astuhouse') >= 0 || title.indexOf('no visitas') >= 0;
  });

  if (conflicts.length) {
    const alt = findNextAstuHouseSlot_(cal, start);
    if (!alt) {
      sendWhatsAppText_(m.from, 'Esa hora ya está tomada para una visita. Dime otra hora y la reviso.');
      return;
    }
    setConversationState_(m.from, { suggestedVisitTime: alt.getTime(), stage: 'ASTU_CONFIRM_ALT' });
    sendWhatsAppText_(m.from, 'Esa hora ya está tomada. La alternativa más cercana es ' +
      Utilities.formatDate(alt, Session.getScriptTimeZone(), 'HH:mm') + '. ¿Te sirve?');
    return;
  }

  const title = 'Visita AstuHouse · ' + productName + ' · ' + (m.name || 'Cliente');
  cal.createEvent(title, start, end, { location: cfg['Ubicación pública'] || '' });
  setConversationState_(m.from, { stage: '', productName: productName });
  sendWhatsAppText_(m.from, 'Listo, tu visita quedó agendada para ' +
    Utilities.formatDate(start, Session.getScriptTimeZone(), 'dd/MM HH:mm') + '.');
}

function findNextAstuHouseSlot_(cal, from) {
  for (let i = 1; i <= 12; i++) {
    const s = new Date(from.getTime() + i * 15 * 60000);
    if (s.getHours() > 22 || (s.getHours() === 22 && s.getMinutes() > 30)) break;
    const e = new Date(s.getTime() + 15 * 60000);
    const busy = cal.getEvents(s, e).some(function(ev) {
      const t = normalizeText_(ev.getTitle());
      return t.indexOf('visita astuhouse') >= 0 || t.indexOf('no visitas') >= 0;
    });
    if (!busy) return s;
  }
  return null;
}
