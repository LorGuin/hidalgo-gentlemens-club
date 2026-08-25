import Image from "next/image";
import { NEGOCIO_DEFAULT } from "@/lib/negocio";
import styles from "./SobreMi.module.scss";

export default function SobreMi() {
  const negocio = NEGOCIO_DEFAULT;

  return (
    <section id="sobre-mi" className={styles.seccion}>
      <div className={styles.contenedor}>
        <div className={styles.foto}>
          <Image
            src={negocio.fotoUrl || "/images/dueno.jpg"}
            alt={`Dueño de ${negocio.nombre}`}
            width={480}
            height={560}
            className={styles.img}
            priority
          />
        </div>

        <div className={styles.texto}>
          <p className={styles.eyebrow}>Sobre mí</p>
          <h2>La barbería, con acento neoyorquino</h2>
          <p className={styles.bio}>{negocio.bio}</p>
        </div>
      </div>
    </section>
  );
}
