"use client";

import { useEffect, useState } from "react";
import { suscribirConfigNegocio } from "@/lib/firestoreServices";
import { NEGOCIO_DEFAULT } from "@/lib/negocio";
import type { NegocioConfig } from "@/types";

/**
 * Datos del negocio en tiempo real: arranca con NEGOCIO_DEFAULT (los
 * valores de fábrica en negocio.ts) y, apenas Firestore responde, los
 * pisa con lo que el dueño haya cargado desde /admin/servicios. Así el
 * sitio público y el turnero siempre muestran los servicios y precios
 * más actualizados, sin tener que tocar código ni redeployar.
 */
export function useNegocioConfig() {
  const [config, setConfig] = useState<NegocioConfig>(NEGOCIO_DEFAULT);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = suscribirConfigNegocio((datos) => {
      // Antes esto solo mezclaba "datos" cuando traía servicios cargados, y
      // si no, descartaba TODO el documento (incluidos campos sueltos como
      // qrUrl, alias o fotosLocal). Se separa la condición para que
      // cualquier campo parcial del doc se aplique igual, sin depender de
      // que /admin/servicios ya se haya usado.
      if (datos) {
        setConfig({
          ...NEGOCIO_DEFAULT,
          ...datos,
          servicios:
            datos.servicios && datos.servicios.length > 0
              ? datos.servicios
              : NEGOCIO_DEFAULT.servicios,
        });
      } else {
        setConfig(NEGOCIO_DEFAULT);
      }
      setCargando(false);
    });
    return () => unsub();
  }, []);

  return { config, cargando };
}