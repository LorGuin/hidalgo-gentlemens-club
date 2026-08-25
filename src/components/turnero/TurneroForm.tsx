"use client";

import { FormEvent, useEffect, useState } from "react";
import { crearTurno } from "@/lib/firestoreServices";
import { NEGOCIO_DEFAULT, linkWhatsapp } from "@/lib/negocio";
import { useNegocioConfig } from "@/hooks/useNegocioConfig";
import styles from "./TurneroForm.module.scss";

const HORARIOS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "14:00", "14:30", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
];

type Paso = "formulario" | "confirmado";

/**
 * Turnero simplificado: NO depende de ningún backend ni API de WhatsApp.
 * El turno se guarda en Firestore con lo mínimo (nombre, servicio, fecha,
 * hora, notas — sin teléfono ni datos de pago), y quien avisa al dueño es
 * el propio cliente: le armamos un mensaje de WhatsApp ya redactado que
 * sale desde SU celular (por eso no hace falta pedirle el teléfono acá, el
 * dueño lo ve solo porque le llega el WhatsApp real). Ahí mismo el cliente
 * puede mandar la foto del comprobante si transfirió la seña al alias.
 */
export default function TurneroForm() {
  const { config } = useNegocioConfig();
  const qrUrl =
    "qrUrl" in config && typeof config.qrUrl === "string" ? config.qrUrl : undefined;
  const [paso, setPaso] = useState<Paso>("formulario");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [servicioNombre, setServicioNombre] = useState(NEGOCIO_DEFAULT.servicios[0]?.nombre || "");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");

  const hoyISO = new Date().toISOString().split("T")[0];

  // Si los servicios cargados desde el panel admin cambian (o difieren de
  // los de fábrica), nos aseguramos de que el servicio seleccionado sea
  // uno que realmente exista en la lista actual.
  useEffect(() => {
    if (config.servicios.length && !config.servicios.some((s) => s.nombre === servicioNombre)) {
      setServicioNombre(config.servicios[0].nombre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !fecha || !hora) {
      setError("Completá todos los campos obligatorios.");
      return;
    }

    setEnviando(true);
    try {
      await Promise.race([
        crearTurno({ nombre, servicio: servicioNombre, fecha, hora, notas }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("timeout-conexion")),
            15000
          )
        ),
      ]);
      setPaso("confirmado");
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message === "timeout-conexion") {
        setError(
          "No pudimos conectar con el servidor. Revisá tu conexión a internet (wifi/datos) e intentá de nuevo."
        );
      } else {
        setError("No pudimos guardar el turno. Probá de nuevo en un momento.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const mensajeWhatsapp =
    `Hola! Mi nombre es ${nombre}. Hice una reserva para ${servicioNombre} ` +
    `el ${fecha} a las ${hora}hs.` +
    (notas ? ` Notas: ${notas}.` : "") +
    ` Te mando también la foto del comprobante de la seña si ya transferí.`;

  if (paso === "confirmado") {
    return (
      <div className={styles.confirmacion}>
        <h2>¡Ya casi está! 🎉</h2>
        <p>
          Guardamos tu lugar para <strong>{servicioNombre}</strong> el <strong>{fecha}</strong> a
          las <strong>{hora}hs</strong>. Para confirmarlo, avisanos por WhatsApp con el botón de
          abajo (te abrimos el mensaje ya escrito, solo apretá enviar).
        </p>

        <a
          className={styles.botonWhatsapp}
          href={linkWhatsapp(NEGOCIO_DEFAULT.telefonoWhatsapp, mensajeWhatsapp)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Avisar por WhatsApp
        </a>

        <div className={styles.aliasBox}>
          <p className={styles.aliasTitulo}>¿Querés adelantar la seña?</p>
          <p>
            Transferí a nuestro alias <strong>{config.alias}</strong> y mandanos la foto
            del comprobante en el mismo chat de WhatsApp. Así el turno queda asegurado.
          </p>
          {qrUrl && (
            <img
              src={qrUrl}
              alt="QR para pagar la seña con Mercado Pago"
              className={styles.qrSena}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.grupo}>
        <label htmlFor="nombre">Nombre y apellido *</label>
        <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>

      <div className={styles.grupo}>
        <label htmlFor="servicio">Servicio *</label>
        <select id="servicio" value={servicioNombre} onChange={(e) => setServicioNombre(e.target.value)}>
          {config.servicios.map((s) => (
            <option key={s.nombre} value={s.nombre}>
              {s.nombre} — ${s.precio.toLocaleString("es-AR")}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.fila}>
        <div className={styles.grupo}>
          <label htmlFor="fecha">Fecha *</label>
          <input id="fecha" type="date" min={hoyISO} value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>

        <div className={styles.grupo}>
          <label htmlFor="hora">Horario *</label>
          <select id="hora" value={hora} onChange={(e) => setHora(e.target.value)} required>
            <option value="">Elegí un horario</option>
            {HORARIOS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.grupo}>
        <label htmlFor="notas">Notas (opcional)</label>
        <textarea id="notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={styles.botonEnviar} disabled={enviando}>
        {enviando ? "Guardando..." : "Continuar"}
      </button>
    </form>
  );
}