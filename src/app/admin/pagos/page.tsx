"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminNav from "@/components/admin/AdminNav";
import { obtenerConfigNegocio, guardarConfigNegocio } from "@/lib/firestoreServices";
import { comprimirImagenComoBase64 } from "@/lib/imagen";
import { NEGOCIO_DEFAULT } from "@/lib/negocio";
import styles from "./page.module.scss";

/**
 * Página para que el dueño cargue/edite el alias y el QR de cobro (Mercado
 * Pago) sin tener que pedírmelo a mí. Se guarda todo en Firestore
 * (config/negocio.alias / .qrUrl) — el QR se guarda como imagen
 * comprimida en base64 adentro del mismo documento, en vez de subirse a
 * Firebase Storage (que ahora exige el plan pago Blaze). Así el panel
 * funciona 100% en el plan gratis, sin pedir tarjeta. El turnero público
 * lo lee en tiempo real (ver useNegocioConfig) y se lo muestra al cliente
 * en la pantalla de confirmación del turno.
 */
export default function AdminPagosPage() {
  const [alias, setAlias] = useState("");
  const [qrUrl, setQrUrl] = useState<string | undefined>(undefined);
  const [cargando, setCargando] = useState(true);
  const [guardandoAlias, setGuardandoAlias] = useState(false);
  const [guardandoQr, setGuardandoQr] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerConfigNegocio().then((config) => {
      setAlias(config?.alias || NEGOCIO_DEFAULT.alias);
      setQrUrl(
        config && "qrUrl" in config && typeof config.qrUrl === "string"
          ? config.qrUrl
          : undefined
      );
      setCargando(false);
    });
  }, []);

  async function guardarAlias(e: FormEvent) {
    e.preventDefault();
    setGuardandoAlias(true);
    setMensaje(null);
    setError(null);
    try {
      await guardarConfigNegocio({ alias: alias.trim() });
      setMensaje("Alias guardado ✅");
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el alias. Probá de nuevo.");
    } finally {
      setGuardandoAlias(false);
    }
  }

  async function onCambiarQr(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setError(
        "El archivo tiene que ser una imagen (JPG o PNG). Si tenés un PDF, sacale una " +
          "captura de pantalla al QR y subí esa imagen."
      );
      return;
    }

    setGuardandoQr(true);
    setMensaje(null);
    setError(null);
    try {
      const dataUrl = await comprimirImagenComoBase64(archivo);
      await guardarConfigNegocio({
        qrUrl: dataUrl,
      } as Parameters<typeof guardarConfigNegocio>[0]);
      setQrUrl(dataUrl);
      setMensaje("QR actualizado ✅ — ya se ve en la confirmación de turno.");
    } catch (err) {
      console.error(err);
      setError("No se pudo procesar la imagen. Probá con otra foto del QR.");
    } finally {
      setGuardandoQr(false);
      e.target.value = "";
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <div className={styles.pagina}>
        <h1>Pagos</h1>
        <p className={styles.ayuda}>
          Cargá acá el alias y el QR con los que cobrás las señas de los turnos. Cuando lo
          cambies se actualiza solo en la web, sin que tengas que pedirme nada.
        </p>

        {cargando ? (
          <p className={styles.ayuda}>Cargando…</p>
        ) : (
          <>
            <form className={styles.tarjeta} onSubmit={guardarAlias}>
              <h2>Alias para transferencias</h2>
              <div className={styles.grupo}>
                <label htmlFor="alias">Alias</label>
                <input
                  id="alias"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Ej: hidalgo.gentlemens"
                />
                <span className={styles.ayudaChica}>
                  Es el alias que le mostramos al cliente para que transfiera la seña.
                </span>
              </div>
              <button type="submit" disabled={guardandoAlias}>
                {guardandoAlias ? "Guardando..." : "Guardar alias"}
              </button>
            </form>

            <div className={styles.tarjeta}>
              <h2>QR de cobro (Mercado Pago)</h2>
              <p className={styles.ayudaChica}>
                Subí una foto o captura del QR que te dio Mercado Pago (el mismo que
                imprimís para el mostrador). Se lo mostramos al cliente cuando confirma el
                turno, así puede pagar la seña escaneando desde el celular.
              </p>

              {qrUrl && (
                <div className={styles.qrPreview}>
                  <img src={qrUrl} alt="QR de cobro actual" width={200} height={200} />
                </div>
              )}

              <label className={styles.botonSubir}>
                {guardandoQr ? "Guardando..." : qrUrl ? "Cambiar QR" : "Subir QR"}
                <input type="file" accept="image/*" onChange={onCambiarQr} disabled={guardandoQr} hidden />
              </label>
            </div>

            {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}
      </div>
    </AdminGuard>
  );
}