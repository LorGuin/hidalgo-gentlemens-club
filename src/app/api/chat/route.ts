import { NextRequest, NextResponse } from "next/server";
import { NEGOCIO_DEFAULT } from "@/lib/negocio";

export const runtime = "nodejs";

// Modelo gratuito de Gemini (sin tarjeta, ver ai.google.dev/gemini-api/docs/pricing).
// Si en el futuro Google deprecа este modelo, actualizar el id acá según
// https://ai.google.dev/gemini-api/docs/models
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type MensajeHistorial = { rol: "user" | "modelo"; texto: string };

/* ------------------------------ Tienda online ------------------------------ */

type ProductoTienda = {
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  descripcion: string;
};

// Cache en memoria de la función (se reusa mientras Netlify la mantenga
// "caliente"), para no consultar Firestore en cada mensaje del chat.
let cacheProductos: { cuando: number; productos: ProductoTienda[] } | null = null;
const CACHE_MS = 60_000;

type ValorFirestore = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
};

const numero = (v?: ValorFirestore) => Number(v?.integerValue ?? v?.doubleValue ?? 0);

/**
 * Lee los productos publicados en la tienda (/tienda) usando la API REST de
 * Firestore — la colección "productos" tiene lectura pública en
 * firestore.rules, así que alcanza con la API key pública de Firebase, sin
 * SDK ni credenciales extra. Pide solo los campos de texto (`mask`) para no
 * bajarse las fotos en base64. Si falla, el chat sigue andando igual, solo
 * que sin el listado de productos.
 */
async function obtenerProductosTienda(): Promise<ProductoTienda[] | null> {
  if (cacheProductos && Date.now() - cacheProductos.cuando < CACHE_MS) {
    return cacheProductos.productos;
  }
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const firebaseKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId) return null;

  const campos = ["nombre", "categoria", "precio", "stock", "descripcion", "publicado"];
  const params = new URLSearchParams({ pageSize: "300" });
  campos.forEach((c) => params.append("mask.fieldPaths", c));
  if (firebaseKey) params.set("key", firebaseKey);

  try {
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/productos?${params}`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" }
    );
    if (!resp.ok) {
      console.error("Firestore (productos) error:", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const data = (await resp.json()) as {
      documents?: { fields?: Record<string, ValorFirestore> }[];
    };
    const productos = (data.documents ?? [])
      .map((d) => d.fields ?? {})
      .filter((f) => f.publicado?.booleanValue === true)
      .map((f) => ({
        nombre: f.nombre?.stringValue ?? "",
        categoria: f.categoria?.stringValue ?? "",
        precio: numero(f.precio),
        stock: numero(f.stock),
        descripcion: (f.descripcion?.stringValue ?? "").slice(0, 200),
      }))
      .filter((p) => p.nombre);
    cacheProductos = { cuando: Date.now(), productos };
    return productos;
  } catch (err) {
    console.error("Error leyendo productos de Firestore:", err);
    return null;
  }
}

function construirContextoTienda(productos: ProductoTienda[] | null) {
  const base =
    "Además de la barbería, Hidalgo tiene una tienda online de ropa y accesorios en la " +
    "página /tienda del sitio (link \"Tienda\" del menú). Ahí el cliente elige productos, " +
    "los agrega al pedido y lo envía por WhatsApp; el pago y la entrega se coordinan por ese " +
    "chat con el dueño. No hay pago online en la web.";
  if (productos === null) {
    return `${base}\n\nNo pudiste consultar el listado de productos ahora: si preguntan por un producto puntual, invitalos a mirar /tienda o consultar por WhatsApp.`;
  }
  if (productos.length === 0) {
    return `${base}\n\nPor ahora no hay productos publicados en la tienda (se está armando).`;
  }
  const lista = productos
    .map(
      (p) =>
        `- ${p.nombre} (${p.categoria || "sin categoría"}): $${p.precio.toLocaleString("es-AR")}` +
        `${p.stock > 0 ? "" : " — SIN STOCK por ahora"}` +
        `${p.descripcion ? `. ${p.descripcion}` : ""}`
    )
    .join("\n");
  return `${base}\n\nProductos publicados en la tienda ahora mismo:\n${lista}`;
}

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

function construirSystemPrompt(productos: ProductoTienda[] | null) {
  return `
Te llamás Hugo, sos el asistente virtual de ${NEGOCIO_DEFAULT.nombre}, una barbería con tienda de
ropa y accesorios. Tu única función es responder preguntas de clientes sobre cortes, servicios,
precios, horarios, dirección del local y los productos de la tienda, usando EXCLUSIVAMENTE esta
información real del negocio:

${construirContextoNegocio()}

TIENDA:
${construirContextoTienda(productos)}

Reglas estrictas:
- Respondé siempre en español, de forma breve, cordial y directa (2 a 4 oraciones como
  máximo, sin listas largas).
- No inventes precios, horarios, direcciones ni servicios que no estén en la información
  de arriba.
- Para reservar un turno, decile al cliente que use el botón/página "Reservar turno" del
  sitio (no reservás turnos vos, solo informás).
- Si preguntan por ropa, gorras, accesorios o "qué venden", contá qué hay en la tienda (solo
  los productos del listado, con su precio) e invitalos a entrar a la sección "Tienda" del
  sitio para armar el pedido. No inventes talles, colores, envíos, medios de pago ni
  productos que no figuren: para esos detalles, sugerí consultar por WhatsApp.
- Si te preguntan cualquier cosa que no puedas responder con la información de arriba
  (reclamos, pagos, cancelaciones, algo personal, o cualquier tema que no sea cortes,
  servicios, horarios, dirección o productos de la tienda de este negocio), respondé que no podés ayudar con
  eso puntualmente y sugerí escribir por WhatsApp para que los atienda el dueño
  directamente. No intentes adivinar ni improvisar una respuesta en esos casos.
- No des consejos médicos, legales ni de ningún otro rubro.
`.trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "El chatbot todavía no está configurado (falta GEMINI_API_KEY).",
        motivo: "sin-clave",
      },
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

  const productos = await obtenerProductosTienda();

  try {
    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: construirSystemPrompt(productos) }] },
        contents,
        generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const detalle = await resp.text().catch(() => "");
      console.error("Gemini error:", resp.status, detalle);
      // `motivo` es para diagnosticar (se ve en la consola del navegador y en
      // los logs de Netlify); al cliente final se le muestra el mensaje genérico.
      const motivo =
        resp.status === 400 || resp.status === 401 || resp.status === 403
          ? "clave-invalida-o-sin-permiso"
          : resp.status === 404
            ? "modelo-no-encontrado"
            : resp.status === 429
              ? "limite-gratuito-alcanzado"
              : `gemini-${resp.status}`;
      return NextResponse.json(
        {
          error: "No pudimos responder ahora. Probá de nuevo o escribinos por WhatsApp.",
          motivo,
          estadoGemini: resp.status,
        },
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
      {
        error: "No pudimos responder ahora. Probá de nuevo o escribinos por WhatsApp.",
        motivo: err instanceof Error && err.name === "TimeoutError" ? "timeout" : "error-de-red",
      },
      { status: 502 }
    );
  }
}
