import type { NegocioConfig } from "@/types";

/**
 * Datos de referencia del negocio, usados como fallback mientras no haya
 * un documento "config/negocio" cargado en Firestore (ver panel admin,
 * o cargalo a mano desde la consola de Firebase la primera vez).
 *
 * TODO(cliente): reemplazar con los datos reales, o cargarlos desde el
 * panel admin en /admin/negocio.
 */
export const NEGOCIO_DEFAULT: NegocioConfig = {
  nombre: process.env.NEXT_PUBLIC_NEGOCIO_NOMBRE || "Hidalgo Gentlemen's Club",
  bio:
    "Después de años viviendo en Nueva York, Juan Hidalgo volvió con la barbería " +
    "clásica americana bajo el brazo. En Hidalgo Gentlemen's Club combinamos las navajas, " +
    "los cortes prolijos y la buena onda de las barberías neoyorquinas con el trato de " +
    "siempre. Cada corte es una cita, no una fila de espera.",
  fotoUrl: "/images/dueno.jpg",
  direccion: process.env.NEXT_PUBLIC_NEGOCIO_DIRECCION || "Lugones 302, Sexta Sección, Mendoza, Argentina",
  lat: Number(process.env.NEXT_PUBLIC_NEGOCIO_LAT || -32.869719),
  lng: Number(process.env.NEXT_PUBLIC_NEGOCIO_LNG || -68.8491944),
  telefonoWhatsapp: process.env.NEXT_PUBLIC_NEGOCIO_WHATSAPP || "5492613460002",
  // TODO(cliente): reemplazar por el alias/CBU real donde reciben las señas por transferencia.
  alias: process.env.NEXT_PUBLIC_NEGOCIO_ALIAS || "hidalgo.gentlemens",
  instagram: process.env.NEXT_PUBLIC_NEGOCIO_INSTAGRAM,
  facebook: process.env.NEXT_PUBLIC_NEGOCIO_FACEBOOK,
  horarios: [
    // TODO(cliente): confirmar si el horario es el mismo todos los días o varía
    // (por ahora se asume Lunes a Sábado según el dato que nos pasaron: "10 a 20hs").
    { dia: "Lunes a Sábado", horario: "10:00 - 20:00" },
  ],
  servicios: [
    { nombre: "Corte clásico", precio: 8000, duracionMin: 30 },
    { nombre: "Corte + Barba", precio: 12000, duracionMin: 45 },
    { nombre: "Arreglo de barba", precio: 5000, duracionMin: 20 },
    { nombre: "Afeitado a navaja", precio: 6000, duracionMin: 25 },
  ],
};

export function linkWhatsapp(telefono: string, mensaje = "") {
  const base = `https://wa.me/${telefono.replace(/\D/g, "")}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
