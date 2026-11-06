// Capa de datos sobre Firebase Firestore. Toda lectura/escritura pasa por aquí.
// Los datos se comparten entre todos los visitantes y llegan en tiempo real:
// la interfaz se suscribe con subscribe() y se vuelve a pintar con cada cambio.
// Antes de leer o escribir se inicia una sesión anónima (invisible para el usuario),
// que las reglas de Firestore exigen para aceptar operaciones.
window.FS = window.FS || {};

FS.storage = (function () {
  const COLLECTIONS = { purchases: 'purchases', planned: 'planned' };
  const BATCH_LIMIT = 400; // Firestore admite hasta 500 operaciones por lote

  let db = null;
  let readyPromise = null;

  // Inicializa Firebase y la sesión anónima una sola vez.
  function ready() {
    if (!readyPromise) {
      readyPromise = (async () => {
        if (!window.firebase) throw new Error('No se pudo cargar Firebase. Revisa tu conexión a internet.');
        const app = firebase.initializeApp(FS.firebaseConfig);
        await app.auth().signInAnonymously();
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
  function purchaseFields(p) {
    return { appId: String(p.appId), title: p.title, memberId: p.memberId, amount: Number(p.amount), date: p.date };
  }

  function plannedFields(p) {
    return { appId: String(p.appId), title: p.title, memberId: p.memberId, createdAt: p.createdAt };
  }

  // Escucha ambas colecciones y entrega el estado completo en cada cambio.
  // onData({ purchases, planned }) se llama cuando ambas colecciones respondieron.
  // onError(error) se llama si no se puede conectar o leer.
  function subscribe(onData, onError) {
    const state = { purchases: null, planned: null };
    const unsubscribers = [];

    const emit = () => {
      if (state.purchases && state.planned) onData({ purchases: state.purchases, planned: state.planned });
    };

    ready()
      .then(() => {
        Object.keys(COLLECTIONS).forEach((key) => {
          const unsubscribe = db.collection(COLLECTIONS[key]).onSnapshot(
            (snapshot) => {
              state[key] = snapshot.docs.map(toRecord);
              emit();
            },
            onError
          );
          unsubscribers.push(unsubscribe);
        });
      })
      .catch(onError);

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
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

  return { subscribe, addPurchase, updatePurchase, deletePurchase, addPlanned, deletePlanned, importData };
})();
