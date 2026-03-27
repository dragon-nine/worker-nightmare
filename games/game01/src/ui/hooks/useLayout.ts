import { useState, useEffect, useCallback } from 'react';
import { loadLayoutFull } from '../../game/layout-loader';
import { computeLayout, DESIGN_W, type LayoutElement, type ComputedPosition } from '../../game/layout-types';

const imgSizeCache = new Map<string, { w: number; h: number }>();

function getImageSizeAsync(src: string): Promise<{ w: number; h: number }> {
  if (imgSizeCache.has(src)) return Promise.resolve(imgSizeCache.get(src)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = { w: img.naturalWidth, h: img.naturalHeight };
      imgSizeCache.set(src, size);
      resolve(size);
    };
    img.onerror = () => resolve({ w: 100, h: 100 });
    img.src = src;
  });
}

export interface LayoutResult {
  positions: Map<string, ComputedPosition>;
  elements: LayoutElement[];
  scale: number;
  ready: boolean;
}

export function useLayout(
  screen: string,
  imageMap: Record<string, string>,
  excludeIds?: string[],
): LayoutResult {
  const [positions, setPositions] = useState<Map<string, ComputedPosition>>(new Map());
  const [elements, setElements] = useState<LayoutElement[]>([]);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(Math.min(window.innerWidth, 500) / DESIGN_W);

  const compute = useCallback(async () => {
    const loaded = await loadLayoutFull('game01', screen);
    const els = loaded.elements;
    const vAlign = loaded.groupVAlign;
    const padding = loaded.padding;
    setElements(els);
    const base = import.meta.env.BASE_URL || '/';

    const imgSizes = new Map<string, { w: number; h: number }>();
    await Promise.all(
      Object.entries(imageMap).map(async ([id, path]) => {
        const size = await getImageSizeAsync(`${base}${path}`);
        imgSizes.set(id, size);
      })
    );

    const w = Math.min(window.innerWidth, 500);
    const h = window.innerHeight;

    const result = computeLayout(
      els, w, h,
      (id) => imgSizes.get(id) || null,
      null,
      excludeIds,
      vAlign,
      padding,
    );

    const map = new Map<string, ComputedPosition>();
    for (const pos of result.positions) {
      map.set(pos.id, pos);
    }
    setPositions(map);
    setScale(result.scale);

    setReady(true);
  }, [screen, JSON.stringify(imageMap), JSON.stringify(excludeIds)]);

  useEffect(() => {
    compute();
  }, [compute]);

  return { positions, elements, scale, ready };
}
