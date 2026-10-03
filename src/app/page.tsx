import Hero from "@/components/home/Hero";
import SobreMi from "@/components/home/SobreMi";
import Servicios from "@/components/home/Servicios";
import Productos from "@/components/home/Productos";
import ElLocal from "@/components/home/ElLocal";
import Ubicacion from "@/components/home/Ubicacion";
import Contacto from "@/components/home/Contacto";

export default function HomePage() {
  return (
    <>
      <Hero />
      <SobreMi />
      <Servicios />
      <ElLocal />
      <Productos />
      <Ubicacion />
      <Contacto />
    </>
  );
}
