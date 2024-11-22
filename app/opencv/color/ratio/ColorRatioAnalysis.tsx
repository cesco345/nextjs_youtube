import { useState, useCallback } from "react";
import ImageProcessor from "../../edge-detection/ImageProcessorComponent";
import ThresholdControls from "../../controls/ThresholdControls";

const COLOR_RANGES = [
  { name: "Red", color: [255, 0, 0, 255] },
  { name: "Green", color: [0, 255, 0, 255] },
  { name: "Blue", color: [0, 0, 255, 255] },
  { name: "Yellow", color: [255, 255, 0, 255] },
  { name: "Cyan", color: [0, 255, 255, 255] },
  { name: "Magenta", color: [255, 0, 255, 255] },
  { name: "Orange", color: [255, 165, 0, 255] },
  { name: "Purple", color: [128, 0, 128, 255] },
];

export default function ColorRatioAnalysis() {
  const [params, setParams] = useState({
    threshold: 128,
    sensitivity: 5,
  });

  const handleParamChange = useCallback((name: string, value: number) => {
    const paramName = name.toLowerCase().replace(/\s+/g, "");
    setParams((prev) => ({ ...prev, [paramName]: value }));
  }, []);

  const controls = [
    {
      name: "Threshold",
      value: params.threshold,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "Sensitivity",
      value: params.sensitivity,
      min: 1,
      max: 10,
      step: 1,
    },
  ];

  const processImage = useCallback(
    (cv: any, src: any, dst: any) => {
      return new Promise((resolve, reject) => {
        try {
          // Copy source image
          src.copyTo(dst);

          // Initialize channels array
          const channels = Array(COLOR_RANGES.length).fill(0);
          let totalAboveThreshold = 0;

          // Process pixels
          for (let i = 0; i < src.data.length; i += 4) {
            const r = src.data[i];
            const g = src.data[i + 1];
            const b = src.data[i + 2];

            COLOR_RANGES.forEach((range, idx) => {
              const similarity = Math.sqrt(
                Math.pow(r - range.color[0], 2) +
                  Math.pow(g - range.color[1], 2) +
                  Math.pow(b - range.color[2], 2)
              );

              if (similarity < params.threshold) {
                channels[idx]++;
                if (idx === 0) totalAboveThreshold++;
              }
            });
          }

          const total = src.rows * src.cols;
          const ratios = channels.map((count) => {
            const percentage = (count / total) * 100 * params.sensitivity;
            return Math.min(percentage, 100);
          });

          // Create fixed-size histogram (regardless of input image size)
          const histWidth = 800; // Fixed width
          const histHeight = 200; // Fixed height
          const histImage = new cv.Mat(
            histHeight,
            histWidth,
            cv.CV_8UC3,
            new cv.Scalar(255, 255, 255)
          );

          // Fixed bar dimensions
          const barWidth = 60;
          const spacing = 30;
          const startX =
            (histWidth -
              (COLOR_RANGES.length * barWidth +
                (COLOR_RANGES.length - 1) * spacing)) /
            2;

          // Draw bars with consistent size
          COLOR_RANGES.forEach((colorInfo, i) => {
            const x = startX + i * (barWidth + spacing);
            const height = Math.round((ratios[i] * 150) / 100); // Max height 150px

            // Bar
            cv.rectangle(
              histImage,
              new cv.Point(x, histHeight - 40),
              new cv.Point(x + barWidth, histHeight - 40 - height),
              colorInfo.color,
              -1
            );

            // Value
            cv.putText(
              histImage,
              `${(ratios[i] / params.sensitivity).toFixed(1)}%`,
              new cv.Point(x, histHeight - 20),
              cv.FONT_HERSHEY_SIMPLEX,
              0.5,
              colorInfo.color,
              1
            );

            // Label
            cv.putText(
              histImage,
              colorInfo.name,
              new cv.Point(x, histHeight - 5),
              cv.FONT_HERSHEY_SIMPLEX,
              0.5,
              colorInfo.color,
              1
            );
          });

          // Create output with consistent size
          const outputWidth = Math.max(src.cols, histWidth);
          const finalHeight = src.rows + histHeight;
          const combined = new cv.Mat(
            finalHeight,
            outputWidth,
            cv.CV_8UC3,
            new cv.Scalar(255, 255, 255)
          );

          // Center the original image if smaller than histogram
          const srcX = src.cols < histWidth ? (histWidth - src.cols) / 2 : 0;
          src.copyTo(combined.roi(new cv.Rect(srcX, 0, src.cols, src.rows)));

          // Center the histogram
          const histX = histWidth < src.cols ? (src.cols - histWidth) / 2 : 0;
          histImage.copyTo(
            combined.roi(new cv.Rect(histX, src.rows, histWidth, histHeight))
          );

          combined.copyTo(dst);

          // Cleanup
          histImage.delete();
          combined.delete();

          resolve(true);
        } catch (err) {
          reject(err);
        }
      });
    },
    [params]
  );

  return (
    <div className="min-h-screen">
      {/* <h1 className="text-3xl font-bold mb-6">Color Ratio Analysis</h1> */}
      <p className="mb-4 text-gray-700">
        Analyzes extended color distribution including primary, secondary, and
        tertiary colors.
      </p>
      <ThresholdControls controls={controls} onChange={handleParamChange} />
      <ImageProcessor processImage={processImage} title="" />
    </div>
  );
}
