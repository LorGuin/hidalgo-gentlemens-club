import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Config pública del proyecto Firebase (no es secreta: Firestore/Auth/Storage
// se protegen con las reglas de seguridad, no ocultando esta config).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// TEMPORAL: para diagnosticar el bug del turnero. Borrar esta línea después.
if (typeof window !== "undefined") {
  console.log("🔥 Firebase config cargada:", firebaseConfig);
}

const yaExistia = getApps().length > 0;
const app = yaExistia ? getApp() : initializeApp(firebaseConfig);

// Forzamos "long polling" en vez del streaming normal (WebChannel). Sin
// esto, en algunas redes hogareñas, antivirus o routers que interfieren con
// conexiones persistentes/streaming, Firestore se queda "colgado" sin
// resolver ni fallar nunca (el síntoma de "Guardando..." infinito). Antes
// probamos con auto-detección (experimentalAutoDetectLongPolling) pero no
// alcanzó, así que forzamos el modo directamente con
// experimentalForceLongPolling.
export const db = yaExistia
  ? getFirestore(app)
  : initializeFirestore(app, { experimentalForceLongPolling: true });
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
