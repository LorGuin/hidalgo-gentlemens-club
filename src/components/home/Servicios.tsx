"use client";

import Link from "next/link";
import { useNegocioConfig } from "@/hooks/useNegocioConfig";
import styles from "./Servicios.module.scss";

export default function Servicios() {
  const { config } = useNegocioConfig();

  return (
    <section id="servicios" className={styles.seccion}>
      <div className={styles.contenedor}>
        <p className={styles.eyebrow}>Servicios</p>
        <h2>Qué hacemos</h2>

        <div className={styles.grilla}>
          {config.servicios.map((s) => (
            <div key={s.nombre} className={styles.tarjeta}>
              <h3>{s.nombre}</h3>
              <p className={styles.duracion}>{s.duracionMin} min</p>
              <p className={styles.precio}>${s.precio.toLocaleString("es-AR")}</p>
              <Link href="/turnos" className={styles.link}>
                Reservar →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}