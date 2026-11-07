# CLAUDE.md

El proyecto será la elaboración de una web de prueba destinada a probar Claude Code por primera vez. Una página sencilla pero funcional.

## Descripción del proyecto

#### Descripción
**"Family Steam"** es el nombre de nuestro grupo familiar en **Steam**. Todos los miembros en la familia, compartimos los juegos que compramos con previa coordinación de que juegos comprara cada uno.

De esta manera, administramos bien que cosa comprara cada uno para no repetir juegos y ampliar nuestra librería de juegos.

![[References/01.png|367]]

#### Objetivos
El objetivo de este proyecto es crear una página sencilla dónde pueda **administrar los juegos** que a comprado cada uno y tener un control de que se consiguió cada año en la familia de steam.

#### Alcance
Todo debe funcionar en una sola página, nada de hyper-vinculos o sub páginas, esto solo se utilizará para que puedan acceder las 6 personas que estamos en el grupo familiar. Por lo tanto no es muy complejo en cuanto a desarrollo

#### Funcionalidad
Los datos que incrustemos en esta página debería ser colocado de manera manual dentro de la misma página. Datos que debería poder colocar, sería:

	Ingresar los montos (en soles peruanos) 
	La portada del juego que se a comprado
	El total que invirtio cada miembro de la familia
	El monto minimo que cada uno debe invertir al año es de 400 soles.
	Si alguien excede el monto minimo, se debe mostrar el excedente.

No debe haber pantalla de login o insertar datos personales, la página debe funcionar para todos, con solo abrir la página principal

#### Estilo Visual
No tengo algo definido en cuanto al estilo de la página, pero me interesa que podamos probar algo **pixelart**. Ojo, no nos limitemos a hacerlo en ese estilo, si en caso doy la orden de probar otros estilos, que se haga e iteremos hasta conseguir algo agradable y funcional.

##### Referencias

Paletas de colores: Posibles opciones
![[References/Colors_01.png|321]]
![[References/Colors_02.png|323]]
Referencias Visuales
![[References/Ref_01.png|329]]

![[References/Ref_02.png|453]]
![[References/Ref_03.png|458]]

![[References/Ref_04.png|480]]

## Stack tecnológico

HTML - CSS - JavaScript sería lo principal. Si consideras utilizar algo más para elaborar la página adelante. No hay limitaciones para la creación de la página.

## Comandos

Sin build ni dependencias. Se necesita servirla por http (Firebase Auth no funciona en `file://`).
En el panel de navegador de Claude Code se usa la configuración `family-steam` de `.claude/launch.json` (ejecuta `tools/serve.ps1`, servidor estático en PowerShell, puerto 5173).

Despliegue: GitHub Pages desde la rama `main` (raíz) del repo `TheWolfDev-Discordbot/family-steam` → `https://thewolfdev-discordbot.github.io/family-steam/`. Basta con hacer push. GitHub Pages cachea los archivos 10 min: al cambiar CSS/JS, actualizar el parámetro `?v=AAAAMMDDNN` de todos los `<link>`/`<script>` propios en `index.html` para que los navegadores descarguen la versión nueva.
Las reglas de Firestore viven en `firestore.rules`; no se despliegan solas: hay que pegarlas en Firebase Console → Firestore → Reglas.

## Arquitectura

Página única (`index.html`). Firebase se carga con los SDK "compat" desde gstatic; luego los scripts propios, en orden, cada uno cuelga su módulo del objeto global `window.FS`:

- `js/firebase-config.js` → configuración pública del proyecto Firebase `family-steam`.
- `js/config.js` → miembros (ids usados también en `firestore.rules`) y cuota mínima anual (400 PEN).
- `js/utils.js` → formato de moneda/fechas, ids, helpers de miembros.
- `js/steam.js` → extrae `appId` y nombre del enlace de la tienda y consulta el Worker de Cloudflare (`tools/steam-worker.js`, URL en `FS.config.steamWorkerUrl`) para obtener nombre exacto, portada y precio. La API de Steam no admite CORS, por eso el Worker. Las portadas de juegos recientes llevan un hash en la ruta, así que la ruta antigua `/steam/apps/<appId>/header.jpg` solo sirve de respaldo para juegos viejos; si todo falla, el usuario pega la URL de la imagen a mano. El Worker se despliega pegando el archivo en el panel de Cloudflare (no hay CLI).
- `js/storage.js` → **única** capa de datos sobre Firestore. Inicia sesión anónima (invisible) y expone `subscribe(onData, onError)` en tiempo real más escrituras async (`addPurchase`, `updatePurchase`, `deletePurchase`, `addPlanned`, `deletePlanned`, `importData`). Las escrituras no devuelven estado: la UI se actualiza vía la suscripción.
- `js/stats.js` → cálculos puros: totales por año, excedente/faltante, estado `met` / `pending` (año en curso) / `missed` (año cerrado sin cumplir).
- `js/app.js` → render de todas las secciones y manejo de formularios. Re-renderiza todo en cada snapshot.

Modelo de datos (colecciones de Firestore, id del documento = id del registro): `purchases/{id}: {appId, title, memberId, amount, date, coverUrl?}` y `planned/{id}: {appId, title, memberId, createdAt, coverUrl?}`. El año se deriva de `date` (año calendario). Si se agrega un campo o un miembro, actualizar también `firestore.rules`, que valida campos y miembros.

Reglas de negocio: un juego lo paga una sola persona; si el `appId` ya fue comprado o está planeado por otro miembro se muestra un aviso y se pide confirmar con un segundo envío; al registrar una compra se eliminan los planeados con el mismo `appId`.

Fase actual: funcionalidad completa con estilo mínimo, datos compartidos en Firebase. El diseño visual se trabaja después de validar la funcionalidad.

## Convenciones

Mantener un código con buenas prácticas profesionales. Siempre comentar el código y no dejar código basura. Mantengamos una estructura de carpetas clara y simple. Mantengamos el código en ingles pero los comentarios en español.
<!-- Estilo de código, nombres, estructura de carpetas, idioma de comentarios/commits -->
