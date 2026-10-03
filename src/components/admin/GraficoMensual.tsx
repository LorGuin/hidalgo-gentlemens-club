"use client";

import { useState } from "react";
import { variacion, type PuntoMes } from "@/hooks/useProgresoMensual";
import styles from "./GraficoMensual.module.scss";

const ANCHO = 720;
const ALTO = 220;
const PAD_INF = 30;
const PAD_SUP = 12;

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/**
 * Barras con el total facturado de cada mes (una sola serie → un solo color,
 * cobre). El mes en curso va más claro y con borde punteado porque todavía
 * no terminó. Hover (o toque en el celular) muestra el detalle del mes y la
 * variación contra el mes anterior.
 */
export default function GraficoMensual({ datos }: { datos: PuntoMes[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(1, ...datos.map((d) => d.total));
  const altoBarras = ALTO - PAD_INF - PAD_SUP;
  const anchoCelda = ANCHO / datos.length;
  const anchoBarra = Math.min(anchoCelda * 0.56, 40);
  const baseY = ALTO - PAD_INF;

  // Líneas guía suaves en 1/2 y el máximo.
  const guias = [0.5, 1].map((f) => ({ y: baseY - f * altoBarras, valor: max * f }));

  const d = activo !== null ? datos[activo] : null;
  const anterior = activo !== null && activo > 0 ? datos[activo - 1] : null;
  const varPct = d && anterior ? variacion(d.total, anterior.total) : null;

  return (
    <div className={styles.contenedor} onMouseLeave={() => setActivo(null)}>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className={styles.svg}
        role="img"
        aria-label="Total facturado por mes en los últimos 12 meses"
      >
        {guias.map((g) => (
          <g key={g.y}>
            <line x1={0} y1={g.y} x2={ANCHO} y2={g.y} className={styles.guia} />
            <text x={2} y={g.y - 4} className={styles.guiaTexto}>
              {pesos(g.valor)}
            </text>
          </g>
        ))}
        <line x1={0} y1={baseY} x2={ANCHO} y2={baseY} className={styles.base} />

        {datos.map((m, i) => {
          const h = (m.total / max) * altoBarras;
          const x = i * anchoCelda + (anchoCelda - anchoBarra) / 2;
          const y = baseY - h;
          const esActivo = activo === i;
          const nuevoAnio = i > 0 && m.anio !== datos[i - 1].anio;
          // Barra con puntas superiores redondeadas y base recta, anclada al eje.
          const r = Math.min(4, h / 2, anchoBarra / 2);
          const camino =
            h > 0
              ? `M${x},${baseY} V${y + r} Q${x},${y} ${x + r},${y} H${x + anchoBarra - r} Q${x + anchoBarra},${y} ${x + anchoBarra},${y + r} V${baseY} Z`
              : "";

          return (
            <g key={m.clave}>
              <rect
                x={i * anchoCelda}
                y={0}
                width={anchoCelda}
                height={ALTO}
                fill="transparent"
                onMouseEnter={() => setActivo(i)}
                onClick={() => setActivo(esActivo ? null : i)}
                className={styles.hit}
              />
              {h > 0 && (
                <path
                  d={camino}
                  className={`${m.enCurso ? styles.barraEnCurso : styles.barra} ${esActivo ? styles.barraActiva : ""}`}
                  pointerEvents="none"
                />
              )}
              <text
                x={i * anchoCelda + anchoCelda / 2}
                y={ALTO - 12}
                textAnchor="middle"
                className={m.enCurso ? styles.etiquetaActual : styles.etiqueta}
                pointerEvents="none"
              >
                {m.etiqueta}
              </text>
              {nuevoAnio && (
                <text
                  x={i * anchoCelda + anchoCelda / 2}
                  y={ALTO - 1}
                  textAnchor="middle"
                  className={styles.anio}
                  pointerEvents="none"
                >
                  {m.anio}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {d && (
        <div
          className={styles.tooltip}
          style={{
            left: `${Math.min(Math.max(((activo! + 0.5) / datos.length) * 100, 14), 86)}%`,
          }}
          role="status"
        >
          <span className={styles.tooltipMes}>
            {d.nombre}
            {d.enCurso ? " (en curso)" : ""}
          </span>
          <strong>{pesos(d.total)}</strong>
          <span>
            {d.cantidad} {d.cantidad === 1 ? "venta" : "ventas"}
            {d.cantidad > 0 ? ` · ticket ${pesos(d.total / d.cantidad)}` : ""}
          </span>
          {varPct !== null && !d.enCurso && (
            <span className={varPct >= 0 ? styles.sube : styles.baja}>
              {varPct >= 0 ? "▲" : "▼"} {Math.abs(varPct).toFixed(0)}% vs {anterior!.etiqueta.toLowerCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
