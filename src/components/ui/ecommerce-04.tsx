// Basado en "E-commerce 4" de Hirael <https://hirael.com/blocks/ecommerce/ecommerce-04>
// MIT · Mohammad Shehadeh · https://github.com/MohammadShehadeh/hirael
//
// Adaptado para Hidalgo Gentlemen's Club:
//  - Los productos son los REALES que Juan carga en /admin/stock (Firestore),
//    solo los que tienen tildado "Mostrar en la tienda online".
//  - Filtros según los datos que existen: categoría, precio, solo con stock y
//    búsqueda por nombre. (El bloque original filtraba por color y estrellas,
//    pero esos datos no existen en los productos, así que se sacaron en vez
//    de inventarlos.)
//  - Carrito en memoria + "Pedir por WhatsApp", mismo flujo que la sección
//    Tienda del home: sin pagos online, Juan coordina cobro y entrega por chat.
//  - Textos en español y precios en pesos.

"use client";

import * as React from "react";
import { Minus, Plus, Search, Shirt, ShoppingBag, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { suscribirProductos } from "@/lib/firestoreServices";
import { linkWhatsapp } from "@/lib/negocio";
import { useNegocioConfig } from "@/hooks/useNegocioConfig";
import type { Producto } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const ENTER =
  "animate-in fade-in slide-in-from-bottom-4 duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] fill-mode-both motion-reduce:animate-none";
const SWAP =
  "animate-in fade-in slide-in-from-bottom-2 duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] fill-mode-both motion-reduce:animate-none";

const stagger = (index: number, step = 60, offset = 0): React.CSSProperties => ({
  animationDelay: `${offset + index * step}ms`,
});

// Foto de portada de la tienda (Unsplash, licencia libre). Si Juan quiere una
// foto propia del local de ropa, basta con reemplazar esta URL por una
// imagen en /public/images (ej. "/images/tienda-portada.jpg").
const PORTADA =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=70";

const SORTS = [
  { value: "destacados", label: "Destacados" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nombre", label: "Nombre (A-Z)" },
] as const;

type Sort = (typeof SORTS)[number]["value"];

interface Filters {
  categorias: string[];
  /** null = todo el rango de precios (el máximo depende de los productos). */
  precio: [number, number] | null;
  conStock: boolean;
  busqueda: string;
}

const EMPTY_FILTERS: Filters = {
  categorias: [],
  precio: null,
  conStock: false,
  busqueda: "",
};

type ItemCarrito = { id: string; cantidad: number };

const ars = (monto: number) => `$${monto.toLocaleString("es-AR")}`;

/** "remeras" / "REMERAS" → "Remeras" (las categorías se tipean a mano en el admin). */
const normalizarCategoria = (c: string) => {
  const limpia = c.trim().toLowerCase();
  return limpia ? limpia.charAt(0).toUpperCase() + limpia.slice(1) : "Otros";
};

const sinAcentos = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const matches = (
  producto: Producto,
  filters: Filters,
  rango: [number, number],
  ignorarCategoria = false,
) => {
  const precio = filters.precio ?? rango;
  const q = sinAcentos(filters.busqueda.trim());
  return (
    (ignorarCategoria ||
      filters.categorias.length === 0 ||
      filters.categorias.includes(normalizarCategoria(producto.categoria))) &&
    producto.precio >= precio[0] &&
    producto.precio <= precio[1] &&
    (!filters.conStock || producto.stock > 0) &&
    (!q ||
      sinAcentos(producto.nombre).includes(q) ||
      sinAcentos(producto.descripcion ?? "").includes(q))
  );
};

const sortProducts = (productos: Producto[], sort: Sort) => {
  if (sort === "precio-asc") return productos.sort((a, b) => a.precio - b.precio);
  if (sort === "precio-desc") return productos.sort((a, b) => b.precio - a.precio);
  if (sort === "nombre") return productos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return productos;
};

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** Rango del slider de precio: de 0 al producto más caro, redondeado. */
const calcularRango = (productos: Producto[]): { rango: [number, number]; paso: number } => {
  const max = Math.max(0, ...productos.map((p) => p.precio));
  const paso = max > 50000 ? 1000 : max > 10000 ? 500 : 100;
  return { rango: [0, Math.max(paso, Math.ceil(max / paso) * paso)], paso };
};

interface ActiveFilter {
  key: string;
  label: string;
  remove: (filters: Filters) => Filters;
}

const getActiveFilters = (filters: Filters): ActiveFilter[] => [
  ...filters.categorias.map((categoria) => ({
    key: `categoria-${categoria}`,
    label: categoria,
    remove: (current: Filters) => ({
      ...current,
      categorias: current.categorias.filter((c) => c !== categoria),
    }),
  })),
  ...(filters.precio
    ? [
        {
          key: "precio",
          label: `${ars(filters.precio[0])} a ${ars(filters.precio[1])}`,
          remove: (current: Filters) => ({ ...current, precio: null }),
        },
      ]
    : []),
  ...(filters.conStock
    ? [
        {
          key: "stock",
          label: "Con stock",
          remove: (current: Filters) => ({ ...current, conStock: false }),
        },
      ]
    : []),
  ...(filters.busqueda.trim()
    ? [
        {
          key: "busqueda",
          label: `"${filters.busqueda.trim()}"`,
          remove: (current: Filters) => ({ ...current, busqueda: "" }),
        },
      ]
    : []),
];

/* --------------------------------- Filtros --------------------------------- */

interface FilterPanelProps {
  productos: Producto[];
  categorias: string[];
  rango: [number, number];
  paso: number;
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
}

const FilterPanel = ({
  productos,
  categorias,
  rango,
  paso,
  filters,
  onFiltersChange,
}: FilterPanelProps) => {
  const id = React.useId();
  const update = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch });
  const precio = filters.precio ?? rango;

  return (
    <div data-slot="filter-panel" className="flex flex-col divide-y divide-border">
      {categorias.length > 1 && (
        <FieldSet className="gap-3 pb-6">
          <FieldLegend
            variant="label"
            className="text-xs font-normal uppercase tracking-[0.2em] text-muted-foreground"
          >
            Categoría
          </FieldLegend>
          {categorias.map((categoria) => {
            const count = productos.filter(
              (p) => normalizarCategoria(p.categoria) === categoria && matches(p, filters, rango, true),
            ).length;
            const checked = filters.categorias.includes(categoria);
            return (
              <Field key={categoria} orientation="horizontal" data-disabled={count === 0 && !checked}>
                <Checkbox
                  id={`${id}-${categoria}`}
                  checked={checked}
                  disabled={count === 0 && !checked}
                  onCheckedChange={() => update({ categorias: toggle(filters.categorias, categoria) })}
                />
                <FieldLabel htmlFor={`${id}-${categoria}`} className="font-normal">
                  {categoria}
                </FieldLabel>
                <span className="ms-auto text-xs tabular-nums text-muted-foreground">{count}</span>
              </Field>
            );
          })}
        </FieldSet>
      )}

      <FieldSet className={cn("gap-4 py-6", categorias.length <= 1 && "pt-0")}>
        <FieldLegend
          variant="label"
          className="text-xs font-normal uppercase tracking-[0.2em] text-muted-foreground"
        >
          Precio
        </FieldLegend>
        <Slider
          min={rango[0]}
          max={rango[1]}
          step={paso}
          minStepsBetweenThumbs={1}
          value={precio}
          onValueChange={(next) => {
            const nuevo: [number, number] = [next[0], next[1]];
            update({
              precio: nuevo[0] === rango[0] && nuevo[1] === rango[1] ? null : nuevo,
            });
          }}
          aria-label="Rango de precio"
        />
        <div className="flex items-center justify-between text-sm tabular-nums">
          <span>
            <span className="sr-only">Desde </span>
            {ars(precio[0])}
          </span>
          <span>
            <span className="sr-only">Hasta </span>
            {ars(precio[1])}
          </span>
        </div>
      </FieldSet>

      <Field orientation="horizontal" className="pt-6">
        <FieldLabel htmlFor={`${id}-stock`} className="font-normal">
          Solo con stock
        </FieldLabel>
        <Switch
          id={`${id}-stock`}
          checked={filters.conStock}
          onCheckedChange={(checked) => update({ conStock: checked })}
        />
      </Field>
    </div>
  );
};

/* ------------------------------ Tarjeta producto ----------------------------- */

const FotoProducto = ({ producto, className }: { producto: Producto; className?: string }) =>
  producto.fotoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={producto.fotoUrl}
      alt={producto.nombre}
      loading="lazy"
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  ) : (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 grid place-items-center bg-gradient-to-br from-secondary to-muted text-primary/60",
        className,
      )}
    >
      <Shirt className="size-10" strokeWidth={1.25} />
    </div>
  );

const ProductCard = ({
  producto,
  index,
  enCarrito,
  onAgregar,
}: {
  producto: Producto;
  index: number;
  enCarrito: number;
  onAgregar: () => void;
}) => {
  const sinStock = producto.stock <= 0;
  const tope = enCarrito >= producto.stock;

  return (
    <article
      data-slot="product-card"
      style={stagger(Math.min(index, 8), 45)}
      className={cn(SWAP, "group relative flex flex-col gap-3")}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-border bg-muted">
        <FotoProducto
          producto={producto}
          className={cn(
            "transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none",
            sinStock && "opacity-50",
          )}
        />
        {sinStock && (
          <Badge variant="outline" className="absolute start-2.5 top-2.5 bg-background/85 backdrop-blur">
            Sin stock
          </Badge>
        )}
        {enCarrito > 0 && (
          <Badge className="absolute end-2.5 top-2.5 tabular-nums">
            {enCarrito} en el pedido
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium text-pretty">{producto.nombre}</h3>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
            {ars(producto.precio)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {normalizarCategoria(producto.categoria)}
        </span>
        {producto.descripcion && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {producto.descripcion}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAgregar}
        disabled={sinStock || tope}
        className="w-full border-primary/60 hover:border-primary hover:bg-primary hover:text-primary-foreground"
      >
        {sinStock ? (
          "Sin stock por ahora"
        ) : tope ? (
          "Máximo disponible"
        ) : (
          <>
            <Plus />
            Agregar
          </>
        )}
      </Button>
    </article>
  );
};

/* --------------------------------- Carrito -------------------------------- */

const Carrito = ({
  items,
  total,
  unidades,
  onAgregar,
  onQuitar,
  onVaciar,
  linkPedido,
}: {
  items: { producto: Producto; cantidad: number }[];
  total: number;
  unidades: number;
  onAgregar: (p: Producto) => void;
  onQuitar: (id: string) => void;
  onVaciar: () => void;
  linkPedido: string;
}) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button
        type="button"
        size="lg"
        className="fixed bottom-5 left-4 z-40 rounded-full px-5 shadow-xl shadow-black/30 animate-in fade-in slide-in-from-bottom-4 duration-300 sm:left-6"
      >
        <ShoppingBag />
        <span className="tabular-nums">
          Ver pedido ({unidades}) · {ars(total)}
        </span>
      </Button>
    </SheetTrigger>
    <SheetContent side="right" className="gap-0">
      <SheetHeader className="border-b border-border pe-8">
        <SheetTitle className="font-display text-2xl tracking-wider">Tu pedido</SheetTitle>
        <SheetDescription>
          Lo confirmás por WhatsApp y coordinamos pago y entrega.
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="py-4">
        <ul className="flex flex-col divide-y divide-border">
          {items.map(({ producto, cantidad }) => (
            <li key={producto.id} className="flex items-center gap-3 py-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                <FotoProducto producto={producto} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{producto.nombre}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {ars(producto.precio * cantidad)}
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={`Quitar una unidad de ${producto.nombre}`}
                  onClick={() => onQuitar(producto.id!)}
                >
                  <Minus />
                </Button>
                <span className="w-5 text-center text-sm tabular-nums">{cantidad}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={`Agregar una unidad de ${producto.nombre}`}
                  onClick={() => onAgregar(producto)}
                  disabled={cantidad >= producto.stock}
                >
                  <Plus />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </SheetBody>
      <SheetFooter className="border-t border-border">
        <div className="flex items-baseline justify-between pb-2">
          <span className="text-sm text-muted-foreground">Total</span>
          <strong className="text-xl tabular-nums text-primary">{ars(total)}</strong>
        </div>
        <a
          href={linkPedido}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          Pedir por WhatsApp
        </a>
        <SheetClose asChild>
          <Button type="button" variant="ghost" size="sm" onClick={onVaciar}>
            Vaciar pedido
          </Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);

/* ---------------------------------- Página --------------------------------- */

const Ecommerce04 = () => {
  const { config } = useNegocioConfig();
  const [productos, setProductos] = React.useState<Producto[] | null>(null);
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = React.useState<Sort>("destacados");
  const [carrito, setCarrito] = React.useState<ItemCarrito[]>([]);

  React.useEffect(() => {
    const unsub = suscribirProductos((todos) => {
      setProductos(todos.filter((p) => p.publicado && p.id));
    });
    return () => unsub();
  }, []);

  const lista = React.useMemo(() => productos ?? [], [productos]);
  const categorias = React.useMemo(
    () =>
      Array.from(new Set(lista.map((p) => normalizarCategoria(p.categoria)))).sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [lista],
  );
  const { rango, paso } = React.useMemo(() => calcularRango(lista), [lista]);

  const results = sortProducts(
    lista.filter((p) => matches(p, filters, rango)),
    sort,
  );
  const active = getActiveFilters(filters);
  const resultKey = JSON.stringify([filters, sort]);
  const clearAll = () => setFilters(EMPTY_FILTERS);
  const resultLabel = `${results.length} ${results.length === 1 ? "producto" : "productos"}`;

  /* Carrito: se guarda solo id + cantidad, y se cruza con los productos en
     vivo, así si Juan cambia un precio o el stock se refleja al instante. */
  const itemsCarrito = carrito
    .map(({ id, cantidad }) => {
      const producto = lista.find((p) => p.id === id);
      return producto ? { producto, cantidad: Math.min(cantidad, producto.stock) } : null;
    })
    .filter((i): i is { producto: Producto; cantidad: number } => !!i && i.cantidad > 0);
  const unidades = itemsCarrito.reduce((acc, i) => acc + i.cantidad, 0);
  const total = itemsCarrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0);

  const cantidadEnCarrito = (id?: string) =>
    itemsCarrito.find((i) => i.producto.id === id)?.cantidad ?? 0;

  const agregar = (producto: Producto) => {
    if (!producto.id) return;
    setCarrito((actual) => {
      const ya = actual.find((i) => i.id === producto.id);
      if (ya) {
        if (ya.cantidad >= producto.stock) return actual;
        return actual.map((i) => (i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return producto.stock > 0 ? [...actual, { id: producto.id!, cantidad: 1 }] : actual;
    });
  };

  const quitar = (id: string) =>
    setCarrito((actual) =>
      actual
        .map((i) => (i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0),
    );

  const mensajeWhatsapp = [
    "Hola! Quiero encargar de la tienda:",
    ...itemsCarrito.map(
      (i) => `- ${i.producto.nombre} x${i.cantidad} = ${ars(i.producto.precio * i.cantidad)}`,
    ),
    "",
    `Total: ${ars(total)}`,
  ].join("\n");

  const panelProps = {
    productos: lista,
    categorias,
    rango,
    paso,
    filters,
    onFiltersChange: setFilters,
  };

  return (
    <section data-tw="" data-slot="category-page" className="bg-background pb-24 md:pb-32">
      {/* Portada */}
      <div className="relative isolate overflow-hidden border-b border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PORTADA}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-16 md:px-10 md:py-24">
          <span className={cn(ENTER, "text-xs uppercase tracking-[0.3em] text-primary")}>
            Tienda Hidalgo
          </span>
          <h1
            style={stagger(1, 80)}
            className={cn(
              ENTER,
              "max-w-xl text-balance font-display text-5xl leading-none tracking-wider sm:text-6xl",
            )}
          >
            Ropa y accesorios
          </h1>
          <p
            style={stagger(2, 80)}
            className={cn(ENTER, "max-w-xl text-base leading-relaxed text-muted-foreground")}
          >
            La misma onda del salón, para llevar puesta. Armá tu pedido acá y lo coordinamos por
            WhatsApp: retirás en el local o te lo enviamos.
          </p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pt-10 md:px-10 md:pt-14">
        {productos === null ? (
          <div
            aria-busy
            aria-label="Cargando productos"
            className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4"
          >
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="aspect-[4/5] animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : lista.length === 0 ? (
          <Empty className={cn(SWAP, "border border-border py-16")}>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingBag />
              </EmptyMedia>
              <EmptyTitle>Estamos preparando la tienda</EmptyTitle>
              <EmptyDescription>
                Muy pronto vas a encontrar acá ropa y accesorios. Mientras tanto, consultanos por
                WhatsApp qué hay disponible en el local.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <a
                href={linkWhatsapp(config.telefonoWhatsapp, "Hola! Quería consultar por la ropa y accesorios de la tienda.")}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                Consultar por WhatsApp
              </a>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
            <aside
              data-slot="category-filters"
              aria-label="Filtros"
              style={stagger(3, 80)}
              className={cn(ENTER, "hidden lg:sticky lg:top-28 lg:block lg:self-start")}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm font-medium">Filtros</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={clearAll}
                  disabled={active.length === 0}
                  className="text-muted-foreground"
                >
                  Limpiar todo
                </Button>
              </div>
              <div className="pt-6">
                <FilterPanel {...panelProps} />
              </div>
            </aside>

            <div
              data-slot="category-results"
              style={stagger(4, 80)}
              className={cn(ENTER, "flex min-w-0 flex-col gap-6")}
            >
              <div className="flex flex-col gap-4 border-b border-border pb-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={filters.busqueda}
                    onChange={(e) => setFilters({ ...filters, busqueda: e.target.value })}
                    placeholder="Buscar remeras, gorras, perfumes..."
                    aria-label="Buscar productos"
                    className="ps-9"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="lg:hidden">
                          <SlidersHorizontal />
                          Filtros
                          {active.length > 0 && (
                            <span className="tabular-nums">({active.length})</span>
                          )}
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="max-h-[85svh] gap-0 rounded-t-xl">
                        <SheetHeader className="border-b border-border">
                          <SheetTitle>Filtros</SheetTitle>
                          <SheetDescription>Los resultados se actualizan al instante.</SheetDescription>
                        </SheetHeader>
                        <SheetBody className="min-h-0 py-6">
                          <FilterPanel {...panelProps} />
                        </SheetBody>
                        <SheetFooter className="flex-row border-t border-border">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={clearAll}
                            disabled={active.length === 0}
                          >
                            Limpiar
                          </Button>
                          <SheetClose asChild>
                            <Button type="button" className="flex-1 tabular-nums">
                              {results.length === 0
                                ? "Sin resultados"
                                : `Ver ${results.length} ${results.length === 1 ? "producto" : "productos"}`}
                            </Button>
                          </SheetClose>
                        </SheetFooter>
                      </SheetContent>
                    </Sheet>
                    <p aria-live="polite" className="text-sm tabular-nums text-muted-foreground">
                      {resultLabel}
                    </p>
                  </div>
                  <Select value={sort} onValueChange={(next) => setSort(next as Sort)}>
                    <SelectTrigger size="sm" aria-label="Ordenar productos" className="w-auto min-w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="end">
                      {SORTS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {active.length > 0 && (
                  <ul
                    data-slot="active-filters"
                    aria-label="Filtros activos"
                    className="flex flex-wrap items-center gap-2"
                  >
                    {active.map((filter) => (
                      <li
                        key={filter.key}
                        className="animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none"
                      >
                        <Badge variant="outline" className="h-7 gap-1 pe-1 ps-2.5 font-normal">
                          {filter.label}
                          <button
                            type="button"
                            aria-label={`Quitar ${filter.label}`}
                            onClick={() => setFilters(filter.remove(filters))}
                            className="grid size-5 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      </li>
                    ))}
                    <li>
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={clearAll}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Limpiar todo
                      </Button>
                    </li>
                  </ul>
                )}
              </div>

              {results.length > 0 ? (
                <div
                  key={resultKey}
                  data-slot="product-grid"
                  className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6"
                >
                  {results.map((producto, index) => (
                    <ProductCard
                      key={producto.id}
                      producto={producto}
                      index={index}
                      enCarrito={cantidadEnCarrito(producto.id)}
                      onAgregar={() => agregar(producto)}
                    />
                  ))}
                </div>
              ) : (
                <Empty data-slot="product-empty" className={cn(SWAP, "border border-border py-16")}>
                  <EmptyHeader>
                    <EmptyTitle>No hay productos con esos filtros</EmptyTitle>
                    <EmptyDescription>
                      Probá con un rango de precio más amplio o menos filtros.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button type="button" variant="outline" onClick={clearAll}>
                      Limpiar filtros
                    </Button>
                  </EmptyContent>
                </Empty>
              )}
            </div>
          </div>
        )}
      </div>

      {itemsCarrito.length > 0 && (
        <Carrito
          items={itemsCarrito}
          total={total}
          unidades={unidades}
          onAgregar={agregar}
          onQuitar={quitar}
          onVaciar={() => setCarrito([])}
          linkPedido={linkWhatsapp(config.telefonoWhatsapp, mensajeWhatsapp)}
        />
      )}
    </section>
  );
};

export default Ecommerce04;
