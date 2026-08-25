import { NEGOCIO_DEFAULT } from "@/lib/negocio";
import styles from "./Ubicacion.module.scss";

export default function Ubicacion() {
  const negocio = NEGOCIO_DEFAULT;
  // Mapa embebido sin necesidad de API key. Si el cliente prefiere el
  // widget "oficial" con marcador exacto, se puede reemplazar por
  // Google Maps Embed API usando NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY.
  //
  // Usamos las coordenadas (lat/lng) en vez del texto de la dirección: con
  // el texto, Google Maps a veces no lo reconoce como una dirección puntual
  // y en cambio abre una búsqueda de negocios cercanos (una lista de
  // resultados, sin marcar el local). Con lat/lng apunta siempre al punto
  // exacto.
  const query = encodeURIComponent(`${negocio.lat},${negocio.lng}`);
  const srcMapa = `https://www.google.com/maps?q=${query}&output=embed`;

  return (
    <section id="ubicacion" className={styles.seccion}>
      <div className={styles.contenedor}>
        <div className={styles.texto}>
          <p className={styles.eyebrow}>Ubicación</p>
          <h2>Dónde encontrarnos</h2>
          <p className={styles.direccion}>{negocio.direccion}</p>
          <ul className={styles.horarios}>
            {negocio.horarios.map((h) => (
              <li key={h.dia}>
                <strong>{h.dia}</strong> — {h.horario}
              </li>
            ))}
          </ul>
          <a
            className={styles.linkMapa}
            href={`https://www.google.com/maps/search/?api=1&query=${query}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en Google Maps →
          </a>
        </div>

        <div className={styles.mapa}>
          <iframe
            title={`Mapa de ${negocio.nombre}`}
            src={srcMapa}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}