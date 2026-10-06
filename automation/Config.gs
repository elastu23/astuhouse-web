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
