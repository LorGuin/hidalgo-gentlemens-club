import { NEGOCIO_DEFAULT, linkWhatsapp } from "@/lib/negocio";
import styles from "./Contacto.module.scss";

export default function Contacto() {
  const negocio = NEGOCIO_DEFAULT;

  return (
    <section id="contacto" className={styles.seccion}>
      <div className={styles.contenedor}>
        <p className={styles.eyebrow}>Contacto</p>
        <h2>Escribinos</h2>
        <p className={styles.bajada}>
          ¿Tenés dudas o querés coordinar algo puntual? Escribinos directo por WhatsApp o
          seguinos en redes.
        </p>

        <div className={styles.botones}>
          <a
            className={styles.whatsapp}
            href={linkWhatsapp(negocio.telefonoWhatsapp, "Hola! Quiero hacer una consulta")}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
          {negocio.instagram && (
            <a className={styles.red} href={negocio.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          )}
          {negocio.facebook && (
            <a className={styles.red} href={negocio.facebook} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
