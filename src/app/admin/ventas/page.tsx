"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminNav from "@/components/admin/AdminNav";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  registrarVenta,
  suscribirProductos,
  suscribirVentasDesde,
  marcarVentaPagada,
  eliminarVenta,
} from "@/lib/firestoreServices";
import { useNegocioConfig } from "@/hooks/useNegocioConfig";
import { NEGOCIO_DEFAULT } from "@/lib/negocio";
import type { Producto, TipoVenta, Venta } from "@/types";
import { Timestamp } from "firebase/firestore";
import styles from "./page.module.scss";

const TIPOS: { valor: TipoVenta; etiqueta: string }[] = [
  { valor: "corte", etiqueta: "Corte de cabello" },
  { valor: "barba", etiqueta: "Arreglo de barba" },
  { valor: "combo", etiqueta: "Corte + Barba" },
  { valor: "producto", etiqueta: "Venta de producto" },
  { valor: "otro", etiqueta: "Otro" },
];

function inicioDelDia() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatoHora(venta: Venta) {
  const ts = venta.creadoEn as Timestamp | undefined;
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * El cobro con QR acá NO genera un cobro dinámico por backend (eso
 * requeriría tener un servidor corriendo todo el tiempo y un token de
 * Mercado Pago). En cambio, muestra el QR fijo que ya cargaste en
 * /admin/pagos — el mismo que ve el cliente al confirmar un turno — y vos
 * marcás a mano cuando el pago llegó. Simple y sin nada que mantener.
 */
export default function AdminVentasPage() {
  const { esAdmin, cargando: cargandoAuth } = useAdminAuth();
  const { config } = useNegocioConfig();
  const qrUrl = (config as unknown as { qrUrl?: string }).qrUrl;
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([]);
  const [tipo, setTipo] = useState<TipoVenta>("corte");
  const [descripcion, setDescripcion] = useState(NEGOCIO_DEFAULT.servicios[0]?.nombre || "");
  const [monto, setMonto] = useState(NEGOCIO_DEFAULT.servicios[0]?.precio || 0);
  const [productoId, setProductoId] = useState("");
  const [cantidadProducto, setCantidadProducto] = useState(1);

  const [guardando, setGuardando] = useState(false);
  const [ultimaVentaId, setUltimaVentaId] = useState<string | null>(null);
  const [mostrandoQr, setMostrandoQr] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    // Esperamos a que termine de confirmarse el login de admin antes de
    // pedir nada — si no, Firestore rechaza el pedido con "permission
    // denied" porque todavía no hay usuario autenticado.
    if (cargandoAuth || !esAdmin) return;
    const unsub = suscribirProductos(setProductos);
    return () => unsub();
  }, [cargandoAuth, esAdmin]);

  useEffect(() => {
    if (cargandoAuth || !esAdmin) return;
    const unsub = suscribirVentasDesde(inicioDelDia(), setVentasHoy);
    return () => unsub();
  }, [cargandoAuth, esAdmin]);

  function limpiar() {
    setDescripcion("");
    setMonto(0);
    setProductoId("");
    setCantidadProducto(1);
    setMostrandoQr(false);
    setUltimaVentaId(null);
  }

  async function registrarEfectivo(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const id = await registrarVenta({
        tipo,
        descripcion,
        monto,
        metodoPago: "efectivo",
        estadoPago: "pagado",
        productoId: tipo === "producto" ? productoId || undefined : undefined,
        cantidadProducto: tipo === "producto" ? cantidadProducto : undefined,
      });
      setUltimaVentaId(id);
      setMensaje("Venta registrada como pagada en efectivo ✅");
      limpiar();
    } finally {
      setGuardando(false);
    }
  }

  async function cobrarConQr() {
    setGuardando(true);
    setMensaje(null);
    try {
      const id = await registrarVenta({
        tipo,
        descripcion,
        monto,
        metodoPago: "mercadopago",
        estadoPago: "pendiente",
        productoId: tipo === "producto" ? productoId || undefined : undefined,
        cantidadProducto: tipo === "producto" ? cantidadProducto : undefined,
      });
      setUltimaVentaId(id);
      setMostrandoQr(true);
    } finally {
      setGuardando(false);
    }
  }

  async function marcarComoPagada() {
    if (!ultimaVentaId) return;
    await marcarVentaPagada(ultimaVentaId, "manual");
    setMensaje("Venta marcada como pagada ✅");
    limpiar();
  }

  async function borrarVenta(venta: Venta) {
    const confirmado = window.confirm(
      `¿Borrar "${venta.descripcion}" ($${venta.monto.toLocaleString("es-AR")})? ` +
        (venta.productoId ? "El stock del producto se repone solo." : "")
    );
    if (!confirmado) return;
    await eliminarVenta(venta);
  }

  return (
    <AdminGuard>
      <AdminNav />
      <div className={styles.pagina}>
        <h1>Registrar corte / venta</h1>
        <p className={styles.ayuda}>
          Cargá el servicio o producto vendido. Podés cobrarlo directo en efectivo, o mostrarle
          al cliente el QR para que pague desde su celular.
        </p>

        <form className={styles.form} onSubmit={registrarEfectivo}>
          <div className={styles.grupo}>
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoVenta)}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {tipo === "producto" && (
            <div className={styles.grupo}>
              <label>Producto</label>
              <select
                value={productoId}
                onChange={(e) => {
                  const p = productos.find((prod) => prod.id === e.target.value);
                  setProductoId(e.target.value);
                  if (p) {
                    setDescripcion(p.nombre);
                    setMonto(p.precio);
                  }
                }}
              >
                <option value="">Elegí un producto</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.grupo}>
            <label>Descripción</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
          </div>

          <div className={styles.fila}>
            <div className={styles.grupo}>
              <label>Monto ($)</label>
              <input
                type="number"
                min={0}
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                required
              />
            </div>

            {tipo === "producto" && (
              <div className={styles.grupo}>
                <label>Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <div className={styles.acciones}>
            <button type="submit" disabled={guardando}>
              Cobrar en efectivo
            </button>
            <button type="button" className={styles.botonQr} onClick={cobrarConQr} disabled={guardando}>
              Cobrar con QR / transferencia
            </button>
          </div>
        </form>

        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}

        {mostrandoQr && (
          <div className={styles.qrBox}>
            {qrUrl ? (
              <>
                <p>Mostrale este QR al cliente para que pague desde su celular:</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR de cobro" width={240} height={240} />
              </>
            ) : (
              <p>
                Todavía no cargaste ningún QR en <strong>Pagos</strong>. Podés pedirle igual que
                transfiera al alias <strong>{config.alias}</strong>.
              </p>
            )}
            <p className={styles.nota}>
              Cuando confirmes que te llegó el pago, marcalo como pagado acá abajo.
            </p>
            <button className={styles.marcarManual} onClick={marcarComoPagada}>
              Ya me pagó — marcar como pagado
            </button>
          </div>
        )}

        <div className={styles.registro}>
          <h2>Registro de hoy</h2>
          <p className={styles.ayudaChica}>
            Si cargaste algo mal, borralo acá — si era un producto, el stock se repone solo.
          </p>

          <table className={styles.tablaRegistro}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ventasHoy.map((v) => (
                <tr key={v.id}>
                  <td>{formatoHora(v)}</td>
                  <td>{v.tipo}</td>
                  <td>{v.descripcion}</td>
                  <td>${v.monto.toLocaleString("es-AR")}</td>
                  <td>
                    {v.metodoPago}
                    {v.estadoPago === "pendiente" ? " (pendiente)" : ""}
                  </td>
                  <td>
                    <button className={styles.botonBorrar} onClick={() => borrarVenta(v)}>
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
              {ventasHoy.length === 0 && (
                <tr>
                  <td colSpan={6}>Todavía no registraste nada hoy.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}