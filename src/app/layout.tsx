import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { NEGOCIO_DEFAULT } from "@/lib/negocio";
import "@/styles/globals.scss";

const negocio = NEGOCIO_DEFAULT;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hidalgogentlemensclub.com";

// SEO: título, descripción y palabras clave pensadas para búsquedas del tipo
// "barbería cerca de mí", "barbería estilo americano", "peluquería para
// hombres" + la ciudad real del local (completar en NEXT_PUBLIC_NEGOCIO_DIRECCION).
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${negocio.nombre} | Barbería estilo americano`,
    template: `%s | ${negocio.nombre}`,
  },
  description:
    "Barbería clásica americana inspirada en Nueva York. Cortes de cabello, arreglo de " +
    "barba y afeitado a navaja. Reservá tu turno online y pagá con QR o Mercado Pago.",
  keywords: [
    "barbería",
    "barbería Mendoza",
    "barbería Sexta Sección",
    "peluquería para hombres Mendoza",
    "barber shop Mendoza",
    "corte de cabello hombre",
    "arreglo de barba",
    "afeitado a navaja",
    "turnero barbería online",
    "Hidalgo Gentlemen's Club",
    "barbería estilo Nueva York",
  ],
  openGraph: {
    title: `${negocio.nombre} | Barbería estilo americano`,
    description:
      "Cortes clásicos, barba y afeitado a navaja. Reservá tu turno online desde la web.",
    url: siteUrl,
    siteName: negocio.nombre,
    locale: "es_AR",
    type: "website",
    images: ["/images/og-cover.jpg"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: negocio.nombre,
    image: `${siteUrl}/images/og-cover.jpg`,
    "@id": siteUrl,
    url: siteUrl,
    telephone: `+${negocio.telefonoWhatsapp}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: negocio.direccion,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: negocio.lat,
      longitude: negocio.lng,
    },
    openingHoursSpecification: negocio.horarios.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.dia,
      description: h.horario,
    })),
    sameAs: [negocio.instagram, negocio.facebook].filter(Boolean),
  };

  return (
    <html lang="es-AR">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a href="#contenido" className="skip-link">
          Ir al contenido
        </a>
        <Header />
        <main id="contenido">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
