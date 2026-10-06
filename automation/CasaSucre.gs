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
