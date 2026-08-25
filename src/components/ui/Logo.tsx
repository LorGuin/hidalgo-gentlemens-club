import styles from "./Logo.module.scss";

/**
 * Logotipo tipográfico "H / Hidalgo Gentlemen's Club", inspirado en el
 * mural pintado en el local (la "H" con la navaja integrada). Se puede
 * reemplazar por el logo real en SVG/PNG apenas el cliente lo mande —
 * ver /public/images/logo.svg.
 */
export default function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className={`${styles.logo} ${compacto ? styles.compacto : ""}`}>
      <span className={styles.letraH}>H</span>
      <span className={styles.texto}>
        <span className={styles.firma}>Hidalgo</span>
        <span className={styles.subtitulo}>Gentlemen&apos;s Club</span>
      </span>
    </div>
  );
}
