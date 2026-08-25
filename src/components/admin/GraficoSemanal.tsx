"use client";

import { useState } from "react";
import type { PuntoDia } from "@/hooks/useEstadisticas";
import styles from "./GraficoSemanal.module.scss";

const ANCHO = 560;
const ALTO = 180;
const PAD_INF = 26;
const PAD_SUP = 14;

/**
 * Gráfico de barras simple (SVG a mano, sin librerías) con el total
 * facturado por día de los últimos 7 días. Una sola serie (magnitud), así
 * que un solo color (cobre) alcanza — no hace falta paleta categórica.
 * Tooltip al pasar el mouse con el monto exacto de cada día.
 */
export default function GraficoSemanal({ datos }: { datos: PuntoDia[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(1, ...datos.map((d) => d.total));

  const altoBarras = ALTO - PAD_INF - PAD_SUP;
  const anchoCelda = ANCHO / datos.length;
  const anchoBarra = anchoCelda * 0.46;

  return (
    <div className={styles.contenedor}>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className={styles.svg}
        role="img"
        aria-label="Total facturado por día en los últimos 7 días"
      >
        <line x1={0} y1={ALTO - PAD_INF} x2={ANCHO} y2={ALTO - PAD_INF} className={styles.base} />

        {datos.map((d, i) => {
          const h = max > 0 ? (d.total / max) * altoBarras : 0;
          const x = i * anchoCelda + (anchoCelda - anchoBarra) / 2;
          const y = ALTO - PAD_INF - h;
          const activo = hoverIndex === i;
          const tooltipAncho = 84;
          const tooltipX = Math.min(Math.max(x + anchoBarra / 2 - tooltipAncho / 2, 2), ANCHO - tooltipAncho - 2);
          const tooltipY = Math.max(y - 28, 2);

          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className={styles.grupoBarra}
            >
              {/* zona de hover más ancha que la barra para que sea fácil de tocar */}
              <rect x={i * anchoCelda} y={0} width={anchoCelda} height={ALTO - PAD_INF} fill="transparent" />

              {d.total > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={anchoBarra}
                  height={Math.max(h, 3)}
                  rx={4}
                  className={activo ? styles.barraActiva : styles.barra}
                />
              )}

              <text
                x={i * anchoCelda + anchoCelda / 2}
                y={ALTO - 8}
                textAnchor="middle"
                className={d.esHoy ? styles.etiquetaHoy : styles.etiqueta}
              >
                {d.etiqueta}
              </text>

              {activo && d.total > 0 && (
                <g>
                  <rect x={tooltipX} y={tooltipY} width={tooltipAncho} height={20} rx={4} className={styles.tooltipFondo} />
                  <text x={tooltipX + tooltipAncho / 2} y={tooltipY + 14} textAnchor="middle" className={styles.tooltipTexto}>
                    ${d.total.toLocaleString("es-AR")}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}