/**
 * Convierte un archivo de imagen (File) en un data URL (base64) ya
 * redimensionado y comprimido, listo para guardar directo en un documento
 * de Firestore. Lo usamos para el QR de cobro en vez de subirlo a Firebase
 * Storage, porque Storage ahora exige el plan pago (Blaze) de Firebase
 * aunque el uso real termine costando $0 — así evitamos pedirle tarjeta al
 * dueño y todo funciona en el plan gratis.
 *
 * Firestore no acepta documentos de más de 1 MB en total, así que
 * redimensionamos la imagen a un tamaño chico (de sobra para mostrar un
 * QR) y la comprimimos como JPEG — para un QR esto da, en general, unos
 * pocos KB.
 */
export function comprimirImagenComoBase64(
  archivo: File,
  maxDimension = 320,
  calidad = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height >= width && height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("sin-contexto-canvas"));
          return;
        }
        // Fondo blanco por si la imagen original tiene transparencia (PNG),
        // así el QR se sigue viendo bien y no queda con fondo negro.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.onerror = () => reject(new Error("no-se-pudo-leer-la-imagen"));
      img.src = lector.result as string;
    };
    lector.onerror = () => reject(new Error("no-se-pudo-leer-el-archivo"));
    lector.readAsDataURL(archivo);
  });
}