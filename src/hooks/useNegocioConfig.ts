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
      if (datos && datos.servicios && datos.servicios.length > 0) {
        setConfig({ ...NEGOCIO_DEFAULT, ...datos, servicios: datos.servicios });
      } else {
        setConfig(NEGOCIO_DEFAULT);
      }
      setCargando(false);
    });
    return () => unsub();
  }, []);

  return { config, cargando };
}