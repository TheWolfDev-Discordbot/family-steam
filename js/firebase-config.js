// Configuración del proyecto de Firebase.
// Estos valores son públicos por diseño: la seguridad la dan las reglas de Firestore
// (ver firestore.rules) y el inicio de sesión anónimo, no el ocultar esta clave.
window.FS = window.FS || {};

FS.firebaseConfig = {
  apiKey: 'AIzaSyD7nIb3Xs2gbUBkf3U4LqIhk7MBDu8zCac',
  authDomain: 'family-steam.firebaseapp.com',
  projectId: 'family-steam',
  storageBucket: 'family-steam.firebasestorage.app',
  messagingSenderId: '1072496484941',
  appId: '1:1072496484941:web:c3bbd62023f98d5187b204'
};
