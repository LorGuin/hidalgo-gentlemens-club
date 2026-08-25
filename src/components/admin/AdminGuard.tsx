"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import styles from "./AdminGuard.module.scss";

/**
 * Envoltorio que protege cualquier ruta dentro de /admin. Si no hay
 * usuario logueado, o el usuario no está en la whitelist de "admins"
 * en Firestore, redirige a /admin/login.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { usuario, esAdmin, cargando } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && (!usuario || !esAdmin)) {
      router.replace("/admin/login");
    }
  }, [cargando, usuario, esAdmin, router]);

  if (cargando) {
    return <div className={styles.cargando}>Cargando…</div>;
  }

  if (!usuario || !esAdmin) {
    return null;
  }

  return <>{children}</>;
}
