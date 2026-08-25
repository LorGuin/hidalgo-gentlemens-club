const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

/**
 * El backend hoy solo se usa para generar el cobro con QR de Mercado Pago
 * que el dueño dispara desde el panel admin al terminar un corte (ver
 * /admin/ventas). El turnero público NO depende de ningún backend: guarda
 * el turno directo en Firestore y el aviso lo manda el propio cliente por
 * WhatsApp (ver TurneroForm).
 */
export interface RespuestaPreferencia {
  ok: boolean;
  preferenceId: string;
  initPoint: string;
  qrDataUrl: string | null;
}

export async function crearPreferenciaPago(datos: {
  tipo: "ventas";
  id: string;
  titulo: string;
  monto: number;
  email?: string;
}): Promise<RespuestaPreferencia> {
  const res = await fetch(`${BACKEND_URL}/api/pagos/crear-preferencia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error("No se pudo crear la preferencia de pago");
  return res.json();
}
