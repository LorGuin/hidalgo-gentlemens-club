"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { suscribirVentasDesde } from "@/lib/firestoreServices";
import type { Venta } from "@/types";

function inicioDelDia(fecha = new Date()) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inicioDeLaSemana(fecha = new Date()) {
  const d = inicioDelDia(fecha);
  const dia = d.getDay(); // 0 = domingo
  const diff = dia === 0 ? 6 : dia - 1; // semana arranca lunes
  d.setDate(d.getDate() - diff);
  return d;
}

function inicioDelMes(fecha = new Date()) {
  const d = new Date(fecha);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function haceNDias(n: number, fecha = new Date()) {
  const d = inicioDelDia(fecha);
  d.setDate(d.getDate() - n);
  return d;
}

function fechaDeVenta(v: Venta): Date {
  const ts = v.creadoEn as Timestamp | undefined;
  return ts?.toDate ? ts.toDate() : new Date();
}

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export interface ResumenEstadisticas {
  cantidad: number;
  total: number;
  ticketPromedio: number;
  porTipo: Record<string, { cantidad: number; total: number }>;
  porMetodoPago: Record<string, number>;
}

export interface PuntoDia {
  etiqueta: string;
  total: number;
  esHoy: boolean;
}

function resumir(ventas: Venta[]): ResumenEstadisticas {
  const cantidad = ventas.length;
  const total = ventas.reduce((acc, v) => acc + (v.monto || 0), 0);
  const porTipo: ResumenEstadisticas["porTipo"] = {};
  const porMetodoPago: ResumenEstadisticas["porMetodoPago"] = {};

  for (const v of ventas) {
    porTipo[v.tipo] = porTipo[v.tipo] || { cantidad: 0, total: 0 };
    porTipo[v.tipo].cantidad += 1;
    porTipo[v.tipo].total += v.monto || 0;

    porMetodoPago[v.metodoPago] = (porMetodoPago[v.metodoPago] || 0) + (v.monto || 0);
  }

  return { cantidad, total, ticketPromedio: cantidad ? total / cantidad : 0, porTipo, porMetodoPago };
}

/**
 * Trae las ventas desde el inicio del mes actual (o desde hace 7 días si
 * eso es más atrás — por ejemplo los primeros días de un mes nuevo) en una
 * sola suscripción en tiempo real, y calcula en el cliente los resúmenes de
 * día / semana / mes y el detalle día por día de la última semana. Así el
 * panel se actualiza solo apenas se registra un corte nuevo, sin recargar
 * la página.
 */
export function useEstadisticas(habilitado: boolean = true) {
  const [ventasCargadas, setVentasCargadas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // No pedimos nada hasta que el login de admin terminó de confirmarse:
    // si se manda el pedido antes, Firestore lo rechaza con "permission
    // denied" porque todavía no hay usuario autenticado adjunto al pedido.
    if (!habilitado) return;
    const desde = new Date(Math.min(inicioDelMes().getTime(), haceNDias(6).getTime()));
    const unsub = suscribirVentasDesde(desde, (ventas) => {
      setVentasCargadas(ventas);
      setCargando(false);
    });
    return () => unsub();
  }, [habilitado]);

  const resumenes = useMemo(() => {
    const desdeHoy = inicioDelDia();
    const desdeSemana = inicioDeLaSemana();
    const desdeMes = inicioDelMes();

    const ventasDelMes = ventasCargadas.filter((v) => fechaDeVenta(v) >= desdeMes);
    const delDia = ventasDelMes.filter((v) => fechaDeVenta(v) >= desdeHoy);
    const delaSemana = ventasDelMes.filter((v) => fechaDeVenta(v) >= desdeSemana);

    return {
      dia: resumir(delDia),
      semana: resumir(delaSemana),
      mes: resumir(ventasDelMes),
      ventasDelMes,
    };
  }, [ventasCargadas]);

  const porDiaUltimaSemana = useMemo((): PuntoDia[] => {
    const hoy = inicioDelDia();
    const dias: PuntoDia[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = inicioDelDia(haceNDias(i));
      const fin = new Date(d);
      fin.setDate(fin.getDate() + 1);
      const total = ventasCargadas
        .filter((v) => {
          const f = fechaDeVenta(v);
          return f >= d && f < fin;
        })
        .reduce((acc, v) => acc + (v.monto || 0), 0);
      dias.push({ etiqueta: DIAS_CORTOS[d.getDay()], total, esHoy: d.getTime() === hoy.getTime() });
    }
    return dias;
  }, [ventasCargadas]);

  return { ...resumenes, cargando, porDiaUltimaSemana };
}