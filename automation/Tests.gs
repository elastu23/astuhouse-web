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
