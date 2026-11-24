import type { ColumnArea } from './tabletop';

const columnStep = 8.18875;
const columnTilt = 0.200055;
const rowStep = 11.67103;

export function projectedCell(col: number, row: number) {
  return { x: 25.21201 + col * columnStep, y: 18.53602 + row * rowStep + col * columnTilt };
}

export function projectedColumn(col: number): ColumnArea {
  return {
    left: 21.01059 + col * columnStep,
    top: 4.26238 + col * columnTilt,
    width: columnStep,
    height: 79.36009,
  };
}
