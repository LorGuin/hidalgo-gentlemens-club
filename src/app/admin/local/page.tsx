"use client";

import { ChangeEvent, useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminNav from "@/components/admin/AdminNav";
import { obtenerConfigNegocio, guardarConfigNegocio } from "@/lib/firestoreServices";
import { comprimirImagenComoBase64 } from "@/lib/imagen";
import styles from "./page.module.scss";

/**
 * Los 4 lugares de la galería "El local" (ver components/home/ElLocal.tsx).
 * El orden acá tiene que coincidir con FOTOS_DEFAULT de ese componente.
 */
const SLOTS = [
  { label: "Salón general", defaultSrc: "/images/local-general.jpg" },
  { label: "Recepción", defaultSrc: "/images/local-recepcion.jpg" },
  { label: "Corte en acción", defaultSrc: "/images/corte-en-accion.jpg" },
  { label: "Herramientas", defaultSrc: "/images/herramientas.jpg" },
];

export default function AdminLocalPage() {
  const [fotos, setFotos] = useState<(string | undefined)[]>([undefined, undefined, undefined, undefined]);
  const [cargando, setCargando] = useState(true);
  const [subiendoIdx, setSubiendoIdx] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerConfigNegocio().then((config) => {
      const actuales =
        config && "fotosLocal" in config && Array.isArray(config.fotosLocal)
          ? (config.fotosLocal as string[])
          : [];
      setFotos(SLOTS.map((_, i) => actuales[i]));
      setCargando(false);
    });
  }, []);

  async function guardar(nuevas: (string | undefined)[]) {
    await guardarConfigNegocio({
      fotosLocal: nuevas,
    } as Parameters<typeof guardarConfigNegocio>[0]);
    setFotos(nuevas);
  }

  async function onCambiarFoto(i: number, e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setError("El archivo tiene que ser una imagen (JPG o PNG).");
      return;
    }

    setSubiendoIdx(i);
    setError(null);
    setMensaje(null);
    try {
      const dataUrl = await comprimirImagenComoBase64(archivo, 700, 0.82);
      const nuevas = [...fotos];
      nuevas[i] = dataUrl;
      await guardar(nuevas);
      setMensaje('Foto actualizada ✅ — ya se ve en la sección "El local" del sitio.');
    } catch (err) {
      console.error(err);
      setError("No se pudo procesar la imagen. Probá con otra foto.");
    } finally {
      setSubiendoIdx(null);
      e.target.value = "";
    }
  }

  async function restablecer(i: number) {
    const nuevas = [...fotos];
    nuevas[i] = undefined;
    setError(null);
    setMensaje(null);
    try {
      await guardar(nuevas);
      setMensaje("Foto de fábrica restablecida ✅");
    } catch (err) {
      console.error(err);
      setError("No se pudo restablecer la foto. Probá de nuevo.");
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <div className={styles.pagina}>
        <h1>Fotos del local</h1>
        <p className={styles.ayudaIntro}>
          Cambiá las 4 fotos de la sección &quot;El local&quot; de la página principal. Si no
          subís una foto propia para alguna, se sigue mostrando la foto de fábrica.
        </p>

        {cargando ? (
          <p className={styles.ayuda}>Cargando…</p>
        ) : (
          <div className={styles.grilla}>
            {SLOTS.map((slot, i) => (
              <div key={slot.label} className={styles.tarjeta}>
                <h2>{slot.label}</h2>
                <div className={styles.preview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotos[i] || slot.defaultSrc} alt={slot.label} />
                </div>
                <div className={styles.acciones}>
                  <label className={styles.botonSubir}>
                    {subiendoIdx === i ? "Procesando..." : "Cambiar foto"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={subiendoIdx !== null}
                      onChange={(e) => onCambiarFoto(i, e)}
                    />
                  </label>
                  {fotos[i] && (
                    <button
                      type="button"
                      className={styles.restablecer}
                      onClick={() => restablecer(i)}
                      disabled={subiendoIdx !== null}
                    >
                      Volver a la de fábrica
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </AdminGuard>
  );
}
