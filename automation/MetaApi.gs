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
