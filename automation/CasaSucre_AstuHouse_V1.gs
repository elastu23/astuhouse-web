/*
 CASA SUCRE + ASTUHOUSE · BACKEND WHATSAPP V1
 Generado para Google Apps Script.
 No contiene tokens ni credenciales Meta.
*/
/* ===== SETUP BASE ===== */
function setupBaseConfig_() {
  PropertiesService.getScriptProperties().setProperties({
    ASTUHOUSE_SHEET_ID: '1Gr9XUyXNA6m-QCUpjRdD2mCuyHuJa12KdI1q8PVzDBs',
    CASA_SUCRE_MASTER_SHEET_ID: '1b-K9vw7e4Ogw3jIVgykshe4mWVUj3pMLKY9dctAfeV0',
    CASA_SUCRE_AVAILABILITY_SHEET_ID: '1loqF6s7X-DjbzOjdB3dRtG-c7RoWq2sSg25KmHeaCII',
    GOOGLE_CALENDAR_ID: 'primary'
  }, false);
  return getSetupStatus_();
}

function getSetupStatus_() {
  const c = getConfig_();
  return {
    astuHouseSheet: !!c.astuHouseSheetId,
    casaSucreMaster: !!c.casaSucreMasterSheetId,
    casaSucreAvailability: !!c.casaSucreAvailabilitySheetId,
    calendar: c.calendarId || 'primary',
    metaVerifyToken: !!c.metaVerifyToken,
    metaAccessToken: !!c.metaAccessToken,
    metaPhoneNumberId: !!c.metaPhoneNumberId,
    metaGraphVersion: c.metaGraphVersion || ''
  };
}

/* ===== automation/Config.gs ===== */
function getConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    metaVerifyToken: p.getProperty('META_VERIFY_TOKEN') || '',
    metaAccessToken: p.getProperty('META_ACCESS_TOKEN') || '',
    metaPhoneNumberId: p.getProperty('META_PHONE_NUMBER_ID') || '',
    metaGraphVersion: p.getProperty('META_GRAPH_VERSION') || '',
    astuHouseSheetId: p.getProperty('ASTUHOUSE_SHEET_ID') || '',
    casaSucreMasterSheetId: p.getProperty('CASA_SUCRE_MASTER_SHEET_ID') || '',
    casaSucreAvailabilitySheetId: p.getProperty('CASA_SUCRE_AVAILABILITY_SHEET_ID') || '',
    calendarId: p.getProperty('GOOGLE_CALENDAR_ID') || 'primary'
  };
}

function normalizeText_(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function getAstuHouseConfigMap_() {
  const c = getConfig_();
  const sh = SpreadsheetApp.openById(c.astuHouseSheetId).getSheetByName('Configuracion');
  const values = sh.getDataRange().getDisplayValues();
  const out = {};
  for (let i = 2; i < values.length; i++) {
    const key = String(values[i][0] || '').trim();
    if (key) out[key] = String(values[i][1] || '').trim();
  }
  return out;
}


/* ===== automation/MetaApi.gs ===== */
function metaUrl_(resource) {
  const c = getConfig_();
  if (!c.metaGraphVersion) throw new Error('Configura META_GRAPH_VERSION en Script Properties.');
  if (!c.metaPhoneNumberId || !c.metaAccessToken) throw new Error('Meta API no configurada.');
  return 'https://graph.facebook.com/' + c.metaGraphVersion + '/' + resource;
}

function sendWhatsAppText_(to, body) {
  const c = getConfig_();
  const res = UrlFetchApp.fetch(metaUrl_(c.metaPhoneNumberId + '/messages'), {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + c.metaAccessToken },
    payload: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: String(to),
      type: 'text',
      text: { preview_url: false, body: String(body) }
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error('WhatsApp text error: ' + res.getContentText());
  return res;
}

function uploadDriveImageToWhatsApp_(driveFileId) {
  const c = getConfig_();
  const blob = DriveApp.getFileById(driveFileId).getBlob();
  const res = UrlFetchApp.fetch(metaUrl_(c.metaPhoneNumberId + '/media'), {
    method: 'post',
    headers: { Authorization: 'Bearer ' + c.metaAccessToken },
    payload: { messaging_product: 'whatsapp', file: blob },
    muteHttpExceptions: true
  });
  const parsed = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300 || !parsed.id) throw new Error('WhatsApp media error: ' + res.getContentText());
  return parsed.id;
}

function sendWhatsAppImage_(to, driveFileId, caption) {
  const c = getConfig_();
  const mediaId = uploadDriveImageToWhatsApp_(driveFileId);
  const res = UrlFetchApp.fetch(metaUrl_(c.metaPhoneNumberId + '/messages'), {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + c.metaAccessToken },
    payload: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: String(to),
      type: 'image',
      image: { id: mediaId, caption: String(caption || '') }
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error('WhatsApp image error: ' + res.getContentText());
  return res;
}


/* ===== automation/Webhook.gs ===== */
function doGet(e) {
  const c = getConfig_();
  const p = e && e.parameter ? e.parameter : {};
  const mode = p['hub.mode'] || '';
  const token = p['hub.verify_token'] || '';
  const challenge = p['hub.challenge'] || '';
  if (mode === 'subscribe' && token && token === c.metaVerifyToken) {
    return ContentService.createTextOutput(challenge);
  }
  return ContentService.createTextOutput('verification_failed');
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const incoming = extractIncomingMessages_(payload);
    for (let i = 0; i < incoming.length; i++) {
      const m = incoming[i];
      if (!isDuplicateMessage_(m.id)) handleIncomingMessage_(m);
    }
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
  }
  return ContentService.createTextOutput('EVENT_RECEIVED');
}

function extractIncomingMessages_(payload) {
  const out = [];
  const entries = payload.entry || [];
  for (let i = 0; i < entries.length; i++) {
    const changes = entries[i].changes || [];
    for (let j = 0; j < changes.length; j++) {
      const value = changes[j].value || {};
      const profileName = value.contacts && value.contacts[0] && value.contacts[0].profile
        ? (value.contacts[0].profile.name || '') : '';
      const messages = value.messages || [];
      for (let k = 0; k < messages.length; k++) {
        const msg = messages[k];
        let text = '';
        if (msg.type === 'text' && msg.text) text = msg.text.body || '';
        if (msg.type === 'button' && msg.button) text = msg.button.text || '';
        if (msg.type === 'interactive' && msg.interactive) {
          text = (msg.interactive.button_reply && msg.interactive.button_reply.title) ||
                 (msg.interactive.list_reply && msg.interactive.list_reply.title) || '';
        }
        out.push({
          id: msg.id || '',
          from: msg.from || '',
          type: msg.type || '',
          text: text,
          name: profileName,
          timestamp: msg.timestamp || ''
        });
      }
    }
  }
  return out;
}

function isDuplicateMessage_(id) {
  if (!id) return false;
  const cache = CacheService.getScriptCache();
  const key = 'wa_msg_' + id;
  if (cache.get(key)) return true;
  cache.put(key, '1', 21600);
  return false;
}


/* ===== automation/Router.gs ===== */
function handleIncomingMessage_(m) {
  if (!m.from) return;
  const text = String(m.text || '').trim();

  if (!text) {
    sendWhatsAppText_(m.from, 'Por ahora puedo ayudarte mejor con mensajes de texto. ¿Qué necesitas?');
    return;
  }

  const session = getConversationState_(m.from);
  const business = classifyBusiness_(text, session.business || '');

  if (!business) {
    setConversationState_(m.from, { business: '', stage: 'ASK_BUSINESS' });
    sendWhatsAppText_(m.from, '¿Tu consulta es sobre Casa Sucre o AstuHouse?');
    return;
  }

  setConversationState_(m.from, { business: business });
  if (business === 'ASTUHOUSE') {
    handleAstuHouseMessage_(m);
    return;
  }
  if (business === 'CASA_SUCRE') {
    handleCasaSucreMessage_(m);
    return;
  }
}

function classifyBusiness_(text, previous) {
  const t = normalizeText_(text);

  if (/\b(casa sucre|hospedaje|hospedar|airbnb|departamento|habitacion|check in|check out|reserva|reservar|parqueadero|mascota|leonor|sandro)\b/.test(t)) {
    return 'CASA_SUCRE';
  }

  if (/\b(astuhouse|iphone|playstation|ps5|ps4|nintendo|switch|macbook|laptop|watch|airpods|gopro|ray ban|rayban|cable|juego|control|gafas)\b/.test(t)) {
    return 'ASTUHOUSE';
  }

  if (previous === 'ASTUHOUSE' || previous === 'CASA_SUCRE') return previous;
  return '';
}

function getConversationState_(phone) {
  const raw = CacheService.getScriptCache().get('state_' + phone);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function setConversationState_(phone, patch) {
  const current = getConversationState_(phone);
  const keys = Object.keys(patch || {});
  for (let i = 0; i < keys.length; i++) current[keys[i]] = patch[keys[i]];
  CacheService.getScriptCache().put('state_' + phone, JSON.stringify(current), 21600);
  return current;
}


/* ===== automation/AstuHouse.gs ===== */
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

  const m = s.match(/\b(\d{1,2})(?:(?:[:\.\s])(\d{2}))?\s*(am|pm)?\b/);
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


/* ===== automation/CasaSucre.gs ===== */
function handleCasaSucreMessage_(m) {
  const dates = extractStayDates_(m.text);
  if (!dates) {
    sendWhatsAppText_(m.from, 'Claro. Indícame fecha de entrada y salida, por ejemplo: “del 10/10 al 12/10”, y cuántas personas son.');
    return;
  }

  const guests = extractGuests_(m.text) || 1;
  const availability = casaSucreAvailability_(dates.checkIn, dates.checkOut);

  if (!availability.length) {
    sendWhatsAppText_(m.from, 'Para esas fechas no tengo disponibilidad confirmada en Leonor ni Sandro.');
    logCasaSucreLead_(m, dates, guests, '', 'Sin disponibilidad');
    return;
  }

  const quote = casaSucreQuote_(guests, dates.checkIn, dates.checkOut, m.text);
  const options = availability.join(' y ');
  let msg = 'Sí tengo disponibilidad en ' + options + '. ';
  msg += guests + (guests === 1 ? ' huésped' : ' huéspedes') + ': $' + quote.total +
    ' por ' + quote.nights + (quote.nights === 1 ? ' noche' : ' noches') + '.';

  if (quote.parking) msg += ' Parqueadero: $' + quote.parking + '.';
  if (quote.pet) msg += ' Mascota: $' + quote.pet + '.';
  msg += ' Si quieres reservar, te ayudo a continuar por aquí.';

  sendWhatsAppText_(m.from, msg);
  logCasaSucreLead_(m, dates, guests, availability.join('/'), 'Cotización enviada');
}

function extractStayDates_(raw) {
  const s = String(raw || '');
  const all = [];
  const re = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/g;
  let x;

  while ((x = re.exec(s)) !== null) {
    let y = x[3] ? Number(x[3]) : new Date().getFullYear();
    if (y < 100) y += 2000;
    all.push(new Date(y, Number(x[2]) - 1, Number(x[1])));
  }

  if (all.length < 2) return null;
  if (all[1] <= all[0]) return null;
  return { checkIn: all[0], checkOut: all[1] };
}

function extractGuests_(raw) {
  const s = normalizeText_(raw);
  let m = s.match(/\b(\d+)\s*(huesped|huespedes|persona|personas|adulto|adultos)\b/);
  if (m) return Math.min(5, Math.max(1, Number(m[1])));

  m = s.match(/\bsomos\s+(\d+)\b/);
  if (m) return Math.min(5, Math.max(1, Number(m[1])));

  return null;
}

function casaSucreAvailability_(checkIn, checkOut) {
  const c = getConfig_();
  const sh = SpreadsheetApp.openById(c.casaSucreAvailabilitySheetId).getSheetByName('Disponibilidad');
  const rows = sh.getDataRange().getValues();
  const occupied = { Leonor: false, Sandro: false };

  for (let i = 3; i < rows.length; i++) {
    const dep = String(rows[i][0] || '');
    if (!Object.prototype.hasOwnProperty.call(occupied, dep)) continue;

    const ci = parseSheetDate_(rows[i][1]);
    const co = parseSheetDate_(rows[i][2]);
    if (!ci || !co) continue;

    if (checkIn < co && checkOut > ci) occupied[dep] = true;
  }

  return ['Leonor', 'Sandro'].filter(function(dep) { return !occupied[dep]; });
}

function casaSucreQuote_(guests, checkIn, checkOut, rawText) {
  const c = getConfig_();
  const sh = SpreadsheetApp.openById(c.casaSucreAvailabilitySheetId).getSheetByName('Tarifas');
  const rows = sh.getDataRange().getDisplayValues();
  let nightly = 0;

  for (let i = 3; i < rows.length; i++) {
    if (normalizeText_(rows[i][0]) === 'base' && normalizeText_(rows[i][10]) === 'activa') {
      nightly = Number(rows[i][2 + guests]) || 0;
      break;
    }
  }

  const nights = Math.round((checkOut - checkIn) / 86400000);
  const t = normalizeText_(rawText);
  const parking = /parqueadero|parking/.test(t) ? nights * 10 : 0;
  const pet = /mascota|perro|perra|gato|gata/.test(t) ? nights * 10 : 0;

  return {
    nightly: nightly,
    nights: nights,
    parking: parking,
    pet: pet,
    total: nightly * nights + parking + pet
  };
}

function parseSheetDate_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return v;

  const s = String(v || '').trim();
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  return null;
}

function logCasaSucreLead_(m, dates, guests, department, note) {
  try {
    const c = getConfig_();
    const sh = SpreadsheetApp.openById(c.casaSucreMasterSheetId).getSheetByName('WhatsApp_Solicitudes');
    const nights = Math.round((dates.checkOut - dates.checkIn) / 86400000);

    sh.appendRow([
      'WA-' + new Date().getTime(),
      new Date(),
      'Abierta',
      'Casa Sucre',
      m.from,
      m.name || '',
      m.text || '',
      note || '',
      dates.checkIn,
      dates.checkOut,
      department,
      guests,
      '',
      '',
      nights
    ]);
  } catch (err) {
    console.error('No se pudo registrar lead Casa Sucre: ' + err);
  }
}


/* ===== automation/Tests.gs ===== */
function testRouter_() {
  const cases = [
    ['Quiero ver una PS5', 'ASTUHOUSE'],
    ['Tienen iPhone 14?', 'ASTUHOUSE'],
    ['Quiero reservar Leonor del 10/10 al 12/10', 'CASA_SUCRE'],
    ['Aceptan mascota en el departamento?', 'CASA_SUCRE'],
    ['Hola, información por favor', '']
  ];

  for (let i = 0; i < cases.length; i++) {
    const got = classifyBusiness_(cases[i][0], '');
    if (got !== cases[i][1]) throw new Error('Router falló: ' + cases[i][0] + ' => ' + got);
  }
  return 'OK';
}

function testCasaSucreDateParser_() {
  const x = extractStayDates_('Quiero del 10/10/2026 al 12/10/2026 para 2 personas');
  if (!x) throw new Error('No parseó fechas');
  if (extractGuests_('somos 4') !== 4) throw new Error('No parseó huéspedes');
  return 'OK';
}

function testVisitParser_() {
  const x = parseVisitDateTime_('mañana 4:30 pm');
  if (!x || x.getHours() !== 16 || x.getMinutes() !== 30) throw new Error('No parseó visita');
  return 'OK';
}

function runInternalTests_() {
  return {
    router: testRouter_(),
    casaSucreParser: testCasaSucreDateParser_(),
    visitParser: testVisitParser_()
  };
}



/* ===== FUNCIONES PÚBLICAS PARA EJECUCIÓN MANUAL EN APPS SCRIPT ===== */
function setupBaseConfig() {
  return setupBaseConfig_();
}

function runInternalTests() {
  return runInternalTests_();
}
