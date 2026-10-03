"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminNav from "@/components/admin/AdminNav";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNegocioConfig } from "@/hooks/useNegocioConfig";
import {
  eliminarVenta,
  guardarConfigNegocio,
  marcarVentaPagada,
  registrarVenta,
  suscribirProductos,
} from "@/lib/firestoreServices";
import {
  abrirCaja,
  calcularResumen,
  cerrarCaja,
  claveFecha,
  eliminarMovimiento,
  fechaCorta,
  fechaLarga,
  horaDe,
  pesos,
  reabrirCaja,
  registrarMovimiento,
  suscribirCaja,
  suscribirHistorialCajas,
  suscribirMovimientos,
  suscribirVentasDelDia,
  tipoDeServicio,
} from "@/lib/caja";
import type {
  Caja,
  MetodoPago,
  MovimientoCaja,
  Producto,
  TipoMovimientoCaja,
  TipoVenta,
  Venta,
} from "@/types";
import InputNumero from "@/components/ui/InputNumero";
import styles from "./page.module.scss";

/*
 * Caja diaria (reemplaza al viejo "Registrar corte / venta").
 *
 * Flujo pensado para usar desde el celular en el salón:
 *   1. Abrir la caja del día con el efectivo inicial.
 *   2. Cobro rápido: tocar el barbero → tocar el servicio → Efectivo o
 *      Transferencia/QR. Listo, queda registrado.
 *   3. Gastos y retiros de efectivo a lo largo del día.
 *   4. Cerrar la caja: contar el efectivo y la app muestra la diferencia
 *      contra lo que debería haber. El cierre queda en el historial.
 */

type Seleccion = {
  tipo: TipoVenta;
  descripcion: string;
  monto: number;
  productoId?: string;
  cantidad?: number;
};

type Modal = "apertura" | "cierre" | "qr" | "gasto" | "barberos" | "otro" | "producto" | null;

const CLAVE_BARBERO = "hidalgo:ultimoBarbero";

const ETIQUETA_PAGO: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "QR / MP",
};

export default function CajaDiariaPage() {
  const { esAdmin, cargando: cargandoAuth } = useAdminAuth();
  const { config } = useNegocioConfig();
  const qrUrl = (config as unknown as { qrUrl?: string }).qrUrl;
  const barberos = config.barberos ?? [];

  const hoy = claveFecha();
  const [fecha, setFecha] = useState(hoy);
  const esHoy = fecha === hoy;

  const [caja, setCaja] = useState<Caja | null>(null);
  const [cajaCargada, setCajaCargada] = useState(false);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [historial, setHistorial] = useState<Caja[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [barbero, setBarbero] = useState<string>("");
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const listo = !cargandoAuth && esAdmin;

  /* ----------------------------- Suscripciones ----------------------------- */

  useEffect(() => {
    if (!listo) return;
    setCajaCargada(false);
    const u1 = suscribirCaja(fecha, (c) => {
      setCaja(c);
      setCajaCargada(true);
    });
    const u2 = suscribirVentasDelDia(fecha, setVentas);
    const u3 = suscribirMovimientos(fecha, setMovimientos);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [listo, fecha]);

  useEffect(() => {
    if (!listo) return;
    const u1 = suscribirHistorialCajas(setHistorial);
    const u2 = suscribirProductos(setProductos);
    return () => {
      u1();
      u2();
    };
  }, [listo]);

  // Recordar el último barbero elegido en este dispositivo.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_BARBERO);
      if (guardado) setBarbero(guardado);
    } catch {
      /* sin localStorage: no pasa nada */
    }
  }, []);

  useEffect(() => {
    if (barbero && barberos.length > 0 && !barberos.includes(barbero)) setBarbero("");
  }, [barbero, barberos]);

  function elegirBarbero(nombre: string) {
    setBarbero(nombre);
    try {
      localStorage.setItem(CLAVE_BARBERO, nombre);
    } catch {
      /* ignorar */
    }
  }

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  /* -------------------------------- Cálculos ------------------------------- */

  const montoInicial = caja?.montoInicial ?? 0;
  const resumen = useMemo(
    () => calcularResumen(ventas, movimientos, montoInicial),
    [ventas, movimientos, montoInicial]
  );
  const abierta = caja?.estado === "abierta";
  const cerrada = caja?.estado === "cerrada";
  const puedeCobrar = esHoy && abierta;
  const pendientes = ventas.filter((v) => v.estadoPago === "pendiente");

  // Cajas de otros días que quedaron abiertas (se olvidaron de cerrarlas).
  const cajasOlvidadas = historial.filter((c) => c.estado === "abierta" && c.fecha !== hoy);

  // Feed unificado del día: ventas + gastos/retiros, más nuevos arriba.
  const feed = useMemo(() => {
    const items = [
      ...ventas.map((v) => ({ clase: "venta" as const, venta: v, ts: v.creadoEn })),
      ...movimientos.map((m) => ({ clase: "movimiento" as const, mov: m, ts: m.creadoEn })),
    ];
    const ms = (ts: unknown) =>
      (ts as { toMillis?: () => number } | undefined)?.toMillis?.() ?? Date.now();
    return items.sort((a, b) => ms(b.ts) - ms(a.ts));
  }, [ventas, movimientos]);

  /* -------------------------------- Acciones ------------------------------- */

  function elegir(sel: Seleccion) {
    if (!puedeCobrar) return;
    setSeleccion(sel);
  }

  async function cobrar(metodo: MetodoPago, estado: "pagado" | "pendiente") {
    if (!seleccion) return;
    setGuardando(true);
    try {
      await registrarVenta({
        tipo: seleccion.tipo,
        descripcion: seleccion.descripcion,
        monto: seleccion.monto,
        metodoPago: metodo,
        estadoPago: estado,
        barbero: seleccion.tipo === "producto" ? undefined : barbero || undefined,
        productoId: seleccion.productoId,
        cantidadProducto: seleccion.productoId ? seleccion.cantidad ?? 1 : undefined,
      });
      setAviso(
        `${seleccion.descripcion} · ${pesos(seleccion.monto)} — ${
          estado === "pendiente" ? "queda pendiente de cobro" : `cobrado (${ETIQUETA_PAGO[metodo]})`
        }`
      );
      setSeleccion(null);
      setModal(null);
    } finally {
      setGuardando(false);
    }
  }

  async function borrarVenta(v: Venta) {
    const ok = window.confirm(
      `¿Borrar "${v.descripcion}" (${pesos(v.monto)})?` +
        (v.productoId ? " El stock del producto se repone solo." : "")
    );
    if (ok) await eliminarVenta(v);
  }

  async function borrarMovimiento(m: MovimientoCaja) {
    if (!m.id) return;
    const ok = window.confirm(`¿Borrar el ${m.tipo} "${m.descripcion}" (${pesos(m.monto)})?`);
    if (ok) await eliminarMovimiento(fecha, m.id);
  }

  async function guardarBarberos(lista: string[]) {
    await guardarConfigNegocio({ barberos: lista });
  }

  /* --------------------------------- Render -------------------------------- */

  const servicios = config.servicios ?? [];
  const necesitaBarbero = barberos.length > 0 && !barbero;

  return (
    <AdminGuard>
      <AdminNav />
      <div className={styles.pagina}>
        {/* ------------------------------ Encabezado ------------------------------ */}
        <header className={styles.encabezado}>
          <div>
            <p className={styles.eyebrow}>Caja diaria</p>
            <h1>{esHoy ? "Hoy" : fechaCorta(fecha)}</h1>
            <p className={styles.fecha}>{fechaLarga(fecha)}</p>
          </div>
          <div className={styles.encabezadoAcciones}>
            {cajaCargada && (
              <span
                className={`${styles.estado} ${
                  abierta ? styles.estadoAbierta : cerrada ? styles.estadoCerrada : ""
                }`}
              >
                {abierta ? "Caja abierta" : cerrada ? "Caja cerrada" : "Sin abrir"}
              </span>
            )}
            {!esHoy && (
              <button className={styles.botonFantasma} onClick={() => setFecha(hoy)}>
                Volver a hoy
              </button>
            )}
          </div>
        </header>

        {cajasOlvidadas.length > 0 && esHoy && (
          <div className={styles.alerta}>
            <span>
              {cajasOlvidadas.length === 1
                ? `La caja del ${fechaCorta(cajasOlvidadas[0].fecha)} quedó abierta.`
                : `Hay ${cajasOlvidadas.length} cajas de días anteriores sin cerrar.`}
            </span>
            <button onClick={() => setFecha(cajasOlvidadas[0].fecha)}>Ir a cerrarla</button>
          </div>
        )}

        {/* --------------------------- Apertura / cierre -------------------------- */}
        {cajaCargada && !caja && esHoy && (
          <section className={styles.abrirCard}>
            <div>
              <h2>Arrancá el día</h2>
              <p>Abrí la caja con el efectivo que hay para dar cambio, y empezá a cobrar.</p>
            </div>
            <button className={styles.botonPrimario} onClick={() => setModal("apertura")}>
              Abrir caja
            </button>
          </section>
        )}
        {cajaCargada && !caja && !esHoy && (
          <section className={styles.abrirCard}>
            <p>Ese día no se abrió la caja.</p>
          </section>
        )}

        {caja && (
          <>
            {/* -------------------------------- KPIs -------------------------------- */}
            <section className={styles.kpis} aria-label="Resumen del día">
              <div className={`${styles.kpi} ${styles.kpiDestacado}`}>
                <span>Total cobrado</span>
                <strong>{pesos(resumen.totalCobrado)}</strong>
                <small>
                  {resumen.cantidadServicios} {resumen.cantidadServicios === 1 ? "servicio" : "servicios"} ·{" "}
                  {resumen.cantidadVentas} {resumen.cantidadVentas === 1 ? "movimiento" : "movimientos"}
                </small>
              </div>
              <div className={styles.kpi}>
                <span>Efectivo</span>
                <strong>{pesos(resumen.efectivo)}</strong>
              </div>
              <div className={styles.kpi}>
                <span>Transferencia / QR</span>
                <strong>{pesos(resumen.digital)}</strong>
              </div>
              <div className={`${styles.kpi} ${resumen.pendiente > 0 ? styles.kpiAlerta : ""}`}>
                <span>Pendiente</span>
                <strong>{pesos(resumen.pendiente)}</strong>
              </div>
              <div className={styles.kpi}>
                <span>Gastos y retiros</span>
                <strong>−{pesos(resumen.gastos + resumen.retiros)}</strong>
              </div>
              <div className={styles.kpi}>
                <span>Efectivo en caja</span>
                <strong>{pesos(resumen.efectivoEsperado)}</strong>
                <small>Inicial {pesos(montoInicial)}</small>
              </div>
            </section>

            {/* ----------------------------- Cobro rápido ---------------------------- */}
            {puedeCobrar && (
              <section className={styles.panel}>
                <div className={styles.panelTitulo}>
                  <h2>Cobro rápido</h2>
                  <button className={styles.botonFantasma} onClick={() => setModal("barberos")}>
                    {barberos.length ? "Editar barberos" : "Agregar barberos"}
                  </button>
                </div>

                {barberos.length > 0 && (
                  <>
                    <p className={styles.paso}>1 · ¿Quién atiende?</p>
                    <div className={styles.chips}>
                      {barberos.map((b) => (
                        <button
                          key={b}
                          className={`${styles.chip} ${barbero === b ? styles.chipActivo : ""}`}
                          onClick={() => elegirBarbero(b)}
                        >
                          <span className={styles.avatar}>{b.charAt(0).toUpperCase()}</span>
                          {b}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <p className={styles.paso}>{barberos.length > 0 ? "2 · " : ""}¿Qué se cobra?</p>
                <div className={`${styles.servicios} ${necesitaBarbero ? styles.bloqueado : ""}`}>
                  {servicios.map((s) => (
                    <button
                      key={s.nombre}
                      className={styles.servicio}
                      disabled={necesitaBarbero}
                      onClick={() =>
                        elegir({ tipo: tipoDeServicio(s.nombre), descripcion: s.nombre, monto: s.precio })
                      }
                    >
                      <span className={styles.servicioNombre}>{s.nombre}</span>
                      <span className={styles.servicioPrecio}>{pesos(s.precio)}</span>
                    </button>
                  ))}
                  <button
                    className={`${styles.servicio} ${styles.servicioAlt}`}
                    onClick={() => setModal("producto")}
                  >
                    <span className={styles.servicioNombre}>Producto</span>
                    <span className={styles.servicioPrecio}>de la tienda / stock</span>
                  </button>
                  <button
                    className={`${styles.servicio} ${styles.servicioAlt}`}
                    disabled={necesitaBarbero}
                    onClick={() => setModal("otro")}
                  >
                    <span className={styles.servicioNombre}>Otro</span>
                    <span className={styles.servicioPrecio}>monto libre</span>
                  </button>
                </div>
                {necesitaBarbero && (
                  <p className={styles.ayudaChica}>Elegí primero quién atiende.</p>
                )}
              </section>
            )}

            {/* --------------------------- Acciones de caja --------------------------- */}
            <div className={styles.accionesCaja}>
              {abierta && (
                <button className={styles.botonSecundario} onClick={() => setModal("gasto")}>
                  − Gasto / retiro
                </button>
              )}
              {abierta && (
                <button className={styles.botonPrimario} onClick={() => setModal("cierre")}>
                  Cerrar caja
                </button>
              )}
              {cerrada && (
                <button
                  className={styles.botonFantasma}
                  onClick={async () => {
                    if (window.confirm("¿Reabrir esta caja para corregir algo? Después la volvés a cerrar."))
                      await reabrirCaja(fecha);
                  }}
                >
                  Reabrir caja
                </button>
              )}
            </div>

            {/* ------------------------------ Cierre ------------------------------- */}
            {cerrada && caja.resumen && (
              <section className={styles.cierreCard}>
                <h2>Cierre del día</h2>
                <dl>
                  <div>
                    <dt>Efectivo esperado</dt>
                    <dd>{pesos(caja.resumen.efectivoEsperado)}</dd>
                  </div>
                  <div>
                    <dt>Efectivo contado</dt>
                    <dd>{pesos(caja.efectivoContado ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Diferencia</dt>
                    <dd className={claseDiferencia(caja.diferencia ?? 0)}>
                      {textoDiferencia(caja.diferencia ?? 0)}
                    </dd>
                  </div>
                </dl>
                {caja.nota && <p className={styles.nota}>“{caja.nota}”</p>}
              </section>
            )}

            {/* ---------------------------- Por barbero ----------------------------- */}
            {Object.keys(resumen.porBarbero).length > 0 && (
              <section className={styles.panel}>
                <h2>Por barbero</h2>
                <ul className={styles.barberos}>
                  {Object.entries(resumen.porBarbero)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([nombre, r]) => (
                      <li key={nombre}>
                        <span className={styles.avatar}>{nombre.charAt(0).toUpperCase()}</span>
                        <span className={styles.barberoNombre}>{nombre}</span>
                        <span className={styles.barberoCantidad}>
                          {r.cantidad} {r.cantidad === 1 ? "corte" : "cortes"}
                        </span>
                        <strong>{pesos(r.total)}</strong>
                      </li>
                    ))}
                </ul>
              </section>
            )}

            {/* ---------------------------- Movimientos ---------------------------- */}
            <section className={styles.panel}>
              <div className={styles.panelTitulo}>
                <h2>Movimientos</h2>
                {pendientes.length > 0 && (
                  <span className={styles.badgePendiente}>
                    {pendientes.length} pendiente{pendientes.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {feed.length === 0 ? (
                <p className={styles.vacio}>Todavía no hay movimientos.</p>
              ) : (
                <ul className={styles.feed}>
                  {feed.map((item) =>
                    item.clase === "venta" ? (
                      <li key={`v-${item.venta.id}`} className={styles.feedItem}>
                        <span className={styles.feedHora}>{horaDe(item.venta.creadoEn)}</span>
                        <div className={styles.feedInfo}>
                          <span className={styles.feedTitulo}>{item.venta.descripcion}</span>
                          <span className={styles.feedMeta}>
                            {item.venta.barbero ? `${item.venta.barbero} · ` : ""}
                            {ETIQUETA_PAGO[item.venta.metodoPago] ?? item.venta.metodoPago}
                            {item.venta.estadoPago === "pendiente" && (
                              <em className={styles.etiquetaPendiente}>pendiente</em>
                            )}
                          </span>
                        </div>
                        <strong className={styles.feedMonto}>{pesos(item.venta.monto)}</strong>
                        <div className={styles.feedAcciones}>
                          {item.venta.estadoPago === "pendiente" && (
                            <button
                              className={styles.botonMini}
                              onClick={() => item.venta.id && marcarVentaPagada(item.venta.id, "manual")}
                            >
                              Cobrado
                            </button>
                          )}
                          {!cerrada && (
                            <button
                              className={styles.botonBorrar}
                              aria-label={`Borrar ${item.venta.descripcion}`}
                              onClick={() => borrarVenta(item.venta)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </li>
                    ) : (
                      <li key={`m-${item.mov.id}`} className={`${styles.feedItem} ${styles.feedSalida}`}>
                        <span className={styles.feedHora}>{horaDe(item.mov.creadoEn)}</span>
                        <div className={styles.feedInfo}>
                          <span className={styles.feedTitulo}>{item.mov.descripcion}</span>
                          <span className={styles.feedMeta}>
                            {item.mov.tipo === "gasto" ? "Gasto" : "Retiro"} · efectivo
                          </span>
                        </div>
                        <strong className={styles.feedMonto}>−{pesos(item.mov.monto)}</strong>
                        <div className={styles.feedAcciones}>
                          {!cerrada && (
                            <button
                              className={styles.botonBorrar}
                              aria-label={`Borrar ${item.mov.descripcion}`}
                              onClick={() => borrarMovimiento(item.mov)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}
            </section>
          </>
        )}

        {/* ------------------------------ Historial ------------------------------ */}
        <section className={styles.panel}>
          <h2>Historial</h2>
          {historial.length === 0 ? (
            <p className={styles.vacio}>Acá vas a ver las cajas de cada día.</p>
          ) : (
            <div className={styles.tablaScroll}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Cobrado</th>
                    <th>Efectivo</th>
                    <th>Transf./QR</th>
                    <th>Gastos</th>
                    <th>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((c) => (
                    <tr
                      key={c.fecha}
                      className={c.fecha === fecha ? styles.filaActiva : ""}
                      onClick={() => setFecha(c.fecha)}
                    >
                      <td>
                        <button className={styles.linkDia}>{fechaCorta(c.fecha)}</button>
                        {c.estado === "abierta" && <span className={styles.puntoAbierta} title="Abierta" />}
                      </td>
                      <td>{c.resumen ? pesos(c.resumen.totalCobrado) : "—"}</td>
                      <td>{c.resumen ? pesos(c.resumen.efectivo) : "—"}</td>
                      <td>{c.resumen ? pesos(c.resumen.digital) : "—"}</td>
                      <td>{c.resumen ? pesos(c.resumen.gastos + c.resumen.retiros) : "—"}</td>
                      <td className={c.estado === "cerrada" ? claseDiferencia(c.diferencia ?? 0) : ""}>
                        {c.estado === "cerrada" ? textoDiferencia(c.diferencia ?? 0) : "abierta"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ------------------------- Barra de confirmación ------------------------- */}
      {seleccion && modal === null && (
        <div className={styles.barraCobro} role="dialog" aria-label="Confirmar cobro">
          <div className={styles.barraInfo}>
            <span className={styles.barraTitulo}>
              {seleccion.descripcion}
              {seleccion.cantidad && seleccion.cantidad > 1 ? ` x${seleccion.cantidad}` : ""}
            </span>
            <span className={styles.barraMeta}>
              {seleccion.tipo !== "producto" && barbero ? `Atiende ${barbero}` : "Confirmá el monto"}
            </span>
          </div>
          <label className={styles.barraMonto}>
            <span>$</span>
            <InputNumero
              value={seleccion.monto}
              onChange={(n) => setSeleccion({ ...seleccion, monto: n ?? 0 })}
              placeholder="0"
              aria-label="Monto"
            />
          </label>
          <div className={styles.barraBotones}>
            <button
              className={styles.botonEfectivo}
              disabled={guardando || seleccion.monto <= 0}
              onClick={() => cobrar("efectivo", "pagado")}
            >
              Efectivo
            </button>
            <button
              className={styles.botonDigital}
              disabled={guardando || seleccion.monto <= 0}
              onClick={() => setModal("qr")}
            >
              Transf. / QR
            </button>
            <button className={styles.botonCancelar} onClick={() => setSeleccion(null)} aria-label="Cancelar">
              ×
            </button>
          </div>
        </div>
      )}

      {aviso && <div className={styles.toast}>{aviso}</div>}

      {/* --------------------------------- Modales -------------------------------- */}
      {modal === "apertura" && (
        <ModalApertura
          onCerrar={() => setModal(null)}
          onConfirmar={async (monto) => {
            await abrirCaja(fecha, monto);
            setModal(null);
            setAviso("Caja abierta. ¡Buen día de trabajo!");
          }}
        />
      )}

      {modal === "cierre" && caja && (
        <ModalCierre
          esperado={resumen.efectivoEsperado}
          pendientes={pendientes.length}
          onCerrar={() => setModal(null)}
          onConfirmar={async (contado, nota) => {
            await cerrarCaja(fecha, { efectivoContado: contado, resumen, nota });
            setModal(null);
            setAviso("Caja cerrada ✔");
          }}
        />
      )}

      {modal === "gasto" && (
        <ModalGasto
          onCerrar={() => setModal(null)}
          onConfirmar={async (tipo, descripcion, monto) => {
            await registrarMovimiento(fecha, { tipo, descripcion, monto });
            setModal(null);
            setAviso(`${tipo === "gasto" ? "Gasto" : "Retiro"} registrado: ${pesos(monto)}`);
          }}
        />
      )}

      {modal === "barberos" && (
        <ModalBarberos
          barberos={barberos}
          onCerrar={() => setModal(null)}
          onGuardar={async (lista) => {
            await guardarBarberos(lista);
            setModal(null);
          }}
        />
      )}

      {modal === "otro" && (
        <ModalOtro
          onCerrar={() => setModal(null)}
          onConfirmar={(descripcion, monto) => {
            setSeleccion({ tipo: "otro", descripcion, monto });
            setModal(null);
          }}
        />
      )}

      {modal === "producto" && (
        <ModalProducto
          productos={productos}
          onCerrar={() => setModal(null)}
          onConfirmar={(p, cantidad) => {
            setSeleccion({
              tipo: "producto",
              descripcion: p.nombre,
              monto: p.precio * cantidad,
              productoId: p.id,
              cantidad,
            });
            setModal(null);
          }}
        />
      )}

      {modal === "qr" && seleccion && (
        <Overlay onCerrar={() => setModal(null)} titulo="Cobro por transferencia / QR">
          <p className={styles.modalTexto}>
            {seleccion.descripcion} · <strong>{pesos(seleccion.monto)}</strong>
          </p>
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.qr} src={qrUrl} alt="QR de cobro" width={220} height={220} />
          ) : (
            <p className={styles.modalTexto}>
              Alias para transferir: <strong>{config.alias}</strong>
              <br />
              <small>(Podés cargar tu QR en la sección Pagos.)</small>
            </p>
          )}
          <div className={styles.modalBotones}>
            <button
              className={styles.botonPrimario}
              disabled={guardando}
              onClick={() => cobrar("transferencia", "pagado")}
            >
              Ya me pagó
            </button>
            <button
              className={styles.botonSecundario}
              disabled={guardando}
              onClick={() => cobrar("transferencia", "pendiente")}
            >
              Queda pendiente
            </button>
          </div>
        </Overlay>
      )}
    </AdminGuard>
  );
}

/* ------------------------------ Helpers de UI ------------------------------ */

function claseDiferencia(dif: number) {
  if (dif === 0) return styles.difCero;
  return dif > 0 ? styles.difPositiva : styles.difNegativa;
}

function textoDiferencia(dif: number) {
  if (dif === 0) return "Justo ✔";
  return dif > 0 ? `Sobran ${pesos(dif)}` : `Faltan ${pesos(-dif)}`;
}

function Overlay({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>{titulo}</h3>
          <button className={styles.botonCancelar} onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CampoMonto({
  valor,
  onChange,
  etiqueta,
  autoFocus,
}: {
  valor: number | null;
  onChange: (v: number | null) => void;
  etiqueta: string;
  autoFocus?: boolean;
}) {
  return (
    <label className={styles.campo}>
      <span>{etiqueta}</span>
      <div className={styles.inputPesos}>
        <span>$</span>
        <InputNumero
          value={valor}
          autoFocus={autoFocus}
          onChange={onChange}
          placeholder="0"
        />
      </div>
    </label>
  );
}

function ModalApertura({
  onCerrar,
  onConfirmar,
}: {
  onCerrar: () => void;
  onConfirmar: (monto: number) => Promise<void>;
}) {
  const [monto, setMonto] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await onConfirmar(monto ?? 0);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Overlay titulo="Abrir caja" onCerrar={onCerrar}>
      <form onSubmit={enviar} className={styles.modalForm}>
        <p className={styles.modalTexto}>¿Con cuánto efectivo arrancás el día (cambio)?</p>
        <CampoMonto etiqueta="Efectivo inicial" valor={monto} onChange={setMonto} autoFocus />
        <button className={styles.botonPrimario} disabled={enviando}>
          Abrir caja
        </button>
      </form>
    </Overlay>
  );
}

function ModalCierre({
  esperado,
  pendientes,
  onCerrar,
  onConfirmar,
}: {
  esperado: number;
  pendientes: number;
  onCerrar: () => void;
  onConfirmar: (contado: number, nota: string) => Promise<void>;
}) {
  const [contado, setContado] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const dif = contado === null ? null : contado - esperado;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await onConfirmar(contado ?? 0, nota.trim());
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Overlay titulo="Cerrar caja" onCerrar={onCerrar}>
      <form onSubmit={enviar} className={styles.modalForm}>
        <div className={styles.esperado}>
          <span>Debería haber en efectivo</span>
          <strong>{pesos(esperado)}</strong>
        </div>
        {pendientes > 0 && (
          <p className={styles.alertaChica}>
            Ojo: hay {pendientes} cobro{pendientes === 1 ? "" : "s"} pendiente
            {pendientes === 1 ? "" : "s"} sin confirmar.
          </p>
        )}
        <CampoMonto etiqueta="Efectivo contado" valor={contado} onChange={setContado} autoFocus />
        {dif !== null && (
          <p className={`${styles.difGrande} ${claseDiferencia(dif)}`}>{textoDiferencia(dif)}</p>
        )}
        <label className={styles.campo}>
          <span>Nota (opcional)</span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: faltan $500, se dio mal un vuelto"
          />
        </label>
        <button className={styles.botonPrimario} disabled={enviando || contado === null}>
          Confirmar cierre
        </button>
      </form>
    </Overlay>
  );
}

function ModalGasto({
  onCerrar,
  onConfirmar,
}: {
  onCerrar: () => void;
  onConfirmar: (tipo: TipoMovimientoCaja, descripcion: string, monto: number) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoMovimientoCaja>("gasto");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!monto) return;
    setEnviando(true);
    try {
      await onConfirmar(
        tipo,
        descripcion.trim() || (tipo === "gasto" ? "Gasto" : "Retiro"),
        monto
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Overlay titulo="Salida de efectivo" onCerrar={onCerrar}>
      <form onSubmit={enviar} className={styles.modalForm}>
        <div className={styles.segmentado} role="radiogroup">
          {(["gasto", "retiro"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              className={tipo === t ? styles.segmentoActivo : ""}
              onClick={() => setTipo(t)}
            >
              {t === "gasto" ? "Gasto" : "Retiro"}
            </button>
          ))}
        </div>
        <p className={styles.ayudaChica}>
          {tipo === "gasto"
            ? "Compras del día pagadas con la caja: insumos, limpieza, café..."
            : "Plata que se saca de la caja (por ejemplo, el dueño o un pago a un barbero)."}
        </p>
        <label className={styles.campo}>
          <span>Descripción</span>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={tipo === "gasto" ? "Ej: navajas descartables" : "Ej: retiro Juan"}
          />
        </label>
        <CampoMonto etiqueta="Monto" valor={monto} onChange={setMonto} />
        <button className={styles.botonPrimario} disabled={enviando || !monto}>
          Registrar {tipo}
        </button>
      </form>
    </Overlay>
  );
}

function ModalOtro({
  onCerrar,
  onConfirmar,
}: {
  onCerrar: () => void;
  onConfirmar: (descripcion: string, monto: number) => void;
}) {
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState<number | null>(null);
  return (
    <Overlay titulo="Otro cobro" onCerrar={onCerrar}>
      <form
        className={styles.modalForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (descripcion.trim() && monto) onConfirmar(descripcion.trim(), monto);
        }}
      >
        <label className={styles.campo}>
          <span>Descripción</span>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: perfilado de cejas"
            autoFocus
            required
          />
        </label>
        <CampoMonto etiqueta="Monto" valor={monto} onChange={setMonto} />
        <button className={styles.botonPrimario} disabled={!descripcion.trim() || !monto}>
          Continuar
        </button>
      </form>
    </Overlay>
  );
}

function ModalProducto({
  productos,
  onCerrar,
  onConfirmar,
}: {
  productos: Producto[];
  onCerrar: () => void;
  onConfirmar: (p: Producto, cantidad: number) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const lista = productos
    .filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <Overlay titulo="Vender producto" onCerrar={onCerrar}>
      {!elegido ? (
        <>
          <input
            className={styles.buscador}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            autoFocus
          />
          <ul className={styles.listaProductos}>
            {lista.map((p) => (
              <li key={p.id}>
                <button disabled={p.stock <= 0} onClick={() => setElegido(p)}>
                  <span>{p.nombre}</span>
                  <small>{p.stock > 0 ? `stock ${p.stock}` : "sin stock"}</small>
                  <strong>{pesos(p.precio)}</strong>
                </button>
              </li>
            ))}
            {lista.length === 0 && <li className={styles.vacio}>No hay productos.</li>}
          </ul>
        </>
      ) : (
        <div className={styles.modalForm}>
          <p className={styles.modalTexto}>
            <strong>{elegido.nombre}</strong> · {pesos(elegido.precio)} c/u
          </p>
          <div className={styles.contador}>
            <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>
              −
            </button>
            <span>{cantidad}</span>
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.min(elegido.stock, c + 1))}
              disabled={cantidad >= elegido.stock}
            >
              +
            </button>
          </div>
          <p className={styles.modalTexto}>
            Total: <strong>{pesos(elegido.precio * cantidad)}</strong>
          </p>
          <div className={styles.modalBotones}>
            <button className={styles.botonPrimario} onClick={() => onConfirmar(elegido, cantidad)}>
              Continuar
            </button>
            <button className={styles.botonFantasma} onClick={() => setElegido(null)}>
              Elegir otro
            </button>
          </div>
        </div>
      )}
    </Overlay>
  );
}

function ModalBarberos({
  barberos,
  onCerrar,
  onGuardar,
}: {
  barberos: string[];
  onCerrar: () => void;
  onGuardar: (lista: string[]) => Promise<void>;
}) {
  const [lista, setLista] = useState(barberos);
  const [nuevo, setNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);

  function agregar(e: FormEvent) {
    e.preventDefault();
    const n = nuevo.trim();
    if (n && !lista.some((b) => b.toLowerCase() === n.toLowerCase())) setLista([...lista, n]);
    setNuevo("");
  }

  return (
    <Overlay titulo="Barberos" onCerrar={onCerrar}>
      <p className={styles.ayudaChica}>
        Cada corte se asigna al barbero que atiende, así ves cuánto hizo cada uno.
      </p>
      <ul className={styles.listaBarberos}>
        {lista.map((b) => (
          <li key={b}>
            <span className={styles.avatar}>{b.charAt(0).toUpperCase()}</span>
            <span>{b}</span>
            <button
              className={styles.botonBorrar}
              onClick={() => setLista(lista.filter((x) => x !== b))}
              aria-label={`Quitar a ${b}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={agregar} className={styles.agregarBarbero}>
        <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nombre" />
        <button className={styles.botonSecundario} disabled={!nuevo.trim()}>
          Agregar
        </button>
      </form>
      <button
        className={styles.botonPrimario}
        disabled={guardando}
        onClick={async () => {
          setGuardando(true);
          try {
            await onGuardar(lista);
          } finally {
            setGuardando(false);
          }
        }}
      >
        Guardar
      </button>
    </Overlay>
  );
}
