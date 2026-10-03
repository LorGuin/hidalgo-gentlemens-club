import Link from "next/link";
import styles from "./Productos.module.scss";

// Foto de ropa (Unsplash, la misma de la portada de /tienda). Para usar una
// foto propia, poner la imagen en /public/images y cambiar esta ruta.
const FOTO_TIENDA =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70";

/**
 * Banner "Visitá nuestra tienda" del home.
 *
 * Antes acá había una grilla con todos los productos + carrito, pero hacía
 * la página muy larga y mezclaba la barbería con la venta de ropa. Ahora la
 * tienda vive completa en /tienda (filtros, carrito y pedido por WhatsApp) y
 * en el home queda solo este banner, con una estética distinta (fondo negro)
 * para separar visualmente la barbería del e-commerce.
 */
export default function Productos() {
  return (
    <section id="tienda" className={styles.seccion} aria-labelledby="tienda-titulo">
      <div className={styles.contenedor}>
        <div className={styles.texto}>
          <p className={styles.eyebrow}>Hidalgo Store</p>
          <h2 id="tienda-titulo">Visitá nuestra tienda</h2>
          <p className={styles.bajada}>
            Ropa y accesorios con la misma onda del salón: remeras, gorras y más. Armá tu pedido
            online y lo coordinamos por WhatsApp.
          </p>
          <Link href="/tienda" className={styles.boton}>
            Ir a la tienda
          </Link>
        </div>

        <Link href="/tienda" className={styles.foto} tabIndex={-1} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FOTO_TIENDA} alt="" loading="lazy" />
        </Link>
      </div>
    </section>
  );
}
