"use client";

import AdminGuard from "@/components/admin/AdminGuard";
import AdminNav from "@/components/admin/AdminNav";
import GraficoSemanal from "@/components/admin/GraficoSemanal";
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

export default function AdminDashboardPage() {
  const { esAdmin, cargando: cargandoAuth } = useAdminAuth();
  const { dia, semana, mes, cargando, porDiaUltimaSemana } = useEstadisticas(!cargandoAuth && esAdmin);

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