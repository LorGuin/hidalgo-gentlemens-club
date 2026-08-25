"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminNav from "@/components/admin/AdminNav";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { suscribirTurnos, actualizarEstadoTurno, eliminarTurno } from "@/lib/firestoreServices";
import type { EstadoTurno, Turno } from "@/types";
import styles from "./page.module.scss";

const ESTADOS: EstadoTurno[] = ["pendiente", "confirmado", "completado", "cancelado"];

export default function AdminTurnosPage() {
  const { esAdmin, cargando: cargandoAuth } = useAdminAuth();
  const [turnos, setTurnos] = useState<Turno[]>([]);

  useEffect(() => {
    // Esperamos a que termine de confirmarse el login de admin antes de
    // pedir nada — si no, Firestore rechaza el pedido con "permission
    // denied" porque todavía no hay usuario autenticado.
    if (cargandoAuth || !esAdmin) return;
    const unsub = suscribirTurnos(setTurnos);
    return () => unsub();
  }, [cargandoAuth, esAdmin]);

  async function borrarTurno(t: Turno) {
    if (!t.id) return;
    const confirmado = window.confirm(
      `¿Borrar el turno de ${t.nombre} (${t.fecha} ${t.hora}hs)? Esto no se puede deshacer.`
    );
    if (!confirmado) return;
    await eliminarTurno(t.id);
  }

  return (
    <AdminGuard>
      <AdminNav />
      <div className={styles.pagina}>
        <h1>Turnos</h1>
        <p className={styles.ayuda}>
          El cliente te avisa por su propio WhatsApp (con su número real) apenas reserva — acá
          solo llevás el control de fecha, servicio y estado. Si te manda el comprobante de la
          seña, marcalo como &quot;confirmado&quot;.
        </p>

        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Notas</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {turnos.map((t) => (
              <tr key={t.id}>
                <td>{t.fecha}</td>
                <td>{t.hora}</td>
                <td>{t.nombre}</td>
                <td>{t.servicio}</td>
                <td>{t.notas || "—"}</td>
                <td>
                  <select
                    value={t.estado}
                    onChange={(e) => t.id && actualizarEstadoTurno(t.id, e.target.value as EstadoTurno)}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className={styles.botonBorrar} onClick={() => borrarTurno(t)}>
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
            {turnos.length === 0 && (
              <tr>
                <td colSpan={7}>Todavía no hay turnos reservados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminGuard>
  );
}