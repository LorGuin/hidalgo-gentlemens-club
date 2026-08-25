export interface Servicio {
  nombre: string;
  precio: number;
  duracionMin: number;
}

export interface Horario {
  dia: string; // "Lunes a Viernes", "Sábados"
  horario: string; // "9:00 - 20:00"
}

export interface NegocioConfig {
  nombre: string;
  bio: string;
  fotoUrl?: string;
  direccion: string;
  lat: number;
  lng: number;
  telefonoWhatsapp: string;
  alias: string;
  instagram?: string;
  facebook?: string;
  horarios: Horario[];
  servicios: Servicio[];
}

export type EstadoTurno = "pendiente" | "confirmado" | "cancelado" | "completado";
export type EstadoPago = "pendiente" | "pagado";
export type MetodoPago = "efectivo" | "mercadopago" | "transferencia";

/**
 * Turno: guardamos lo mínimo indispensable (nombre, servicio, fecha, hora,
 * notas). A propósito NO se guarda teléfono ni datos de pago acá — el aviso
 * real se lo manda el propio cliente por WhatsApp desde su celular (ver
 * TurneroForm), y si transfiere una seña, manda la foto del comprobante en
 * ese mismo chat. Menos datos sensibles en Firestore, y el dueño de todos
 * modos ve el número real del cliente porque el WhatsApp le llega directo.
 */
export interface Turno {
  id?: string;
  nombre: string;
  servicio: string;
  fecha: string; // yyyy-mm-dd
  hora: string; // HH:mm
  notas?: string;
  estado: EstadoTurno;
  creadoEn?: unknown;
}

export type TipoVenta = "corte" | "barba" | "combo" | "producto" | "otro";

export interface Venta {
  id?: string;
  tipo: TipoVenta;
  descripcion: string;
  monto: number;
  metodoPago: MetodoPago;
  estadoPago: EstadoPago;
  turnoId?: string;
  productoId?: string;
  cantidadProducto?: number;
  preferenceId?: string;
  paymentId?: string;
  creadoEn?: unknown;
}

export interface Producto {
  id?: string;
  nombre: string;
  categoria: string;
  precio: number;
  costo?: number;
  stock: number;
  stockMinimo: number;
  actualizadoEn?: unknown;
}
