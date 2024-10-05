import { Injectable } from '@nestjs/common';

@Injectable()
export class SvgGenerator {
  private calcChartPoints(values: number[], width: number, height: number) {
    const chartPoints = [];

    const offsetXRaw = width / values.length;
    const offsetX = Math.round(offsetXRaw * 100) / 100;

    let { min, max } = this.culcMinAndMax(values);
    let diff = max - min;
    let x = 0;

    if (diff === 0) {
      if (max > 0) {
        min = 0;
        max *= 2;
      } else {
        min = min + max;
        max = 0;
      }
      diff = max - min;
    }

    values.forEach((value) => {
      const yRaw = ((max - value) / diff) * height;
      const y = Math.round(yRaw * 100) / 100;

      chartPoints.push(`${x} ${y}`);
      x += offsetX;
      x = Math.round(x * 100) / 100;
    });

    return chartPoints;
  }

  private culcMinAndMax(values: number[]) {
    let min = Number(values[0]);
    let max = Number(values[0]);

    values.forEach((value) => {
      const numValue = Number(value);
      if (numValue > max) {
        max = numValue;
      }

      if (numValue < min) {
        min = numValue;
      }
    });

    return { min, max };
  }

  public generate({
    values,
    width,
    height,
    stroke,
    strokeWidth,
    strokeOpacity,
  }: {
    values: number[];
    width: number;
    height: number;
    stroke: string;
    strokeWidth: number;
    strokeOpacity: number;
  }): string {
    const chartPoints = this.calcChartPoints(values, width, height);

    const points = `points="${chartPoints.join(', ')}"`;
    const fill = 'fill="none" fill-opacity="0"';
    const strokeFinal = `stroke="${stroke}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"`;
    const polyline = `<polyline ${points} ${strokeFinal} ${fill}></polyline>`;
    const box = `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`;
    const render = 'shape-rendering="auto"';

    return `<svg xmlns="http://www.w3.org/2000/svg" role='img' aria-label='Token mini chart' ${box} ${render}>${polyline}</svg>`;
  }
}
