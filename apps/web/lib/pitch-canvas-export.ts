/**
 * PNG export for the Pixi host `<canvas>` (no Pixi API calls — DOM only).
 */

export type PitchExportOptions = {
  /** Scale multiplier vs backing store (e.g. 2 for sharper WhatsApp sends). */
  pixelRatio?: number;
  filename?: string;
};

function scaleCanvasToPngBlob(
  source: HTMLCanvasElement,
  pixelRatio: number,
): Promise<Blob | null> {
  const w = source.width;
  const h = source.height;
  if (w <= 0 || h <= 0) return Promise.resolve(null);

  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(w * pixelRatio));
  out.height = Math.max(1, Math.round(h * pixelRatio));
  const ctx = out.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(out.width / w, out.height / h);
  ctx.drawImage(source, 0, 0);

  return new Promise((resolve) => {
    out.toBlob((b) => resolve(b), "image/png", 0.92);
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

/**
 * Finds the first `<canvas>` under `root` (Pixi app canvas).
 */
export function findPitchCanvas(root: HTMLElement | null): HTMLCanvasElement | null {
  if (!root) return null;
  return root.querySelector("canvas");
}

export async function exportPitchCanvasPng(
  root: HTMLElement | null,
  options?: PitchExportOptions,
): Promise<{ ok: true; blob: Blob } | { ok: false; error: string }> {
  const canvas = findPitchCanvas(root);
  if (!canvas) {
    return { ok: false, error: "No canvas found." };
  }
  const pr = options?.pixelRatio ?? 2;
  const blob = await scaleCanvasToPngBlob(canvas, pr);
  if (!blob) {
    return { ok: false, error: "Couldn’t encode PNG." };
  }
  return { ok: true, blob };
}

export async function downloadPitchCanvasPng(
  root: HTMLElement | null,
  options?: PitchExportOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await exportPitchCanvasPng(root, options);
  if (!result.ok) return result;
  const name = options?.filename ?? `pitchside-pitch-${Date.now()}.png`;
  downloadBlob(result.blob, name);
  return { ok: true };
}

export async function shareOrDownloadPitchPng(
  root: HTMLElement | null,
  options?: PitchExportOptions,
): Promise<{ ok: true; method: "share" | "download" } | { ok: false; error: string }> {
  const result = await exportPitchCanvasPng(root, options);
  if (!result.ok) return result;

  const file = new File(
    [result.blob],
    options?.filename ?? `pitchside-pitch-${Date.now()}.png`,
    { type: "image/png" },
  );

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      const canFiles =
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });
      if (canFiles) {
        await navigator.share({
          files: [file],
          title: "Pitch",
          text: "Pitchside pitch",
        });
        return { ok: true, method: "share" };
      }
    } catch {
      /* fall through to download */
    }
  }

  downloadBlob(result.blob, file.name);
  return { ok: true, method: "download" };
}
