// File: utils/analysisText.ts
import { GelAnalysis } from "../types/gel";

export const generateAnalysisText = (
  analysis: GelAnalysis,
  height: number
): string => {
  let text = "Gel Analysis Summary:\n\n";

  analysis.lanes.forEach((lane) => {
    if (!lane || !lane.bands) {
      text += `Lane ${lane.laneNumber}:\n  No bands detected\n\n`;
      return;
    }

    text += `Lane ${lane.laneNumber}:\n`;
    if (lane.bands.length === 0) {
      text += "  No bands detected\n";
    } else {
      text += `  ${lane.bands.length} bands detected\n`;
      lane.bands.forEach((band, index) => {
        text += `  Band ${index + 1}:\n`;
        if (band.estimatedWeight > 0) {
          text += `    Molecular Weight: ~${band.estimatedWeight.toFixed(
            1
          )} kDa\n`;
        }
        text += `    Relative Intensity: ${(
          (band.intensity / analysis.globalMaxIntensity) *
          100
        ).toFixed(1)}%\n`;
        text += `    Position: ${((band.position / height) * 100).toFixed(
          1
        )}% from top\n`;
      });
    }
    text += "\n";
  });

  return text;
};
