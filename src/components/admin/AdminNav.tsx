"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import styles from "./AdminNav.module.scss";

const ITEMS = [
  { href: "/admin", label: "Estadísticas" },
  { href: "/admin/turnos", label: "Agenda de turnos" },
  { href: "/admin/ventas", label: "Registrar corte / venta" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/servicios", label: "Servicios y precios" },
  { href: "/admin/pagos", label: "Pagos" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAdminAuth();
  const [abierto, setAbierto] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.marca}>Panel Hidalgo</div>

      <button
        className={styles.hamburguesa}
        aria-label="Abrir menú del panel"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <ul className={`${styles.links} ${abierto ? styles.linksAbierto : ""}`}>
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={pathname === item.href ? styles.activo : ""}
              onClick={() => setAbierto(false)}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <button
        className={styles.salir}
        onClick={async () => {
          setAbierto(false);
          await logout();
          router.replace("/admin/login");
        }}
      >
        Cerrar sesión
      </button>
    </nav>
  );
}