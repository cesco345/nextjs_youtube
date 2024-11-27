// File: utils/gelAnalysis.ts
import { LaneData, StandardBand, GelAnalysis } from "../types/gel";

export const findStandardLane = (lanes: LaneData[]): LaneData | undefined => {
  if (!lanes.length) return undefined;

  const laneScores = lanes.map((lane) => {
    if (lane.bands.length < 2) return { lane, score: 0 };

    const spacings = [];
    for (let i = 1; i < lane.bands.length; i++) {
      spacings.push(lane.bands[i].position - lane.bands[i - 1].position);
    }
    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    const spacingVariance =
      spacings.reduce((acc, s) => acc + Math.pow(s - avgSpacing, 2), 0) /
      spacings.length;

    let intensityTrend = 0;
    for (let i = 1; i < lane.bands.length; i++) {
      intensityTrend +=
        lane.bands[i].intensity <= lane.bands[i - 1].intensity ? 1 : 0;
    }

    const regularityScore = 1 / (1 + spacingVariance);
    const intensityScore = intensityTrend / (lane.bands.length - 1);
    const score = regularityScore * 0.6 + intensityScore * 0.4;

    return { lane, score };
  });

  const bestLane = laneScores.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  return bestLane.score > 0.5 ? bestLane.lane : undefined;
};
export const detectStandards = (
  standardLane: LaneData,
  height: number
): StandardBand[] | undefined => {
  if (!standardLane || standardLane.bands.length < 2) return undefined;

  const markerSets = [
    // [250, 150, 100, 75, 50, 37, 25, 20, 15, 10],
    [97.4, 66, 45, 29, 20.1, 14.3],
    // [170, 130, 95, 72, 55, 43, 34, 26, 17, 10],
  ];

  const bestSet = markerSets.reduce((best, current) => {
    const diffBest = Math.abs(best.length - standardLane.bands.length);
    const diffCurrent = Math.abs(current.length - standardLane.bands.length);
    return diffCurrent < diffBest ? current : best;
  });

  const sortedBands = [...standardLane.bands].sort(
    (a, b) => a.position - b.position
  );
  const numStandards = Math.min(sortedBands.length, bestSet.length);

  return sortedBands.slice(0, numStandards).map((band, index) => ({
    position: band.position,
    weight: bestSet[index],
  }));
};
