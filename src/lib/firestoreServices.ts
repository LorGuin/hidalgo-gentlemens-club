import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { NegocioConfig, Producto, Turno, Venta } from "@/types";
// (import ya es "type-only": no genera código en runtime, es seguro con isolatedModules)

/* ---------------------------------- Turnos --------------------------------- */

export async function crearTurno(datos: Omit<Turno, "id" | "estado" | "creadoEn">) {
  const ref = await addDoc(collection(db, "turnos"), {
    ...datos,
    estado: "pendiente",
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

export function suscribirTurnos(cb: (turnos: Turno[]) => void) {
  const q = query(collection(db, "turnos"), orderBy("fecha", "asc"), orderBy("hora", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Turno, "id">) })));
  });
}

export async function actualizarEstadoTurno(id: string, estado: Turno["estado"]) {
  await updateDoc(doc(db, "turnos", id), { estado });
}

export async function eliminarTurno(id: string) {
  await deleteDoc(doc(db, "turnos", id));
}


/* -------------------------------- Productos --------------------------------- */

export function suscribirProductos(cb: (productos: Producto[]) => void) {
  const q = query(collection(db, "productos"), orderBy("nombre", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Producto, "id">) })));
  });
}

export async function crearProducto(datos: Omit<Producto, "id" | "actualizadoEn">) {
  await addDoc(collection(db, "productos"), { ...datos, actualizadoEn: serverTimestamp() });
}

export async function actualizarProducto(id: string, datos: Partial<Producto>) {
  await updateDoc(doc(db, "productos", id), { ...datos, actualizadoEn: serverTimestamp() });
}

export async function eliminarProducto(id: string) {
  await deleteDoc(doc(db, "productos", id));
}

export async function ajustarStock(id: string, delta: number) {
  const ref = doc(db, "productos", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const actual = (snap.data().stock as number) || 0;
  await updateDoc(ref, { stock: Math.max(0, actual + delta), actualizadoEn: serverTimestamp() });
}

/* ---------------------------------- Ventas ----------------------------------- */

export async function registrarVenta(datos: Omit<Venta, "id" | "creadoEn">) {
  // Firestore no acepta el valor "undefined" en ningún campo (por ejemplo
  // productoId/cantidadProducto cuando la venta no es de un producto) — hay
  // que sacar esas claves del todo en vez de mandarlas vacías.
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(([, valor]) => valor !== undefined)
  );
  const ref = await addDoc(collection(db, "ventas"), {
    ...datosLimpios,
    creadoEn: serverTimestamp(),
  });
  if (datos.productoId && datos.cantidadProducto) {
    await ajustarStock(datos.productoId, -Math.abs(datos.cantidadProducto));
  }
  return ref.id;
}

export function suscribirVentasDesde(desde: Date, cb: (ventas: Venta[]) => void) {
  const q = query(
    collection(db, "ventas"),
    where("creadoEn", ">=", Timestamp.fromDate(desde)),
    orderBy("creadoEn", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Venta, "id">) })));
  });
}

export async function marcarVentaPagada(id: string, paymentId: string) {
  await updateDoc(doc(db, "ventas", id), { estadoPago: "pagado", paymentId });
}

/**
 * Borra un corte/venta cargado por error. Si esa venta había descontado
 * stock de un producto, se lo devuelve automáticamente para que el stock
 * no quede mal.
 */
export async function eliminarVenta(venta: Venta) {
  if (!venta.id) return;
  if (venta.productoId && venta.cantidadProducto) {
    await ajustarStock(venta.productoId, Math.abs(venta.cantidadProducto));
  }
  await deleteDoc(doc(db, "ventas", venta.id));
}

/* ---------------------------------- Config ------------------------------------ */

export async function obtenerConfigNegocio(): Promise<NegocioConfig | null> {
  const snap = await getDoc(doc(db, "config", "negocio"));
  return snap.exists() ? (snap.data() as NegocioConfig) : null;
}

export async function guardarConfigNegocio(datos: Partial<NegocioConfig>) {
  await setDoc(doc(db, "config", "negocio"), datos, { merge: true });
}

/**
 * Lectura en tiempo real de la config del negocio (lectura pública según
 * las reglas de Firestore). Se usa para que el sitio público y el turnero
 * reflejen los servicios/precios/alias/QR apenas el dueño los cambia desde
 * el panel admin, sin tener que redeployar nada.
 */
export function suscribirConfigNegocio(cb: (config: Partial<NegocioConfig> | null) => void) {
  return onSnapshot(doc(db, "config", "negocio"), (snap) => {
    cb(snap.exists() ? (snap.data() as Partial<NegocioConfig>) : null);
  });
}

/* --------------------------------- Admins -------------------------------------- */

export async function esUsuarioAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

export async function listarTodosLosDocs<T>(coleccion: string): Promise<T[]> {
  const snap = await getDocs(collection(db, coleccion));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}