"use client";

import AdminGuard from "@/components/admin/AdminGuard";
import AdminNav from "@/components/admin/AdminNav";
import GraficoSemanal from "@/components/admin/GraficoSemanal";
import GraficoMensual from "@/components/admin/GraficoMensual";
import { useProgresoMensual, variacion, type PuntoMes } from "@/hooks/useProgresoMensual";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useEstadisticas, type ResumenEstadisticas } from "@/hooks/useEstadisticas";
import styles from "./page.module.scss";

function TarjetaResumen({ titulo, resumen }: { titulo: string; resumen: ResumenEstadisticas }) {
  return (
    <div className={styles.tarjeta}>
      <h3>{titulo}</h3>
      <p className={styles.montoGrande}>${resumen.total.toLocaleString("es-AR")}</p>
      <p className={styles.detalle}>
        {resumen.cantidad} servicio{resumen.cantidad === 1 ? "" : "s"} · ticket promedio $
        {Math.round(resumen.ticketPromedio).toLocaleString("es-AR")}
      </p>
    </div>
  );
}

function Variacion({ pct, texto }: { pct: number | null; texto: string }) {
  if (pct === null) return <span className={styles.varNeutra}>Sin datos para comparar</span>;
  const sube = pct >= 0;
  return (
    <span className={sube ? styles.varSube : styles.varBaja}>
      {sube ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% <span className={styles.varTexto}>{texto}</span>
    </span>
  );
}

function ProgresoMensual({ meses, mesPasadoMismoPeriodo }: { meses: PuntoMes[]; mesPasadoMismoPeriodo: number | null }) {
  const actual = meses[meses.length - 1];
  const pasado = meses[meses.length - 2];
  const antepasado = meses[meses.length - 3];
  const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
  const nombreMes = (m?: PuntoMes) => (m ? m.nombre.split(" ")[0] : "");

  return (
    <div className={styles.desglose}>
      <h2>Progreso mes a mes</h2>

      <div className={styles.comparacion}>
        {actual && (
          <div className={styles.tarjeta}>
            <h3>Este mes (en curso)</h3>
            <p className={styles.montoGrande}>{pesos(actual.total)}</p>
            <p className={styles.detalle}>
              <Variacion
                pct={mesPasadoMismoPeriodo !== null ? variacion(actual.total, mesPasadoMismoPeriodo) : null}
                texto={`vs. el mismo período de ${nombreMes(pasado)} (${pesos(mesPasadoMismoPeriodo ?? 0)})`}
              />
            </p>
          </div>
        )}
        {pasado && (
          <div className={styles.tarjeta}>
            <h3>Mes pasado ({nombreMes(pasado)})</h3>
            <p className={styles.montoGrande}>{pesos(pasado.total)}</p>
            <p className={styles.detalle}>
              <Variacion
                pct={antepasado ? variacion(pasado.total, antepasado.total) : null}
                texto={`vs. ${nombreMes(antepasado)} completo`}
              />
            </p>
          </div>
        )}
      </div>

      <div className={styles.graficoCard}>
        <GraficoMensual datos={meses} />
      </div>

      <div className={styles.tablaScroll}>
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Total</th>
              <th>Ventas</th>
              <th>Ticket prom.</th>
              <th>vs. mes anterior</th>
            </tr>
          </thead>
          <tbody>
            {meses
              .map((m, i) => ({ m, prev: meses[i - 1] }))
              .reverse()
              .map(({ m, prev }) => {
                const pct = prev ? variacion(m.total, prev.total) : null;
                return (
                  <tr key={m.clave}>
                    <td className={styles.celdaMes}>
                      {m.nombre}
                      {m.enCurso ? " · en curso" : ""}
                    </td>
                    <td>{pesos(m.total)}</td>
                    <td>{m.cantidad}</td>
                    <td>{m.cantidad ? pesos(m.total / m.cantidad) : "—"}</td>
                    <td>
                      {m.enCurso || pct === null ? (
                        "—"
                      ) : (
                        <span className={pct >= 0 ? styles.varSube : styles.varBaja}>
                          {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { esAdmin, cargando: cargandoAuth } = useAdminAuth();
  const { dia, semana, mes, cargando, porDiaUltimaSemana } = useEstadisticas(!cargandoAuth && esAdmin);
  const progreso = useProgresoMensual(!cargandoAuth && esAdmin);
  // El mes en curso se completa con los datos en vivo (se actualiza solo al
  // registrar un corte); los meses anteriores vienen de las agregaciones.
  const mesesProgreso = progreso.meses.map((m) =>
    m.enCurso ? { ...m, total: mes.total, cantidad: mes.cantidad } : m
  );

  return (
    <AdminGuard>
      <AdminNav />
      <div className={styles.pagina}>
        <h1>Estadísticas</h1>

        {cargando ? (
          <p className={styles.cargando}>Cargando estadísticas…</p>
        ) : (
          <>
            <div className={styles.grilla}>
              <TarjetaResumen titulo="Hoy" resumen={dia} />
              <TarjetaResumen titulo="Esta semana" resumen={semana} />
              <TarjetaResumen titulo="Este mes" resumen={mes} />
            </div>

            {progreso.cargando ? (
              <p className={styles.cargando}>Calculando el progreso mensual…</p>
            ) : progreso.error ? (
              <p className={styles.cargando}>No se pudo calcular el progreso mensual.</p>
            ) : (
              <ProgresoMensual meses={mesesProgreso} mesPasadoMismoPeriodo={progreso.mesPasadoMismoPeriodo} />
            )}

            <div className={styles.desglose}>
              <h2>Últimos 7 días</h2>
              <div className={styles.graficoCard}>
                <GraficoSemanal datos={porDiaUltimaSemana} />
              </div>
            </div>

            <div className={styles.desglose}>
              <h2>Desglose del mes por tipo de servicio</h2>
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(mes.porTipo).map(([tipo, r]) => (
                    <tr key={tipo}>
                      <td>{tipo}</td>
                      <td>{r.cantidad}</td>
                      <td>${r.total.toLocaleString("es-AR")}</td>
                    </tr>
                  ))}
                  {Object.keys(mes.porTipo).length === 0 && (
                    <tr>
                      <td colSpan={3}>Todavía no hay ventas registradas este mes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.desglose}>
              <h2>Cobros del mes por método de pago</h2>
              <table>
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(mes.porMetodoPago).map(([metodo, total]) => (
                    <tr key={metodo}>
                      <td>{metodo}</td>
                      <td>${total.toLocaleString("es-AR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}