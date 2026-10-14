# AstuHouse · arquitectura y prompt maestro (14 octubre 2026)

## Objetivo
Convertir https://astuhouse.reto365.com.ec/ en el punto de entrada para **comprar tecnología de inventario real** y **ofrecer artículos usados a AstuHouse**, con experiencia clara, profesional, rápida y responsive, priorizando iPhone, laptops/MacBook, consolas y televisores.

## Prompt de trabajo para futuras iteraciones
> Actúa como un equipo sénior de ingeniería web, diseño UX/UI, accesibilidad, e-commerce y operaciones de recommerce en Ecuador. Trabaja directamente sobre el repositorio existente \`elastu23/astuhouse-web\` (GitHub Pages) y su dominio actual, preservando HTTPS, CNAME, privacidad, identidad comercial, enlaces a WhatsApp y funcionamiento de los canales de Meta. Diseña una web premium, rápida, móvil primero, con flujos separados de **comprar** y **vender a AstuHouse**. Nunca inventes stock, precios, testimonios, garantías, certificaciones, marcas, direcciones físicas ni plazos de pago. Utiliza únicamente el logo oficial proporcionado por el propietario, sin recrearlo ni sustituirlo por una versión supuesta. El comprador debe encontrar categorías y solicitar detalles reales del inventario, y el vendedor debe enviar modelo, especificaciones, condición, fallas, batería si aplica, ciudad, precio deseado y fotografías, con una cotización expresamente no vinculante hasta la inspección. Integra WhatsApp de AstuHouse (+593 96 256 2983) mediante mensajes prellenados y mantén compatibles el número y el backend actual de automatización. No expongas claves ni datos privados de Google Sheets. Implementa controles de validación, consentimiento, política de privacidad, SEO básico, rendimiento y accesibilidad. Evalúa cada cambio con pruebas en móvil y escritorio y despliega con verificación real de la versión publicada.

## Situación actual: primera fase implementada
- Sitio estático en GitHub Pages, actual \`index.html\`; sin nuevas dependencias ni cuotas.
- Landing profesional con navegación compra/venta, categorías tecnológicas, FAQs, contacto y datos comerciales que ya constaban.
- Formulario de **consulta de compra** que construye mensaje personalizado y lo envía a WhatsApp del negocio.
- Formulario de **oferta de venta**: categoría, ciudad, marca/modelo, capacidad, estado, batería, precio esperado, detalles/fallas, interés en venta o consulta de parte de pago.
- Fotografías se adjuntan **manualmente dentro de WhatsApp**; la web no las recopila o conserva.
- No hay cotizaciones instantáneas, compras o pagos automáticos. Todo se revisa antes de acordar.
- Política de privacidad ampliada al flujo de vendedores.
- Los productos no tienen stock ni precios públicos en esta fase, para evitar anunciar inventario desactualizado.
- Marca textual mientras se obtiene el logo oficial. El HTML tiene sitio listo en \`assets/logo-astuhouse.png\`.

## Próximas fases (requieren fuentes/confirmación)
1. **Identidad oficial**: proporcionar archivo de logo real PNG transparente o SVG validado. Publicarlo en \`assets/logo-astuhouse.png\`, optimizar peso y revisar contraste.
2. **Catálogo verificado**: leer productos disponibles en \`AstuHouse · IA · Inventario\` (Google Sheets), clasificar y verificar campos (nombre, categoría, precio al público, estado, fotos, disponibilidad, fecha de última actualización). Publicar solo datos destinados al público mediante una copia/cache de solo lectura o endpoint seguro, nunca haciendo público el documento privado ni las credenciales. Ocultar agotados o marcar disponibilidad pendiente si los datos están vencidos.
3. **Galería real**: usar imágenes autorizadas de \`AstuHouse · Fotos Productos IA\`, con fotos fieles y datos de estado por unidad, sin sustituir las fotos por renders ficticios.
4. **Captura comercial**: configurar una bandeja de oportunidades de compra en Google Sheets con ID, fecha, categoría, precio solicitado, estado (nuevo, contacto, inspección, oferta, aceptado, rechazado), observaciones y responsable. Requiere endpoint del backend con autorización, validación, rate limiting, antifraude y control de acceso. Mantener WhatsApp como canal de contacto; evitar que cualquier visitante escriba directamente en el Sheet.
5. **Asistente IA**: ampliar el flujo actual de Meta → Apps Script → Sheets para clasificar explícitamente \`QUIERO COMPRAR TECNOLOGÍA\` / \`QUIERO VENDER MI EQUIPO\`, consultar inventario real para ventas, crear solicitud de evaluación para compras y derivar a revisión humana. No ejecutar transferencias ni fijar precios automáticamente.
6. **Seguridad/legales**: procedimiento de verificación de equipos: propiedad/compra legítima, IMEI/serial en revisión privada, Buscar mi iPhone/iCloud/Activation Lock, cuentas de consola, batería, conectores, pantalla, reparaciones, reporte de fallas. Avisos de cotización no vinculante y tratamiento de datos.

## Lista de control de calidad
- En iPhone y desktop: CTA Comprar → sección y formulario correctos; CTA Vender → valoración.
- Comprar: categoría obligatoria, modelo obligatorio; genera texto y número correcto en WhatsApp.
- Vender: categoría, ciudad, modelo, estado y consentimiento obligatorios; detalles opcionales; texto legible en WhatsApp.
- La web no solicita IMEI, contraseñas ni cédulas en campos públicos.
- Integridad de vínculos a privacidad, eliminación de datos e Instagram.
- Sin productos ficticios, precios inventados ni garantías automáticas.
- Probar menú móvil, foco, etiquetas, scroll, HTML metadata, carga con logo disponible e indisponible.
- Verificar versión efectiva de GitHub Pages tras cambios; un commit exitoso no prueba por sí solo el despliegue.
