# Casa Sucre + AstuHouse · Automatización V1

Backend preparado para Google Apps Script + Meta WhatsApp Cloud API.

## Qué resuelve
- Un solo WhatsApp atiende Casa Sucre y AstuHouse.
- Enruta automáticamente según la intención del cliente.
- AstuHouse consulta el inventario oficial, responde precio/stock y envía foto si está habilitada.
- AstuHouse agenda visitas de 15 minutos.
- Casa Sucre consulta disponibilidad segura y calcula tarifa base.
- Registra solicitudes de Casa Sucre en WhatsApp_Solicitudes.
- Evita respuestas duplicadas usando message_id.

## Seguridad
Nunca guardar tokens en GitHub ni en Google Sheets. Guardar en Apps Script > Project Settings > Script Properties:
- META_VERIFY_TOKEN
- META_ACCESS_TOKEN
- META_PHONE_NUMBER_ID
- META_GRAPH_VERSION
- ASTUHOUSE_SHEET_ID
- CASA_SUCRE_MASTER_SHEET_ID
- CASA_SUCRE_AVAILABILITY_SHEET_ID
- GOOGLE_CALENDAR_ID

## Regla de visitas AstuHouse
Los eventos normales del calendario NO bloquean visitas.
Solo bloquean:
- Eventos cuyo título contenga “Visita AstuHouse”.
- Eventos cuyo título contenga “NO VISITAS”.

## Regla de pagos Casa Sucre
Un comprobante reportado por el huésped NO confirma una reserva. La validación final sigue siendo humana.

## Despliegue
1. Crear proyecto de Google Apps Script.
2. Copiar los archivos .gs de esta carpeta.
3. Configurar Script Properties.
4. Ejecutar runInternalTests_.
5. Deploy > Web app.
6. Ejecutar como propietario.
7. Acceso: Anyone.
8. Usar URL /exec como Callback URL en Meta.
9. META_VERIFY_TOKEN debe coincidir con el token de verificación en Meta.
10. Suscribir el webhook a messages.
11. Hacer prueba real solo después de que las pruebas internas pasen.

## Estado
Código base V1 preparado. Falta desplegar el Web App y completar credenciales Meta una vez que finalice la verificación/onboarding.
