const cache = new Map<string, string | null>();

async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${blob.type || "image/jpeg"};base64,${btoa(bin)}`;
}

async function downscale(blob: Blob, maxDim: number, quality: number): Promise<string> {
  if (typeof createImageBitmap !== "function") throw new Error("no bitmap");
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = canvas.getContext("2d") as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("no ctx");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  if (canvas instanceof OffscreenCanvas) {
    const blob2 = await canvas.convertToBlob({ type: "image/jpeg", quality });
    return blobToDataUrl(blob2);
  }
  return (canvas as HTMLCanvasElement).toDataURL("image/jpeg", quality);
}

/** Fetch a product photo and return a compact JPEG data URL (or null on failure).
 *  Data URIs pass through unchanged. Results are cached per URL. */
export async function loadPhotoDataUrl(
  url: string | null | undefined,
  maxDim = 360,
  quality = 0.82
): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  const key = `${url}|${maxDim}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  let result: string | null = null;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      try {
        result = await downscale(blob, maxDim, quality);
      } catch {
        result = await blobToDataUrl(blob);
      }
    }
  } catch {
    result = null;
  }
  cache.set(key, result);
  return result;
}
