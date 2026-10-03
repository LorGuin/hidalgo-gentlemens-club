import type { Metadata } from "next";
import Ecommerce04 from "@/components/ui/ecommerce-04";
// Tailwind + tokens de shadcn, solo para esta página (ver el comentario
// dentro de tienda.css para saber por qué no afecta al resto del sitio).
import "./tienda.css";

export const metadata: Metadata = {
  title: "Tienda",
  description:
    "Ropa y accesorios de Hidalgo Gentlemen's Club. Elegí tus productos y hacé tu pedido por WhatsApp: retirás en el local de Lugones 302, Mendoza.",
};

export default function TiendaPage() {
  return <Ecommerce04 />;
}
