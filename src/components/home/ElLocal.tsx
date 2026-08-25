import Image from "next/image";
import styles from "./ElLocal.module.scss";

/**
 * Galería con fotos reales del local: la recepción y el mural de Nueva York,
 * el salón en general, un corte en acción, y las herramientas de trabajo.
 * Cada foto usa `fill` dentro de una celda con aspect-ratio fijo — así el
 * tamaño de la imagen lo decide SIEMPRE el CSS (nunca el tamaño real del
 * archivo que se suba), y no hay riesgo de que una foto se vea "gigante".
 */
const FOTOS = [
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
          {FOTOS.map((foto) => (
            <div key={foto.src} className={styles.celda}>
              <Image
                src={foto.src}
                alt={foto.alt}
                fill
                sizes="(max-width: 700px) 100vw, 50vw"
                className={styles.img}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
