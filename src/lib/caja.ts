import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
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
import type { Caja, MovimientoCaja, ResumenCaja, TipoVenta, Venta } from "@/types";

/*
 * Caja diaria
 * -----------
 * - cajas/{yyyy-mm-dd}: apertura (monto inicial) y cierre (efectivo contado,
 *   diferencia y un resumen "congelado" del día para el historial).
 * - cajas/{yyyy-mm-dd}/movimientos: gastos y retiros de efectivo del día.
 * - Los cortes/ventas siguen en la colección "ventas" de siempre (así las
 *   estadísticas del panel no cambian); la caja de un día suma las ventas
 *   cuyo creadoEn cae en esa fecha.
 */

/* --------------------------------- Fechas --------------------------------- */

/** Fecha local (Argentina, la del navegador) como "yyyy-mm-dd". */
export function claveFecha(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

export function rangoDeFecha(fecha: string): [Date, Date] {
  const [y, m, d] = fecha.split("-").map(Number);
  const desde = new Date(y, m - 1, d, 0, 0, 0, 0);
  const hasta = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return [desde, hasta];
}

/** "2026-10-03" → "sábado 3 de octubre" */
export function fechaLarga(fecha: string) {
  const [desde] = rangoDeFecha(fecha);
  return desde.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

/** "2026-10-03" → "03/10" */
export function fechaCorta(fecha: string) {
  const [, m, d] = fecha.split("-");
  return `${d}/${m}`;
}

export function horaDe(ts: unknown) {
  const t = ts as Timestamp | undefined;
  if (!t?.toDate) return "—";
  return t.toDate().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/* ------------------------------ Suscripciones ------------------------------ */

export function suscribirCaja(fecha: string, cb: (caja: Caja | null) => void) {
  return onSnapshot(doc(db, "cajas", fecha), (snap) => {
    cb(snap.exists() ? (snap.data() as Caja) : null);
  });
}

export function suscribirMovimientos(fecha: string, cb: (movs: MovimientoCaja[]) => void) {
  const q = query(collection(db, "cajas", fecha, "movimientos"), orderBy("creadoEn", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MovimientoCaja, "id">) })));
  });
}

/** Ventas de un día puntual (rango sobre creadoEn: no necesita índice compuesto). */
export function suscribirVentasDelDia(fecha: string, cb: (ventas: Venta[]) => void) {
  const [desde, hasta] = rangoDeFecha(fecha);
  const q = query(
    collection(db, "ventas"),
    where("creadoEn", ">=", Timestamp.fromDate(desde)),
    where("creadoEn", "<", Timestamp.fromDate(hasta)),
    orderBy("creadoEn", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Venta, "id">) })));
  });
}

/** Últimas cajas (abiertas o cerradas), más nuevas primero, para el historial. */
export function suscribirHistorialCajas(cb: (cajas: Caja[]) => void, cantidad = 30) {
  const q = query(collection(db, "cajas"), orderBy("fecha", "desc"), limit(cantidad));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data() as Caja)));
}

/* -------------------------------- Acciones -------------------------------- */

export async function abrirCaja(fecha: string, montoInicial: number) {
  await setDoc(
    doc(db, "cajas", fecha),
    { fecha, estado: "abierta", montoInicial, abiertaEn: serverTimestamp() },
    { merge: true }
  );
}

export async function cerrarCaja(
  fecha: string,
  datos: { efectivoContado: number; resumen: ResumenCaja; nota?: string }
) {
  await updateDoc(doc(db, "cajas", fecha), {
    estado: "cerrada",
    cerradaEn: serverTimestamp(),
    efectivoContado: datos.efectivoContado,
    diferencia: datos.efectivoContado - datos.resumen.efectivoEsperado,
    nota: datos.nota || "",
    resumen: datos.resumen,
  });
}

/** Para corregir algo de un día ya cerrado: vuelve a "abierta" (el cierre se rehace). */
export async function reabrirCaja(fecha: string) {
  await updateDoc(doc(db, "cajas", fecha), { estado: "abierta" });
}

export async function registrarMovimiento(
  fecha: string,
  datos: Omit<MovimientoCaja, "id" | "creadoEn">
) {
  await addDoc(collection(db, "cajas", fecha, "movimientos"), {
    ...datos,
    creadoEn: serverTimestamp(),
  });
}

export async function eliminarMovimiento(fecha: string, id: string) {
  await deleteDoc(doc(db, "cajas", fecha, "movimientos", id));
}

/* -------------------------------- Cálculos -------------------------------- */

const TIPOS_SERVICIO: TipoVenta[] = ["corte", "barba", "combo"];

export const esDigital = (v: Venta) => v.metodoPago !== "efectivo";

export function calcularResumen(
  ventas: Venta[],
  movimientos: MovimientoCaja[],
  montoInicial: number
): ResumenCaja {
  const pagadas = ventas.filter((v) => v.estadoPago === "pagado");
  const suma = (lista: { monto: number }[]) => lista.reduce((acc, x) => acc + (x.monto || 0), 0);

  const efectivo = suma(pagadas.filter((v) => !esDigital(v)));
  const digital = suma(pagadas.filter(esDigital));
  const pendiente = suma(ventas.filter((v) => v.estadoPago === "pendiente"));
  const gastos = suma(movimientos.filter((m) => m.tipo === "gasto"));
  const retiros = suma(movimientos.filter((m) => m.tipo === "retiro"));

  const porBarbero: ResumenCaja["porBarbero"] = {};
  for (const v of ventas) {
    if (!v.barbero) continue;
    porBarbero[v.barbero] = porBarbero[v.barbero] || { cantidad: 0, total: 0 };
    porBarbero[v.barbero].cantidad += 1;
    porBarbero[v.barbero].total += v.monto || 0;
  }

  return {
    cantidadVentas: ventas.length,
    cantidadServicios: ventas.filter((v) => TIPOS_SERVICIO.includes(v.tipo)).length,
    efectivo,
    digital,
    pendiente,
    gastos,
    retiros,
    totalCobrado: efectivo + digital,
    efectivoEsperado: montoInicial + efectivo - gastos - retiros,
    porBarbero,
  };
}

/**
 * Los servicios de /admin/servicios tienen nombre libre ("Corte + Barba",
 * "Afeitado a navaja"...). Para que las estadísticas por tipo sigan
 * funcionando, se deduce el tipo a partir del nombre.
 */
export function tipoDeServicio(nombre: string): TipoVenta {
  const n = nombre.toLowerCase();
  const tieneBarba = n.includes("barba") || n.includes("afeitado") || n.includes("navaja");
  const tieneCorte = n.includes("corte") || n.includes("pelo") || n.includes("cabello");
  if (tieneBarba && tieneCorte) return "combo";
  if (tieneBarba) return "barba";
  return "corte";
}
