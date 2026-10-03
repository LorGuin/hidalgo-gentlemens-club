"use client";

import { useEffect, useState } from "react";
import {
  collection,
  count,
  getAggregateFromServer,
  query,
  sum,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Totales de los últimos meses para el gráfico "Progreso mes a mes".
 *
 * Usa consultas de agregación de Firestore (suma + cantidad calculadas en el
 * servidor): cada mes cuesta ~1 lectura, en vez de bajar todas las ventas
 * del año al navegador. Se calcula una vez al abrir la página; el mes en
 * curso se completa en vivo con los datos de useEstadisticas.
 */

export interface PuntoMes {
  clave: string; // "2026-10"
  etiqueta: string; // "Oct"
  nombre: string; // "octubre 2026"
  anio: number;
  total: number;
  cantidad: number;
  enCurso: boolean;
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

async function agregado(desde: Date, hasta: Date) {
  const q = query(
    collection(db, "ventas"),
    where("creadoEn", ">=", Timestamp.fromDate(desde)),
    where("creadoEn", "<", Timestamp.fromDate(hasta))
  );
  const snap = await getAggregateFromServer(q, { total: sum("monto"), cantidad: count() });
  const d = snap.data();
  return { total: d.total ?? 0, cantidad: d.cantidad ?? 0 };
}

export function useProgresoMensual(habilitado: boolean, cantidadMeses = 12) {
  const [meses, setMeses] = useState<PuntoMes[]>([]);
  /** Lo facturado el mes pasado hasta el mismo día y hora de hoy (comparación justa). */
  const [mesPasadoMismoPeriodo, setMesPasadoMismoPeriodo] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!habilitado) return;
    let cancelado = false;

    async function cargar() {
      const ahora = new Date();
      const rangos = Array.from({ length: cantidadMeses }, (_, i) => {
        const offset = cantidadMeses - 1 - i;
        const desde = new Date(ahora.getFullYear(), ahora.getMonth() - offset, 1);
        const hasta = new Date(desde.getFullYear(), desde.getMonth() + 1, 1);
        return { desde, hasta, enCurso: offset === 0 };
      });

      // Mismo período del mes pasado: del 1 hasta el mismo día/hora (sin pasarse del fin de mes).
      const inicioPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const finPasado = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const mismoMomento = new Date(inicioPasado);
      mismoMomento.setDate(Math.min(ahora.getDate(), new Date(ahora.getFullYear(), ahora.getMonth(), 0).getDate()));
      mismoMomento.setHours(ahora.getHours(), ahora.getMinutes(), 0, 0);
      const corte = mismoMomento < finPasado ? mismoMomento : finPasado;

      try {
        const [resultados, periodo] = await Promise.all([
          Promise.all(rangos.map((r) => agregado(r.desde, r.hasta))),
          agregado(inicioPasado, corte),
        ]);
        if (cancelado) return;
        setMeses(
          rangos.map((r, i) => ({
            clave: `${r.desde.getFullYear()}-${String(r.desde.getMonth() + 1).padStart(2, "0")}`,
            etiqueta: MESES_CORTOS[r.desde.getMonth()],
            nombre: r.desde.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
            anio: r.desde.getFullYear(),
            total: resultados[i].total,
            cantidad: resultados[i].cantidad,
            enCurso: r.enCurso,
          }))
        );
        setMesPasadoMismoPeriodo(periodo.total);
      } catch (err) {
        console.error("Error calculando el progreso mensual:", err);
        if (!cancelado) setError(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [habilitado, cantidadMeses]);

  return { meses, mesPasadoMismoPeriodo, cargando, error };
}

/** Variación porcentual; null si no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / anterior) * 100;
}
