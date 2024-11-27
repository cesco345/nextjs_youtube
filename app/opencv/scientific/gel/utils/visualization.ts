// File: utils/visualization.ts
import { GelAnalysis } from "../types/gel";

export const visualizeResults = async (
  analysis: GelAnalysis,
  width: number,
  height: number
) => {
  const result = window.cv.Mat.zeros(height, width, window.cv.CV_8UC3);

  analysis.lanes.forEach((lane) => {
    window.cv.line(
      result,
      new window.cv.Point(lane.startX, 0),
      new window.cv.Point(lane.startX, height),
      new window.cv.Scalar(50, 50, 50),
      1
    );
  });

  analysis.lanes.forEach((lane) => {
    lane.bands.forEach((band, index) => {
      const relativeIntensity = band.intensity / analysis.globalMaxIntensity;
      const color = new window.cv.Scalar(
        0,
        255 * relativeIntensity,
        255 * (1 - relativeIntensity)
      );

      window.cv.circle(
        result,
        new window.cv.Point(band.centerX, band.centerY),
        3,
        color,
        -1
      );

      const barWidth = 30 * (band.intensity / lane.maxIntensity);
      window.cv.rectangle(
        result,
        new window.cv.Point(band.centerX + 10, band.centerY - 2),
        new window.cv.Point(band.centerX + 10 + barWidth, band.centerY + 2),
        color,
        -1
      );

      let label = `${index + 1}`;
      if (band.estimatedWeight > 0) {
        label += `: ${band.estimatedWeight.toFixed(1)} kDa`;
      }

      window.cv.putText(
        result,
        label,
        new window.cv.Point(band.centerX - 40, band.centerY),
        window.cv.FONT_HERSHEY_SIMPLEX,
        0.3,
        color,
        1
      );
    });
  });

  return result;
};
