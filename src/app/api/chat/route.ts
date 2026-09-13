import { NextRequest, NextResponse } from "next/server";
import { NEGOCIO_DEFAULT } from "@/lib/negocio";

export const runtime = "nodejs";

// Modelo gratuito de Gemini (sin tarjeta, ver ai.google.dev/gemini-api/docs/pricing).
// Si en el futuro Google deprecа este modelo, actualizar el id acá según
// https://ai.google.dev/gemini-api/docs/models
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type MensajeHistorial = { rol: "user" | "modelo"; texto: string };

function construirContextoNegocio() {
  const n = NEGOCIO_DEFAULT;
  const servicios = n.servicios
    .map((s) => `- ${s.nombre}: $${s.precio.toLocaleString("es-AR")} (${s.duracionMin} min)`)
    .join("\n");
  const horarios = n.horarios.map((h) => `- ${h.dia}: ${h.horario}`).join("\n");
  return [
    `Nombre del negocio: ${n.nombre}`,
    `Dirección: ${n.direccion}`,
    `Horarios:\n${horarios}`,
    `Servicios y precios:\n${servicios}`,
  ].join("\n\n");
}

function construirSystemPrompt() {
  return `
Te llamás Hugo, sos el asistente virtual de ${NEGOCIO_DEFAULT.nombre}, una barbería. Tu única función es
responder preguntas de clientes sobre cortes, servicios, precios, horarios y dirección
del local, usando EXCLUSIVAMENTE esta información real del negocio:

${construirContextoNegocio()}

Reglas estrictas:
- Respondé siempre en español, de forma breve, cordial y directa (2 a 4 oraciones como
  máximo, sin listas largas).
- No inventes precios, horarios, direcciones ni servicios que no estén en la información
  de arriba.
- Para reservar un turno, decile al cliente que use el botón/página "Reservar turno" del
  sitio (no reservás turnos vos, solo informás).
- Si te preguntan cualquier cosa que no puedas responder con la información de arriba
  (reclamos, pagos, cancelaciones, algo personal, o cualquier tema que no sea cortes,
  servicios, horarios o dirección de esta barbería), respondé que no podés ayudar con
  eso puntualmente y sugerí escribir por WhatsApp para que los atienda el dueño
  directamente. No intentes adivinar ni improvisar una respuesta en esos casos.
- No des consejos médicos, legales ni de ningún otro rubro.
`.trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "El chatbot todavía no está configurado (falta GEMINI_API_KEY)." },
      { status: 503 }
    );
  }

  let body: { mensaje?: string; historial?: MensajeHistorial[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const mensaje = (body.mensaje || "").trim().slice(0, 500);
  if (!mensaje) {
    return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 });
  }

  // Solo los últimos mensajes, para no mandar contexto de más ni pasarnos de tokens.
  const historial = (body.historial || []).slice(-8);

  const contents = [
    ...historial.map((h) => ({
      role: h.rol === "user" ? "user" : "model",
      parts: [{ text: h.texto }],
    })),
    { role: "user", parts: [{ text: mensaje }] },
  ];

  try {
    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: construirSystemPrompt() }] },
        contents,
        generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const detalle = await resp.text().catch(() => "");
      console.error("Gemini error:", resp.status, detalle);
      return NextResponse.json(
        { error: "No pudimos responder ahora. Probá de nuevo o escribinos por WhatsApp." },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const texto: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
      "No tengo una respuesta para eso. Te recomiendo escribirnos por WhatsApp.";

    return NextResponse.json({ texto });
  } catch (err) {
    console.error("Error llamando a Gemini:", err);
    return NextResponse.json(
      { error: "No pudimos responder ahora. Probá de nuevo o escribinos por WhatsApp." },
      { status: 502 }
    );
  }
}
