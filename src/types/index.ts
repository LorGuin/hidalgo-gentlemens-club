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
  // Fotos de la galería "El local" (base64, subidas desde /admin/local). Un
  // índice sin foto propia usa la foto de fábrica (ver ElLocal.tsx).
  fotosLocal?: string[];
  // Barberos que atienden en el salón (se editan desde la Caja diaria). Cada
  // corte registrado puede asignarse a uno, para ver cuánto hizo cada uno.
  barberos?: string[];
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
  /** Quién hizo el corte (nombre, de NegocioConfig.barberos). */
  barbero?: string;
  preferenceId?: string;
  paymentId?: string;
  creadoEn?: unknown;
}

/**
 * Producto: se usa tanto para el control de stock interno (panel
 * /admin/stock) como para la tienda online pública (sección "Tienda" del
 * home). "publicado" decide si aparece en la tienda pública; "fotoUrl" y
 * "descripcion" son opcionales y solo hacen falta si se va a mostrar ahí.
 * La foto se guarda en base64 directo en el documento (mismo approach que
 * el QR de pagos, ver lib/imagen.ts) para no depender de Firebase Storage.
 */
export interface Producto {
  id?: string;
  nombre: string;
  categoria: string;
  precio: number;
  costo?: number;
  stock: number;
  stockMinimo: number;
  descripcion?: string;
  fotoUrl?: string;
  publicado?: boolean;
  actualizadoEn?: unknown;
}

/* ------------------------------- Caja diaria -------------------------------- */

export type EstadoCaja = "abierta" | "cerrada";

/** Resumen de números de un día de caja (se guarda congelado al cerrar). */
export interface ResumenCaja {
  cantidadVentas: number;
  cantidadServicios: number;
  efectivo: number;
  digital: number; // transferencia / QR / Mercado Pago
  pendiente: number;
  gastos: number;
  retiros: number;
  totalCobrado: number; // efectivo + digital
  efectivoEsperado: number; // inicial + efectivo - gastos - retiros
  porBarbero: Record<string, { cantidad: number; total: number }>;
}

/** Documento cajas/{yyyy-mm-dd}: apertura y cierre de un día. */
export interface Caja {
  fecha: string; // yyyy-mm-dd (fecha local)
  estado: EstadoCaja;
  montoInicial: number;
  abiertaEn?: unknown;
  cerradaEn?: unknown;
  efectivoContado?: number;
  diferencia?: number; // contado - esperado (positivo = sobrante)
  nota?: string;
  resumen?: ResumenCaja;
}

export type TipoMovimientoCaja = "gasto" | "retiro";

/** cajas/{fecha}/movimientos/{id}: salidas de efectivo del día. */
export interface MovimientoCaja {
  id?: string;
  tipo: TipoMovimientoCaja;
  descripcion: string;
  monto: number;
  creadoEn?: unknown;
}
