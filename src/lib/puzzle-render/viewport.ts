/**
 * Matematika viewport papan (zoom & pan) — murni, tanpa Konva & tanpa DOM.
 *
 * Konvensi: `Viewport` adalah transform stage. Titik world `w` muncul di layar
 * pada `w * scale + {x, y}`.
 */

import type { Point, Size } from '@/types';

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export const MIN_ZOOM_FACTOR = 0.55;
export const MAX_ZOOM_FACTOR = 6;

export interface ZoomLimits {
  min: number;
  max: number;
}

export function screenToWorld(viewport: Viewport, point: Point): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}

export function worldToScreen(viewport: Viewport, point: Point): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  };
}

/** Skala supaya seluruh area kerja pas di dalam container. */
export function fitScale(world: Size, container: Size, padding = 16): number {
  const usableWidth = Math.max(1, container.width - padding * 2);
  const usableHeight = Math.max(1, container.height - padding * 2);
  return Math.min(usableWidth / Math.max(1, world.width), usableHeight / Math.max(1, world.height));
}

/**
 * Batas zoom relatif terhadap "pas layar". Zoom out lebih jauh dari `fit` tidak
 * ada gunanya (cuma menambah ruang kosong), sedangkan zoom in dibatasi supaya
 * sprite tidak terlihat pecah.
 */
export function zoomLimits(world: Size, container: Size, padding = 16): ZoomLimits {
  const fit = fitScale(world, container, padding);
  return { min: fit * MIN_ZOOM_FACTOR, max: fit * MAX_ZOOM_FACTOR };
}

export function clampScale(scale: number, limits: ZoomLimits): number {
  return Math.min(limits.max, Math.max(limits.min, scale));
}

/** Viewport yang menampilkan seluruh area kerja, terpusat di container. */
export function fitViewport(world: Size, container: Size, padding = 16): Viewport {
  const scale = fitScale(world, container, padding);
  return {
    scale,
    x: (container.width - world.width * scale) / 2,
    y: (container.height - world.height * scale) / 2,
  };
}

/**
 * Zoom dengan titik jangkar: world point yang berada di bawah kursor tetap di
 * bawah kursor setelah skala berubah.
 */
export function zoomAt(
  viewport: Viewport,
  screenPoint: Point,
  nextScaleRaw: number,
  limits: ZoomLimits,
): Viewport {
  const nextScale = clampScale(nextScaleRaw, limits);
  const anchor = screenToWorld(viewport, screenPoint);

  return {
    scale: nextScale,
    x: screenPoint.x - anchor.x * nextScale,
    y: screenPoint.y - anchor.y * nextScale,
  };
}

export function zoomBy(
  viewport: Viewport,
  screenPoint: Point,
  factor: number,
  limits: ZoomLimits,
): Viewport {
  return zoomAt(viewport, screenPoint, viewport.scale * factor, limits);
}

/**
 * Jaga agar area kerja tidak "kabur" dari layar.
 *
 * - Kalau dunia (setelah diskalakan) lebih besar dari container: tepi dunia
 *   tidak boleh masuk ke dalam container lebih dari `slack`.
 * - Kalau lebih kecil: dunia dipusatkan pada sumbu itu.
 */
export function clampViewport(
  viewport: Viewport,
  world: Size,
  container: Size,
  slack = 0.15,
): Viewport {
  const clampAxis = (position: number, worldLength: number, containerLength: number): number => {
    const scaled = worldLength * viewport.scale;
    if (scaled <= containerLength) return (containerLength - scaled) / 2;

    const allowance = containerLength * slack;
    const min = containerLength - scaled - allowance;
    const max = allowance;
    return Math.min(max, Math.max(min, position));
  };

  return {
    scale: viewport.scale,
    x: clampAxis(viewport.x, world.width, container.width),
    y: clampAxis(viewport.y, world.height, container.height),
  };
}

/** Jarak antar dua titik sentuh — untuk gesture pinch. */
export function touchDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
