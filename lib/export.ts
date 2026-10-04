import type { CanvasObject } from "./types";
import { CANVAS_BG } from "./palette";

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function rotCorners(
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
): { xs: number[]; ys: number[] } {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cos = Math.cos((rot * Math.PI) / 180);
  const sin = Math.sin((rot * Math.PI) / 180);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [px, py] of [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ]) {
    const dx = px - cx;
    const dy = py - cy;
    xs.push(cx + dx * cos - dy * sin);
    ys.push(cy + dx * sin + dy * cos);
  }
  return { xs, ys };
}

export function getObjectBBox(o: CanvasObject): BBox {
  let minX = o.x;
  let minY = o.y;
  let maxX = o.x;
  let maxY = o.y;

  if (o.type === "freehand" && o.points && o.points.length) {
    for (let i = 0; i < o.points.length; i += 2) {
      minX = Math.min(minX, o.points[i]);
      maxX = Math.max(maxX, o.points[i]);
      minY = Math.min(minY, o.points[i + 1]);
      maxY = Math.max(maxY, o.points[i + 1]);
    }
    const pad = o.strokeWidth ?? 2;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    return { minX, minY, maxX, maxY };
  }

  if ((o.type === "arrow" || o.type === "line") && o.points && o.points.length >= 4) {
    const pad = (o.strokeWidth ?? 2) + (o.pointerLength ?? 10);
    for (let i = 0; i < o.points.length; i += 2) {
      minX = Math.min(minX, o.points[i]);
      maxX = Math.max(maxX, o.points[i]);
      minY = Math.min(minY, o.points[i + 1]);
      maxY = Math.max(maxY, o.points[i + 1]);
    }
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  if (o.type === "point") {
    const r = 14 + (o.strokeWidth ?? 0);
    return { minX: o.x - r, minY: o.y - r, maxX: o.x + r, maxY: o.y + r };
  }

  const w = o.width ?? 0;
  const h = o.height ?? 0;
  const rot = o.rotation ?? 0;
  if (rot !== 0 && w > 0 && h > 0) {
    const { xs, ys } = rotCorners(o.x, o.y, w, h, rot);
    minX = Math.min(...xs);
    maxX = Math.max(...xs);
    minY = Math.min(...ys);
    maxY = Math.max(...ys);
  } else {
    maxX = o.x + w;
    maxY = o.y + h;
  }
  // include stroke
  const pad = o.strokeWidth ?? 0;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

export function getObjectsBBox(objects: CanvasObject[], padding = 0): BBox {
  if (objects.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  }
  const first = getObjectBBox(objects[0]);
  const box = { ...first };
  for (let i = 1; i < objects.length; i++) {
    const b = getObjectBBox(objects[i]);
    box.minX = Math.min(box.minX, b.minX);
    box.minY = Math.min(box.minY, b.minY);
    box.maxX = Math.max(box.maxX, b.maxX);
    box.maxY = Math.max(box.maxY, b.maxY);
  }
  return {
    minX: box.minX - padding,
    minY: box.minY - padding,
    maxX: box.maxX + padding,
    maxY: box.maxY + padding,
  };
}

export function downloadDataURL(dataURL: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function dataURLtoBlob(dataURL: string): Blob {
  const [head, data] = dataURL.split(",");
  const mime = head.match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Blur rectangular regions on an already-rendered canvas (export-time).
 * `origin` is the world coordinate of the canvas's top-left pixel, `ratio` is pixelRatio.
 */
export function applyBlurRegions(
  canvas: HTMLCanvasElement,
  blurs: CanvasObject[],
  origin: { x: number; y: number },
  ratio: number,
) {
  if (blurs.length === 0) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const supportsFilter = "filter" in ctx;
  if (!supportsFilter) return; // graceful fallback: no blur applied

  for (const b of blurs) {
    const w = (b.width ?? 100) * ratio;
    const h = (b.height ?? 60) * ratio;
    if (w <= 0 || h <= 0) continue;
    const x = (b.x - origin.x) * ratio;
    const y = (b.y - origin.y) * ratio;
    const r = Math.max(2, (b.blurRadius ?? 12) * ratio);
    const bleed = Math.ceil(r);
    const sw = Math.ceil(w) + bleed * 2;
    const sh = Math.ceil(h) + bleed * 2;
    const sx = x - bleed;
    const sy = y - bleed;

    const a = document.createElement("canvas");
    a.width = Math.max(1, sw);
    a.height = Math.max(1, sh);
    a.getContext("2d")!.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    const bl = document.createElement("canvas");
    bl.width = a.width;
    bl.height = a.height;
    const bctx = bl.getContext("2d")!;
    bctx.filter = `blur(${r}px)`;
    bctx.drawImage(a, 0, 0);

    ctx.drawImage(bl, bleed, bleed, Math.ceil(w), Math.ceil(h), x, y, Math.ceil(w), Math.ceil(h));
  }
}

export const EXPORT_BG = CANVAS_BG;
