"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { NEGOCIO_DEFAULT, linkWhatsapp } from "@/lib/negocio";
import styles from "./Chatbot.module.scss";

type Mensaje = { rol: "user" | "modelo"; texto: string };

const SALUDO_INICIAL: Mensaje = {
  rol: "modelo",
  texto:
    "¡Hola! Soy Hugo 🤖, el asistente de la barbería. Puedo responderte sobre cortes, " +
    "servicios, precios, horarios, ubicación y los productos de nuestra tienda. ¿En qué te ayudo?",
};

/**
 * Mascota "robot peluquero": cabeza de robot con antena, ojos y un bigote de
 * barbero. Usa currentColor así hereda el color de donde se lo use (botón
 * flotante, header del panel).
 */
function RobotPeluqueroIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <line x1="32" y1="4" x2="32" y2="13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="4" r="3.2" fill="currentColor" />
      <rect
        x="9"
        y="13"
        width="46"
        height="39"
        rx="15"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="23.5" cy="31" r="4.4" fill="currentColor" />
      <circle cx="40.5" cy="31" r="4.4" fill="currentColor" />
      <path
        d="M15 41c4.5-6.5 10.5-6.5 17-2 6.5-4.5 12.5-4.5 17 2-6.5 6.5-13 2-17-1.2-4 3.2-10.5 7.7-17 1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Chat flotente con IA (Gemini, plan gratuito — ver frontend/src/app/api/chat/route.ts)
 * para preguntas frecuentes de la barbería. Si el modelo no puede responder algo (o
 * falla la conexión), siempre queda visible el botón para seguir por WhatsApp, así el
 * cliente nunca se queda sin forma de contactar al dueño.
 */
export default function Chatbot() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO_INICIAL]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, abierto]);

  if (pathname?.startsWith("/admin")) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;

    const historial = mensajes;
    setMensajes((m) => [...m, { rol: "user", texto: mensaje }]);
    setTexto("");
    setError(null);
    setEnviando(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje,
          historial: historial.map((m) => ({ rol: m.rol, texto: m.texto })),
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        // Pista para diagnosticar desde la consola del navegador (F12), sin
        // mostrarle detalles técnicos al cliente.
        console.warn("[Hugo] /api/chat respondió", resp.status, data?.motivo ?? "", data?.estadoGemini ?? "");
        throw new Error(data?.motivo || data?.error || `http-${resp.status}`);
      }
      setMensajes((m) => [...m, { rol: "modelo", texto: data.texto }]);
    } catch (err) {
      console.error(err);
      setError("No pudimos responder ahora. Probá de nuevo o escribinos por WhatsApp.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.botonFlotante}
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar chat" : "Abrir chat"}
      >
        {abierto ? <span className={styles.cerrarIcono}>✕</span> : <RobotPeluqueroIcon className={styles.iconoBoton} />}
      </button>

      {abierto && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitulo}>
              <RobotPeluqueroIcon className={styles.iconoHeader} />
              <div>
                <h3>Hugo</h3>
                <p className={styles.subtitulo}>Asistente de {NEGOCIO_DEFAULT.nombre}</p>
              </div>
            </div>
            <button
              type="button"
              className={styles.cerrar}
              aria-label="Cerrar chat"
              onClick={() => setAbierto(false)}
            >
              ✕
            </button>
          </div>

          <div className={styles.mensajes}>
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={m.rol === "user" ? styles.mensajeUsuario : styles.mensajeBot}
              >
                {m.texto}
              </div>
            ))}
            {enviando && <div className={styles.mensajeBot}>Escribiendo…</div>}
            {error && <div className={styles.error}>{error}</div>}
            <div ref={finRef} />
          </div>

          <div className={styles.whatsappBar}>
            <a
              href={linkWhatsapp(
                NEGOCIO_DEFAULT.telefonoWhatsapp,
                "Hola! Tengo una consulta que el asistente del sitio no me pudo resolver."
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              ¿No es lo que buscabas? Hablar por WhatsApp
            </a>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribí tu consulta..."
              disabled={enviando}
              maxLength={500}
            />
            <button type="submit" disabled={enviando || !texto.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
