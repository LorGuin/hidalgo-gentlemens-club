import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Helper estándar de shadcn/ui: combina clases de Tailwind sin duplicados. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
