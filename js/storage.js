// Capa de datos sobre Firebase Firestore. Toda lectura/escritura pasa por aquí.
// Los datos se comparten entre todos los visitantes y llegan en tiempo real:
// la interfaz se suscribe con subscribe() y se vuelve a pintar con cada cambio.
// Antes de leer o escribir se inicia una sesión anónima (invisible para el usuario).
// Las reglas de Firestore solo dejan operar a las sesiones registradas con el código
// familiar (ver unlock()); Firebase recuerda la sesión, así que basta una vez por navegador.
window.FS = window.FS || {};

FS.storage = (function () {
  const COLLECTIONS = { purchases: 'purchases', planned: 'planned' };
  const ACCESS_COLLECTION = 'access';
  const BATCH_LIMIT = 400; // Firestore admite hasta 500 operaciones por lote

  let auth = null;
  let db = null;
  let readyPromise = null;

  // Inicializa Firebase y la sesión anónima una sola vez.
  // Si el navegador ya tenía sesión anónima, Firebase reutiliza la misma.
  function ready() {
    if (!readyPromise) {
      readyPromise = (async () => {
        if (!window.firebase) throw new Error('No se pudo cargar Firebase. Revisa tu conexión a internet.');
        const app = firebase.initializeApp(FS.firebaseConfig);
        auth = app.auth();
        await auth.signInAnonymously();
        db = app.firestore();
      })();
      // Si falla, se permite reintentar en la siguiente llamada.
      readyPromise.catch(() => { readyPromise = null; });
    }
    return readyPromise;
  }

  // Convierte un documento de Firestore en un objeto plano con su id.
  function toRecord(doc) {
    return { id: doc.id, ...doc.data() };
  }

  // Campos que se guardan de cada tipo de registro (el id va en la ruta del documento).
  // coverUrl es opcional: solo se guarda si tiene valor (Firestore no acepta undefined).
  function withCover(fields, coverUrl) {
    if (coverUrl) fields.coverUrl = String(coverUrl);
    return fields;
  }

  function purchaseFields(p) {
    return withCover({ appId: String(p.appId), title: p.title, memberId: p.memberId, amount: Number(p.amount), date: p.date }, p.coverUrl);
  }

  function plannedFields(p) {
    return withCover({ appId: String(p.appId), title: p.title, memberId: p.memberId, createdAt: p.createdAt }, p.coverUrl);
  }

  // Escucha ambas colecciones y entrega el estado completo en cada cambio.
  // onData({ purchases, planned }) se llama cuando ambas colecciones respondieron.
  // onError(error) se llama una sola vez si no se puede conectar o leer (por ejemplo,
  // "permission-denied" si esta sesión aún no tiene el código familiar); en ese caso
  // se cierran todas las escuchas y hay que volver a llamar a subscribe().
  function subscribe(onData, onError) {
    const state = { purchases: null, planned: null };
    const unsubscribers = [];
    let failed = false;

    const stop = () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    const emit = () => {
      if (state.purchases && state.planned) onData({ purchases: state.purchases, planned: state.planned });
    };
    const fail = (error) => {
      if (failed) return;
      failed = true;
      stop();
      onError(error);
    };

    ready()
      .then(() => {
        Object.keys(COLLECTIONS).forEach((key) => {
          const unsubscribe = db.collection(COLLECTIONS[key]).onSnapshot(
            (snapshot) => {
              state[key] = snapshot.docs.map(toRecord);
              emit();
            },
            fail
          );
          unsubscribers.push(unsubscribe);
        });
      })
      .catch(fail);

    return stop;
  }

  // --- Acceso ---

  // Registra esta sesión con el código familiar. Las reglas solo aceptan el código
  // correcto (si no, la promesa falla con "permission-denied").
  async function unlock(code) {
    await ready();
    await db.collection(ACCESS_COLLECTION).doc(auth.currentUser.uid).set({ code: String(code) });
  }

  // --- Compras ---

  async function addPurchase(purchase) {
    await ready();
    await db.collection(COLLECTIONS.purchases).doc(purchase.id).set(purchaseFields(purchase));
  }

  async function updatePurchase(purchase) {
    await ready();
    await db.collection(COLLECTIONS.purchases).doc(purchase.id).set(purchaseFields(purchase));
  }

  async function deletePurchase(purchaseId) {
    await ready();
    await db.collection(COLLECTIONS.purchases).doc(purchaseId).delete();
  }

  // --- Juegos planeados ---

  async function addPlanned(item) {
    await ready();
    await db.collection(COLLECTIONS.planned).doc(item.id).set(plannedFields(item));
  }

  async function deletePlanned(itemId) {
    await ready();
    await db.collection(COLLECTIONS.planned).doc(itemId).delete();
  }

  // --- Importación ---

  // Agrega (o sobrescribe por id) los registros de un respaldo. No borra nada.
  // Devuelve cuántos registros de cada tipo se escribieron.
  async function importData(data) {
    await ready();
    const writes = [];
    (data.purchases || []).forEach((p) => writes.push([COLLECTIONS.purchases, p.id, purchaseFields(p)]));
    (data.planned || []).forEach((p) => writes.push([COLLECTIONS.planned, p.id, plannedFields(p)]));

    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      writes.slice(i, i + BATCH_LIMIT).forEach(([collection, id, fields]) => {
        batch.set(db.collection(collection).doc(id), fields);
      });
      await batch.commit();
    }
    return { purchases: (data.purchases || []).length, planned: (data.planned || []).length };
  }

  return { subscribe, unlock, addPurchase, updatePurchase, deletePurchase, addPlanned, deletePlanned, importData };
})();
