"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { esUsuarioAdmin } from "@/lib/firestoreServices";

interface EstadoAuth {
  usuario: User | null;
  esAdmin: boolean;
  cargando: boolean;
}

/**
 * Escucha el estado de autenticación de Firebase y verifica, además,
 * que el usuario logueado esté en la whitelist de "admins" en Firestore.
 * Así el dueño puede crear cuentas nuevas (por ejemplo para un empleado)
 * desde la consola de Firebase sin depender del programador.
 */
export function useAdminAuth() {
  const [estado, setEstado] = useState<EstadoAuth>({ usuario: null, esAdmin: false, cargando: true });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setEstado({ usuario: null, esAdmin: false, cargando: false });
        return;
      }
      // TEMPORAL: para diagnosticar el bug del panel admin. Borrar después.
      console.log("🔑 UID logueado ahora mismo:", JSON.stringify(usuario.uid));
      try {
        const admin = await esUsuarioAdmin(usuario.uid);
        console.log("🔑 ¿Es admin según Firestore?:", admin);
        setEstado({ usuario, esAdmin: admin, cargando: false });
      } catch (err) {
        console.error("🔑 Error chequeando admin:", err);
        setEstado({ usuario, esAdmin: false, cargando: false });
      }
    });
    return () => unsub();
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  return { ...estado, login, logout };
}
