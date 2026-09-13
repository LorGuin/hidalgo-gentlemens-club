"use client";

import { useEffect, useMemo, useState } from "react";
import { suscribirProductos } from "@/lib/firestoreServices";
import { linkWhatsapp } from "@/lib/negocio";
import { useNegocioConfig } from "@/hooks/useNegocioConfig";
import type { Producto } from "@/types";
import styles from "./Productos.module.scss";

type ItemCarrito = { producto: Producto; cantidad: number };

/**
 * Tienda simple, sin pagos online ni backend: el dueño publica productos
 * desde /admin/stock (tildando "Mostrar en la tienda online"), el cliente
 * arma un pedido acá con un carrito flotante en memoria (no se guarda en
 * ningún lado), y al confirmar se arma un mensaje de WhatsApp con el
 * detalle y el total — mismo patrón que el turnero (ver TurneroForm). El
 * dueño coordina la entrega y el cobro (efectivo, transferencia o QR de
 * Mercado Pago) directo por ese chat.
 *
 * El carrito se muestra como un botón flotante + panel, en vez de mezclar
 * selectores de cantidad adentro de cada tarjeta de producto, para que la
 * grilla de productos se vea prolija (solo un botón "Agregar" por tarjeta).
 */
export default function Productos() {
  const { config } = useNegocioConfig();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  useEffect(() => {
    const unsub = suscribirProductos((todos) => {
      setProductos(todos.filter((p) => p.publicado));
    });
    return () => unsub();
  }, []);

  function cantidadEnCarrito(id?: string) {
    return carrito.find((i) => i.producto.id === id)?.cantidad || 0;
  }

  function agregar(producto: Producto) {
    setCarrito((actual) => {
      const yaEsta = actual.find((i) => i.producto.id === producto.id);
      if (yaEsta) {
        if (yaEsta.cantidad >= producto.stock) return actual;
        return actual.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...actual, { producto, cantidad: 1 }];
    });
    setCarritoAbierto(true);
  }

  function quitar(id?: string) {
    setCarrito((actual) =>
      actual
        .map((i) => (i.producto.id === id ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0)
    );
  }

  function vaciarCarrito() {
    setCarrito([]);
    setCarritoAbierto(false);
  }

  const totalUnidades = useMemo(
    () => carrito.reduce((acc, i) => acc + i.cantidad, 0),
    [carrito]
  );

  const total = useMemo(
    () => carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0),
    [carrito]
  );

  const mensajeWhatsapp = useMemo(() => {
    const lineas = carrito
      .map(
        (i) =>
          `- ${i.producto.nombre} x${i.cantidad} = $${(i.producto.precio * i.cantidad).toLocaleString(
            "es-AR"
          )}`
      )
      .join("\n");
    return `Hola! Quiero encargar:\n${lineas}\n\nTotal: $${total.toLocaleString("es-AR")}`;
  }, [carrito, total]);

  if (productos.length === 0) return null;

  return (
    <section id="tienda" className={styles.seccion}>
      <div className={styles.contenedor}>
        <p className={styles.eyebrow}>Tienda</p>
        <h2>Productos</h2>

        <div className={styles.grilla}>
          {productos.map((p) => {
            const enCarrito = cantidadEnCarrito(p.id);
            const sinStock = p.stock <= 0;
            const agotadoEnCarrito = enCarrito >= p.stock;
            return (
              <div key={p.id} className={styles.tarjeta}>
                <div className={styles.foto}>
                  {p.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.fotoUrl} alt={p.nombre} />
                  ) : (
                    <div className={styles.fotoPlaceholder} aria-hidden="true" />
                  )}
                </div>
                <h3>{p.nombre}</h3>
                {p.descripcion && <p className={styles.descripcion}>{p.descripcion}</p>}
                <p className={styles.precio}>${p.precio.toLocaleString("es-AR")}</p>

                {sinStock ? (
                  <p className={styles.sinStock}>Sin stock por ahora</p>
                ) : (
                  <button
                    type="button"
                    className={styles.botonAgregar}
                    onClick={() => agregar(p)}
                    disabled={agotadoEnCarrito}
                  >
                    {enCarrito > 0 ? `En el pedido (${enCarrito})` : "Agregar"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {carrito.length > 0 && (
        <>
          <button
            type="button"
            className={styles.botonFlotante}
            onClick={() => setCarritoAbierto((v) => !v)}
          >
            <span className={styles.cantidadBadge}>{totalUnidades}</span>
            Ver pedido — ${total.toLocaleString("es-AR")}
          </button>

          {carritoAbierto && (
            <div className={styles.overlay} onClick={() => setCarritoAbierto(false)}>
              <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.panelHeader}>
                  <h3>Tu pedido</h3>
                  <button
                    type="button"
                    className={styles.cerrar}
                    aria-label="Cerrar pedido"
                    onClick={() => setCarritoAbierto(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.panelItems}>
                  {carrito.map(({ producto, cantidad }) => (
                    <div key={producto.id} className={styles.panelItem}>
                      <div className={styles.panelItemFoto}>
                        {producto.fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={producto.fotoUrl} alt={producto.nombre} />
                        ) : (
                          <div className={styles.fotoPlaceholder} aria-hidden="true" />
                        )}
                      </div>
                      <div className={styles.panelItemInfo}>
                        <span className={styles.panelItemNombre}>{producto.nombre}</span>
                        <span className={styles.panelItemSubtotal}>
                          ${(producto.precio * cantidad).toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div className={styles.selector}>
                        <button type="button" onClick={() => quitar(producto.id)}>
                          -
                        </button>
                        <span>{cantidad}</span>
                        <button
                          type="button"
                          onClick={() => agregar(producto)}
                          disabled={cantidad >= producto.stock}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.panelFooter}>
                  <div className={styles.panelTotal}>
                    <span>Total</span>
                    <strong>${total.toLocaleString("es-AR")}</strong>
                  </div>
                  <a
                    className={styles.botonWhatsapp}
                    href={linkWhatsapp(config.telefonoWhatsapp, mensajeWhatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Pedir por WhatsApp
                  </a>
                  <button type="button" className={styles.vaciar} onClick={vaciarCarrito}>
                    Vaciar pedido
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
