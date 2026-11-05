export type WeightChartSample = {
  id: string;
  measuredOn: string;
  weightKg: number;
};

/** Positions are elapsed calendar days, not ordinal measurement indexes. */
export function buildWeightChartModel(
  samples: readonly WeightChartSample[],
  width: number,
  height = 112,
  top = 12,
  dateTickCount = 4,
) {
  const logs = samples
    .map(item => ({
      ...item,
      day: Date.parse(`${item.measuredOn}T00:00:00Z`) / 86_400_000,
    }))
    .filter(
      item =>
        Number.isFinite(item.day) &&
        Number.isFinite(item.weightKg) &&
        item.weightKg > 0,
    )
    .sort((left, right) => left.day - right.day);
  const min = Math.min(...logs.map(item => item.weightKg));
  const max = Math.max(1, ...logs.map(item => item.weightKg));
  const range = Math.max((max - min) / 3, max / 10, 0.01);
  const magnitude = 10 ** Math.floor(Math.log10(range));
  const step =
    ([1, 2, 5, 10].find(factor => factor * magnitude >= range) ?? 10) *
    magnitude;
  const floor = logs.length
    ? Math.max(0, (Math.ceil(min / step) - 1) * step)
    : 0;
  const ceiling = Math.max(floor + step, (Math.floor(max / step) + 1) * step);
  const firstDay = logs[0]?.day ?? 0;
  const span = (logs[logs.length - 1]?.day ?? 0) - firstDay;
  const xAt = (day: number) =>
    span ? ((day - firstDay) / span) * width : width / 2;
  const yAt = (value: number) =>
    top + (1 - (value - floor) / (ceiling - floor)) * height;
  const points = logs.map(log => ({
    ...log,
    x: xAt(log.day),
    y: yAt(log.weightKg),
  }));
  const tickCount = Math.min(dateTickCount, span + 1);
  const dateTicks = logs.length
    ? Array.from({ length: tickCount }, (_, index) => {
        const day =
          firstDay + Math.round((span * index) / Math.max(1, tickCount - 1));
        return { day, x: xAt(day) };
      })
    : [];
  const ticks = Array.from(
    { length: Math.round((ceiling - floor) / step) + 1 },
    (_, index) => {
      const value = ceiling - index * step;
      return { value: Number(value.toFixed(2)), y: yAt(value) };
    },
  );
  return { ceiling, points, ticks, dateTicks };
}
