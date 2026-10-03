"use client";

import type { InputHTMLAttributes } from "react";

/**
 * Campo numérico prolijo para precios, montos, stock, minutos, etc.
 *
 * Reemplaza a <input type="number">, que tenía dos problemas:
 *  - si el valor era 0 y el usuario escribía, quedaba "01000";
 *  - no separaba miles, así que "150000" era difícil de leer.
 *
 * Acá el valor vacío se muestra vacío (con el placeholder), se aceptan solo
 * dígitos y se muestran los miles con punto ("150.000"). Por fuera sigue
 * trabajando con números: `onChange` recibe un number (o null si está vacío).
 * Renderiza un <input> común, así que los estilos existentes se aplican igual.
 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onChange: (valor: number | null) => void;
  /** Mostrar separador de miles (por defecto sí). */
  miles?: boolean;
};

export default function InputNumero({ value, onChange, miles = true, ...props }: Props) {
  const texto =
    value === null || value === undefined || value === 0
      ? ""
      : miles
        ? value.toLocaleString("es-AR", { maximumFractionDigits: 0 })
        : String(value);

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={texto}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, "").slice(0, 12);
        onChange(digitos === "" ? null : Number(digitos));
      }}
    />
  );
}
