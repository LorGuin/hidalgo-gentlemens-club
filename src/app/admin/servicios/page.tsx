"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminNav from "@/components/admin/AdminNav";
import { obtenerConfigNegocio, guardarConfigNegocio } from "@/lib/firestoreServices";
import { NEGOCIO_DEFAULT } from "@/lib/negocio";
import type { Servicio } from "@/types";
import styles from "./page.module.scss";

/**
 * Página para que el dueño cargue/edite los servicios y precios que se
 * muestran en la web y en el turnero, sin tocar código. Se guarda en
 * Firestore (config/negocio.servicios) — el sitio público y el turnero lo
 * leen en tiempo real (ver useNegocioConfig).
 */
export default function AdminServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    obtenerConfigNegocio().then((config) => {
      setServicios(
        config?.servicios && config.servicios.length > 0 ? config.servicios : NEGOCIO_DEFAULT.servicios
      );
      setCargando(false);
    });
  }, []);

  function actualizarServicio(indice: number, cambios: Partial<Servicio>) {
    setServicios((actuales) =>
      actuales.map((s, i) => (i === indice ? { ...s, ...cambios } : s))
    );
  }

  function agregarServicio() {
    setServicios((actuales) => [...actuales, { nombre: "", precio: 0, duracionMin: 30 }]);
  }

  function borrarServicio(indice: number) {
    setServicios((actuales) => actuales.filter((_, i) => i !== indice));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const limpios = servicios
      .map((s) => ({ ...s, nombre: s.nombre.trim() }))
      .filter((s) => s.nombre.length > 0);

    if (limpios.length === 0) {
      setMensaje("Cargá al menos un servicio antes de guardar.");
      return;
    }

    setGuardando(true);
    setMensaje(null);
    try {
      await guardarConfigNegocio({ servicios: limpios });
      setServicios(limpios);
      setMensaje("Guardado ✅ — ya se actualizó en la web y en el turnero.");
    } catch (err) {
      console.error(err);
      setMensaje("No se pudo guardar. Probá de nuevo en un momento.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <div className={styles.pagina}>
        <h1>Servicios y precios</h1>
        <p className={styles.ayuda}>
          Esta es la lista que ven los clientes en la web y en el formulario de reserva de
          turno. Cambiá el nombre, el precio o la duración, agregá servicios nuevos o borrá
          los que ya no ofrezcas, y guardá — se actualiza solo, sin que yo tenga que tocar
          nada.
        </p>

        {cargando ? (
          <p className={styles.ayuda}>Cargando…</p>
        ) : (
          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.tablaHead}>
              <span>Servicio</span>
              <span>Precio ($)</span>
              <span>Duración (min)</span>
              <span></span>
            </div>

            {servicios.map((s, i) => (
              <div key={i} className={styles.fila}>
                <input
                  placeholder="Ej: Corte clásico"
                  value={s.nombre}
                  onChange={(e) => actualizarServicio(i, { nombre: e.target.value })}
                  required
                />
                <input
                  type="number"
                  min={0}
                  value={s.precio}
                  onChange={(e) => actualizarServicio(i, { precio: Number(e.target.value) })}
                />
                <input
                  type="number"
                  min={0}
                  value={s.duracionMin}
                  onChange={(e) => actualizarServicio(i, { duracionMin: Number(e.target.value) })}
                />
                <button
                  type="button"
                  className={styles.botonBorrar}
                  onClick={() => borrarServicio(i)}
                  aria-label={`Borrar ${s.nombre || "servicio"}`}
                >
                  Borrar
                </button>
              </div>
            ))}

            {servicios.length === 0 && (
              <p className={styles.ayuda}>Todavía no cargaste ningún servicio.</p>
            )}

            <div className={styles.acciones}>
              <button type="button" className={styles.botonAgregar} onClick={agregarServicio}>
                + Agregar servicio
              </button>
              <button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>

            {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
          </form>
        )}
      </div>
    </AdminGuard>
  );
}