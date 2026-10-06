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
