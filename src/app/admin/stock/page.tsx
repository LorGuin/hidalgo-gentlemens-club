"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminNav from "@/components/admin/AdminNav";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  suscribirProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  ajustarStock,
} from "@/lib/firestoreServices";
import { comprimirImagenComoBase64 } from "@/lib/imagen";
import type { Producto } from "@/types";
import styles from "./page.module.scss";
import InputNumero from "@/components/ui/InputNumero";

const FORM_INICIAL = {
  nombre: "",
  categoria: "",
  precio: 0,
  costo: 0,
  stock: 0,
  stockMinimo: 3,
  descripcion: "",
  fotoUrl: undefined as string | undefined,
  publicado: false,
};

export default function AdminStockPage() {
  const { esAdmin, cargando: cargandoAuth } = useAdminAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  useEffect(() => {
    // Esperamos a que termine de confirmarse el login de admin antes de
    // pedir nada — si no, Firestore rechaza el pedido con "permission
    // denied" porque todavía no hay usuario autenticado.
    if (cargandoAuth || !esAdmin) return;
    const unsub = suscribirProductos(setProductos);
    return () => unsub();
  }, [cargandoAuth, esAdmin]);

  function editar(p: Producto) {
    setEditandoId(p.id || null);
    setForm({
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      costo: p.costo || 0,
      stock: p.stock,
      stockMinimo: p.stockMinimo,
      descripcion: p.descripcion || "",
      fotoUrl: p.fotoUrl,
      publicado: p.publicado || false,
    });
    setErrorFoto(null);
  }

  function limpiarForm() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setErrorFoto(null);
  }

  async function onCambiarFoto(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setErrorFoto("El archivo tiene que ser una imagen (JPG o PNG).");
      return;
    }

    setSubiendoFoto(true);
    setErrorFoto(null);
    try {
      const dataUrl = await comprimirImagenComoBase64(archivo, 480);
      setForm((f) => ({ ...f, fotoUrl: dataUrl }));
    } catch (err) {
      console.error(err);
      setErrorFoto("No se pudo procesar la imagen. Probá con otra foto.");
    } finally {
      setSubiendoFoto(false);
      e.target.value = "";
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setGuardando(true);
    try {
      if (editandoId) {
        await actualizarProducto(editandoId, form);
      } else {
        await crearProducto(form);
      }
      limpiarForm();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <div className={styles.pagina}>
        <h1>Productos y stock</h1>
        <p className={styles.ayudaIntro}>
          Cargá acá tus productos. Los que tildes como &quot;Mostrar en la tienda online&quot;
          aparecen con foto y precio en la sección Tienda de la página principal, y el
          cliente puede pedirlos por WhatsApp.
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.grupo}>
            <label htmlFor="nombre">Nombre del producto *</label>
            <input
              id="nombre"
              placeholder="Ej: Cera capilar"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>

          <div className={styles.grupo}>
            <label htmlFor="categoria">Categoría (opcional)</label>
            <input
              id="categoria"
              placeholder="Ej: Peinado, Barba, Cuidado"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            />
          </div>

          <div className={styles.grupo}>
            <label htmlFor="precio">Precio de venta *</label>
            <InputNumero
              id="precio"
              placeholder="0"
              value={form.precio}
              onChange={(n) => setForm({ ...form, precio: n ?? 0 })}
            />
            <span className={styles.ayuda}>Lo que le cobrás al cliente.</span>
          </div>

          <div className={styles.grupo}>
            <label htmlFor="costo">Costo (opcional)</label>
            <InputNumero
              id="costo"
              placeholder="0"
              value={form.costo}
              onChange={(n) => setForm({ ...form, costo: n ?? 0 })}
            />
            <span className={styles.ayuda}>Lo que te cuesta a vos. Sirve para saber tu ganancia — no es obligatorio.</span>
          </div>

          <div className={styles.grupo}>
            <label htmlFor="stock">Stock actual *</label>
            <InputNumero
              id="stock"
              placeholder="0"
              miles={false}
              value={form.stock}
              onChange={(n) => setForm({ ...form, stock: n ?? 0 })}
            />
            <span className={styles.ayuda}>Cuántas unidades tenés ahora en el local.</span>
          </div>

          <div className={styles.grupo}>
            <label htmlFor="stockMinimo">Aviso de stock bajo</label>
            <InputNumero
              id="stockMinimo"
              placeholder="0"
              miles={false}
              value={form.stockMinimo}
              onChange={(n) => setForm({ ...form, stockMinimo: n ?? 0 })}
            />
            <span className={styles.ayuda}>
              Cuando el stock baje de este número, el producto se marca en rojo en la lista de abajo
              para avisarte que hay que reponer.
            </span>
          </div>

          <div className={`${styles.grupo} ${styles.grupoAncho}`}>
            <label htmlFor="descripcion">Descripción para la tienda (opcional)</label>
            <textarea
              id="descripcion"
              rows={2}
              placeholder="Una frase corta que vea el cliente en la tienda online"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <div className={styles.grupo}>
            <label>Foto para la tienda (opcional)</label>
            {form.fotoUrl && (
              <div className={styles.fotoPreview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.fotoUrl} alt="Vista previa" />
              </div>
            )}
            <label className={styles.botonSubirFoto}>
              {subiendoFoto ? "Procesando..." : form.fotoUrl ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/*" onChange={onCambiarFoto} disabled={subiendoFoto} hidden />
            </label>
            {errorFoto && <span className={styles.error}>{errorFoto}</span>}
          </div>

          <div className={styles.grupo}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.publicado}
                onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
              />
              Mostrar en la tienda online
            </label>
            <span className={styles.ayuda}>
              Si lo tildás, este producto aparece con foto y precio en la sección Tienda del sitio.
            </span>
          </div>

          <div className={styles.accionesForm}>
            <button type="submit" disabled={guardando}>
              {editandoId ? "Guardar cambios" : "Agregar producto"}
            </button>
            {editandoId && (
              <button type="button" className={styles.cancelar} onClick={limpiarForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Tienda</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={p.stock <= p.stockMinimo ? styles.stockBajo : ""}>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                <td>${p.precio.toLocaleString("es-AR")}</td>
                <td>
                  <div className={styles.stockCell}>
                    <button onClick={() => p.id && ajustarStock(p.id, -1)}>-</button>
                    <span>{p.stock}</span>
                    <button onClick={() => p.id && ajustarStock(p.id, 1)}>+</button>
                    {p.stock <= p.stockMinimo && <span className={styles.alerta}>bajo</span>}
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className={p.publicado ? styles.badgePublicado : styles.badgeOculto}
                    onClick={() => p.id && actualizarProducto(p.id, { publicado: !p.publicado })}
                  >
                    {p.publicado ? "Publicado" : "Oculto"}
                  </button>
                </td>
                <td className={styles.acciones}>
                  <button onClick={() => editar(p)}>Editar</button>
                  <button onClick={() => p.id && eliminarProducto(p.id)}>Borrar</button>
                </td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr>
                <td colSpan={6}>Todavía no cargaste productos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminGuard>
  );
}
