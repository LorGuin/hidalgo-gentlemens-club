"use client";

import { useNegocioConfig } from "@/hooks/useNegocioConfig";
import styles from "./ElLocal.module.scss";

/**
 * Galería con fotos del local: la recepción y el mural de Nueva York, el
 * salón en general, un corte en acción, y las herramientas de trabajo.
 *
 * Cada foto se puede reemplazar desde /admin/local (self-service, igual
 * patrón que el QR de pagos o las fotos de productos: se guarda en base64
 * en config/negocio, campo fotosLocal). Si el dueño no cargó una foto
 * propia para un lugar de la galería, se usa la foto de fábrica en
 * public/images/.
 */
const FOTOS_DEFAULT = [
  {
    src: "/images/local-general.jpg",
    alt: "Interior de Hidalgo Gentlemen's Club con el mural de Nueva York de fondo",
  },
  {
    src: "/images/local-recepcion.jpg",
    alt: "Recepción de Hidalgo Gentlemen's Club",
  },
  {
    src: "/images/corte-en-accion.jpg",
    alt: "Corte de cabello en Hidalgo Gentlemen's Club",
  },
  {
    src: "/images/herramientas.jpg",
    alt: "Herramientas de barbería: máquinas, tijeras y productos",
  },
];

export default function ElLocal() {
  const { config } = useNegocioConfig();

  const fotos = FOTOS_DEFAULT.map((foto, i) => ({
    src: config.fotosLocal?.[i] || foto.src,
    alt: foto.alt,
  }));

  return (
    <section className={styles.seccion}>
      <div className={styles.contenedor}>
        <p className={styles.eyebrow}>El local</p>
        <h2>Un pedacito de Nueva York</h2>
        <p className={styles.bajada}>
          Recepción, sillones y el mural de la ciudad que nunca duerme, pintado a mano en
          nuestras paredes.
        </p>

        <div className={styles.galeria}>
          {fotos.map((foto, i) => (
            <div key={i} className={styles.celda}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.src} alt={foto.alt} className={styles.img} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
