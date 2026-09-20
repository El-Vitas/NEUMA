import { describe, expect, test } from 'bun:test';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { listPageChartMeasuresFor, readPageChartValue } from './page-view.chart.lib.js';
import { PAGE_CHART_MEASURE } from './page-view.types.js';

describe('lo que mide un gráfico de cada grupo', () => {
  test('counts the rows of the group when nothing else was asked', () => {
    expect(readPageChartValue(PAGE_CHART_MEASURE.COUNT, PAGE_PROPERTY_TYPE.NUMBER, [3, 8, undefined])).toBe(3);
  });

  test('adds up what the chosen property says', () => {
    expect(readPageChartValue(PAGE_CHART_MEASURE.SUM, PAGE_PROPERTY_TYPE.NUMBER, [3, 8, 4])).toBe(15);
  });

  test('averages what the chosen property says', () => {
    expect(readPageChartValue(PAGE_CHART_MEASURE.AVERAGE, PAGE_PROPERTY_TYPE.NUMBER, [3, 8, 4])).toBe(5);
  });

  /** Una barra sin altura es una barra de cero, no una barra que falta: el grupo existe y tiene filas. */
  test('reads a group with no numbers as zero and not as nothing', () => {
    expect(readPageChartValue(PAGE_CHART_MEASURE.SUM, PAGE_PROPERTY_TYPE.NUMBER, [undefined])).toBe(0);
  });

  test('counts rows even when they hold no value at all', () => {
    expect(readPageChartValue(PAGE_CHART_MEASURE.COUNT, PAGE_PROPERTY_TYPE.RICH_TEXT, [undefined, undefined])).toBe(2);
  });
});

describe('qué se puede medir', () => {
  /** Sumar un estado o promediar una fecha no quiere decir nada, así que no se ofrece. */
  test('only offers counting when the collection holds no number', () => {
    expect(listPageChartMeasuresFor(false)).toEqual([PAGE_CHART_MEASURE.COUNT]);
  });

  test('offers adding and averaging once there is a number to measure', () => {
    expect(listPageChartMeasuresFor(true)).toEqual([
      PAGE_CHART_MEASURE.COUNT,
      PAGE_CHART_MEASURE.SUM,
      PAGE_CHART_MEASURE.AVERAGE,
    ]);
  });
});
