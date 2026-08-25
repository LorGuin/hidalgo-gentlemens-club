import Link from "next/link";
import NYCSkyline from "@/components/ui/NYCSkyline";
import { NEGOCIO_DEFAULT } from "@/lib/negocio";
import styles from "./Hero.module.scss";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.fondo} aria-hidden="true" />
      <NYCSkyline className={styles.skyline} />

      <div className={styles.contenido}>
        <p className={styles.eyebrow}>Barbería clásica americana</p>
        <h1>
          Cortes con estilo <span>Nueva York</span>
        </h1>
        <p className={styles.bajada}>
          Corte, barba y afeitado a navaja en {NEGOCIO_DEFAULT.direccion}. Reservá tu turno
          online en menos de un minuto.
        </p>
        <div className={styles.acciones}>
          <Link href="/turnos" className={styles.botonPrimario}>
            Reservar turno
          </Link>
          <Link href="#ubicacion" className={styles.botonSecundario}>
            Cómo llegar
          </Link>
        </div>
      </div>
    </section>
  );
}
