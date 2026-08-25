import Hero from "@/components/home/Hero";
import SobreMi from "@/components/home/SobreMi";
import Servicios from "@/components/home/Servicios";
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
      <Ubicacion />
      <Contacto />
    </>
  );
}
