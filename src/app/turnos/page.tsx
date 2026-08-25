import type { Metadata } from "next";
import TurneroForm from "@/components/turnero/TurneroForm";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Reservar turno",
  description:
    "Reservá tu turno online en Hidalgo Gentlemen's Club. Elegí servicio, día y horario, y pagá tu seña con Mercado Pago o QR.",
};

export default function TurnosPage() {
  return (
    <section className={styles.seccion}>
      <div className={styles.contenedor}>
        <p className={styles.eyebrow}>Turnero</p>
        <h1>Reservá tu turno</h1>
        <p className={styles.bajada}>
          Elegí el servicio, día y horario. Te confirmamos por WhatsApp y podés dejar una seña
          para asegurar tu lugar.
        </p>
        <TurneroForm />
      </div>
    </section>
  );
}