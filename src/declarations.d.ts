declare module 'd3-delaunay' {
  export class Delaunay {
    constructor(points: Float64Array | number[]);
    static from(
      points: ArrayLike<unknown>,
      fx: (d: unknown, i: number) => number,
      fy: (d: unknown, i: number) => number
    ): Delaunay;
    voronoi(bounds?: [number, number, number, number]): Voronoi;
  }
  export class Voronoi {
    renderCell(i: number, context?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): string | undefined;
    delaunay: Delaunay;
  }
}
