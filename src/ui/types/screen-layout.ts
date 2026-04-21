import type { LayoutElement } from '../../game/layout-types';

/** public/layout/*.json 파일의 타입 */
export interface ScreenLayoutJSON {
  screen: string;
  designWidth: number;
  elements: LayoutElement[];
  groupVAlign?: 'center' | 'top';
  padding?: { top: number; right: number; bottom: number; left: number };
}
