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
