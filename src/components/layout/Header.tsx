"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import styles from "./Header.module.scss";

const LINKS = [
  { href: "/#sobre-mi", label: "Sobre mí" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/tienda", label: "Tienda" },
  { href: "/#ubicacion", label: "Ubicación" },
  { href: "/#contacto", label: "Contacto" },
];

export default function Header() {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.contenedor}>
        <Link href="/" onClick={() => setAbierto(false)}>
          <Logo compacto />
        </Link>

        <nav className={`${styles.nav} ${abierto ? styles.navAbierto : ""}`}>
          <ul>
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setAbierto(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/turnos" className={styles.botonTurno} onClick={() => setAbierto(false)}>
            Reservar turno
          </Link>
        </nav>

        <button
          className={styles.hamburguesa}
          aria-label="Abrir menú"
          aria-expanded={abierto}
          onClick={() => setAbierto((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
