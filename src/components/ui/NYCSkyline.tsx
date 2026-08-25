interface Props {
  className?: string;
  color?: string;
}

/**
 * Silueta de skyline de Nueva York (simplificada, estilo línea) inspirada
 * en el mural del local. Se usa como elemento decorativo de fondo en el
 * hero y otras secciones. Es un solo <svg> sin dependencias externas.
 */
export default function NYCSkyline({ className, color = "#c98a52" }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        fill={color}
        opacity="0.9"
        d="M0 220V180h30v-40h20v-20h15V90h10V60h20v30h10v30h15v20h20v-70h10V40h20v70h20v-30h15V50h20v40h10v-20h25v-90h15V0h10v-20h10v20h10v-10h15v70h20v-10h10v40h20v-20h15v20h30v-40h20v-10h15v30h20v-10h10v-20h20v20h15v-10h30v20h20V90h10v-10h20v20h10v-20h15v40h20v-10h10v-30h20v20h30v40h20v-20h10v40h30v-70h10v-20h15v30h20v-20h10v30h20v40h30V220H0Z"
      />
    </svg>
  );
}
