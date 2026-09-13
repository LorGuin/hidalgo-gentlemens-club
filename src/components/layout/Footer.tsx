import Logo from "@/components/ui/Logo";
import { NEGOCIO_DEFAULT, linkWhatsapp } from "@/lib/negocio";
import styles from "./Footer.module.scss";

export default function Footer() {
  const negocio = NEGOCIO_DEFAULT;
  const anio = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.contenedor}>
        <Logo compacto />

        <div className={styles.columnas}>
          <div>
            <h3>Contacto</h3>
            <p>{negocio.direccion}</p>
            <a href={linkWhatsapp(negocio.telefonoWhatsapp, "Hola! Quiero consultar por un turno")}>
              WhatsApp: {negocio.telefonoWhatsapp}
            </a>
          </div>

          <div>
            <h3>Horarios</h3>
            {negocio.horarios.map((h) => (
              <p key={h.dia}>
                {h.dia}: {h.horario}
              </p>
            ))}
          </div>

          <div>
            <h3>Redes</h3>
            {negocio.instagram && <a href={negocio.instagram}>Instagram</a>}
            {negocio.facebook && <a href={negocio.facebook}>Facebook</a>}
            <a href="/admin/login">Panel administrador</a>
          </div>
        </div>

        <p className={styles.copy}>
          © {anio} {negocio.nombre} — Barbería clásica americana. Todos los derechos reservados.
        </p>
        <p className={styles.creditos}>
          Sitio web desarrollado por{" "}
          <a href="https://teknodev.netlify.app/" target="_blank" rel="noopener noreferrer">
            TeknoDev
          </a>{" "}
          — ¿querés una web como esta para tu negocio? Consultanos.
        </p>
      </div>
    </footer>
  );
}
