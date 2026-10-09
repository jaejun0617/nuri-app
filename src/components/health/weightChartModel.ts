export type WeightChartSample = {
  id: string;
  measuredOn: string;
  weightKg: number;
};

/** A zero-based scale keeps small weight changes from appearing medically dramatic. */
export function buildWeightChartModel(
  samples: readonly WeightChartSample[],
  width: number,
) {
  const logs = samples.filter(
    item => Number.isFinite(item.weightKg) && item.weightKg > 0,
  );
  const max = Math.max(1, ...logs.map(item => item.weightKg));
  const step = 10 ** Math.floor(Math.log10(max));
  const ceiling = Math.ceil(max / step) * step;
  const plotWidth = Math.max(160, width);
  const points = logs.map((log, index) => ({
    ...log,
    x: ((index + 0.5) * plotWidth) / logs.length,
    y: 24 + (1 - log.weightKg / ceiling) * 112,
  }));
  return { ceiling, points };
}
