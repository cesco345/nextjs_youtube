import { useState, useCallback } from "react";
import ImageProcessor from "../../edge-detection/ImageProcessorComponent";
import ThresholdControls from "../../controls/ThresholdControls";

export default function ColorHistogram() {
  const [params, setParams] = useState({
    scale: 2,
    binwidth: 2,
  });

  const [colorStats, setColorStats] = useState({
    red: {
      mean: 0,
      std: 0,
      median: 0,
      percentage: 0,
      skewness: 0,
      kurtosis: 0,
      entropy: 0,
    },
    green: {
      mean: 0,
      std: 0,
      median: 0,
      percentage: 0,
      skewness: 0,
      kurtosis: 0,
      entropy: 0,
    },
    blue: {
      mean: 0,
      std: 0,
      median: 0,
      percentage: 0,
      skewness: 0,
      kurtosis: 0,
      entropy: 0,
    },
  });

  const handleParamChange = useCallback((name: string, value: number) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const controls = [
    {
      name: "Scale",
      value: params.scale,
      min: 0.5,
      max: 5,
      step: 0.5,
    },
    {
      name: "Bin Width",
      value: params.binwidth,
      min: 1,
      max: 5,
      step: 1,
    },
  ];

  const calculateStatistics = (data: number[]) => {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const median = sorted[Math.floor(data.length / 2)];

    // Standard deviation
    const squareDiffs = data.map((value) => Math.pow(value - mean, 2));
    const variance = squareDiffs.reduce((a, b) => a + b, 0) / data.length;
    const std = Math.sqrt(variance);

    // Skewness
    const cubedDiffs = data.map((value) => Math.pow((value - mean) / std, 3));
    const skewness = cubedDiffs.reduce((a, b) => a + b, 0) / data.length;

    // Kurtosis
    const fourthDiffs = data.map((value) => Math.pow((value - mean) / std, 4));
    const kurtosis = fourthDiffs.reduce((a, b) => a + b, 0) / data.length - 3;

    // Entropy
    const histogram = new Array(256).fill(0);
    data.forEach((value) => histogram[value]++);
    const entropy = histogram
      .map((count) => count / data.length)
      .reduce((sum, prob) => sum + (prob ? -prob * Math.log2(prob) : 0), 0);

    return {
      mean: mean.toFixed(2),
      median: median.toFixed(2),
      std: std.toFixed(2),
      percentage: ((mean / 255) * 100).toFixed(2),
      skewness: skewness.toFixed(3),
      kurtosis: kurtosis.toFixed(3),
      entropy: entropy.toFixed(3),
    };
  };

  const processImage = useCallback(
    (cv: any, src: any, dst: any) =>
      new Promise<void>((resolve) => {
        // Increased height for larger visualization
        const histImage = new cv.Mat.zeros(600, 1600, cv.CV_8UC3);

        try {
          // Existing data collection and statistics
          const redData = [],
            greenData = [],
            blueData = [];
          for (let i = 0; i < src.data.length; i += 4) {
            redData.push(src.data[i]);
            greenData.push(src.data[i + 1]);
            blueData.push(src.data[i + 2]);
          }

          const stats = {
            red: calculateStatistics(redData),
            green: calculateStatistics(greenData),
            blue: calculateStatistics(blueData),
          };
          setColorStats(stats);

          // Existing histogram calculation
          const redBins = new Array(256).fill(0);
          const greenBins = new Array(256).fill(0);
          const blueBins = new Array(256).fill(0);

          for (let i = 0; i < src.data.length; i += 4) {
            redBins[src.data[i]]++;
            greenBins[src.data[i + 1]]++;
            blueBins[src.data[i + 2]]++;
          }

          const maxBin = Math.max(
            Math.max(...redBins),
            Math.max(...greenBins),
            Math.max(...blueBins)
          );

          const margin = 120; // Increased margin
          const scale = (400 / maxBin) * params.scale; // Increased scale
          const graphWidth = histImage.cols - 2 * margin;

          // White background
          histImage.setTo(new cv.Scalar(255, 255, 255));

          // Enhanced grid with more lines
          for (let i = 0; i <= 10; i++) {
            const y = 500 - (i * 400) / 10;
            cv.line(
              histImage,
              new cv.Point(margin, y),
              new cv.Point(histImage.cols - margin, y),
              new cv.Scalar(240, 240, 240),
              1
            );

            const value = Math.round((i * maxBin) / 10).toString();
            cv.putText(
              histImage,
              value,
              new cv.Point(margin - 90, y + 5),
              cv.FONT_HERSHEY_SIMPLEX,
              0.9,
              new cv.Scalar(0, 0, 0),
              1
            );
          }

          // Axes
          cv.line(
            histImage,
            new cv.Point(margin, 500),
            new cv.Point(histImage.cols - margin, 500),
            new cv.Scalar(0, 0, 0),
            2
          );
          cv.line(
            histImage,
            new cv.Point(margin, 500),
            new cv.Point(margin, 50),
            new cv.Scalar(0, 0, 0),
            2
          );

          // Enhanced histogram drawing
          const drawHistogram = (
            bins: number[],
            color: cv.Scalar,
            offset: number
          ) => {
            for (let i = 0; i < 256; i++) {
              const x = margin + (i * graphWidth) / 256;
              const height = bins[i] * scale;
              cv.line(
                histImage,
                new cv.Point(x + offset, 500),
                new cv.Point(x + offset, 500 - height),
                color,
                params.binwidth * 3 // Increased width
              );
            }
          };

          // Draw histograms with more spacing
          drawHistogram(redBins, new cv.Scalar(220, 0, 0), 0);
          drawHistogram(
            greenBins,
            new cv.Scalar(0, 220, 0),
            params.binwidth * 4
          );
          drawHistogram(
            blueBins,
            new cv.Scalar(0, 0, 220),
            params.binwidth * 8
          );

          // Larger title and labels
          cv.putText(
            histImage,
            "Pixel Intensity Distribution",
            new cv.Point(histImage.cols / 2 - 300, 30),
            cv.FONT_HERSHEY_SIMPLEX,
            1.5,
            new cv.Scalar(0, 0, 0),
            2
          );

          // Enhanced x-axis labels
          ["0", "64", "128", "192", "255"].forEach((value, idx) => {
            const x = margin + (idx * graphWidth) / 4;
            cv.putText(
              histImage,
              value,
              new cv.Point(x - 20, 540),
              cv.FONT_HERSHEY_SIMPLEX,
              1.0,
              new cv.Scalar(0, 0, 0),
              2
            );
          });

          // Statistical annotations
          const channels = [
            { name: "Red", stats: stats.red, color: new cv.Scalar(220, 0, 0) },
            {
              name: "Green",
              stats: stats.green,
              color: new cv.Scalar(0, 220, 0),
            },
            {
              name: "Blue",
              stats: stats.blue,
              color: new cv.Scalar(0, 0, 220),
            },
          ];

          channels.forEach((channel, idx) => {
            const y = 570;
            const x = margin + idx * (graphWidth / 3);
            const stats = channel.stats;
            cv.putText(
              histImage,
              `${channel.name}: μ=${stats.mean} (σ=${stats.std})`,
              new cv.Point(x, y),
              cv.FONT_HERSHEY_SIMPLEX,
              0.8,
              channel.color,
              2
            );
          });

          // Create output
          dst.create(
            src.rows + histImage.rows,
            Math.max(src.cols, histImage.cols),
            cv.CV_8UC3
          );
          dst.setTo(new cv.Scalar(255, 255, 255));

          const xOffset = Math.max(0, (histImage.cols - src.cols) / 2);
          src.copyTo(dst.roi(new cv.Rect(xOffset, 0, src.cols, src.rows)));
          histImage.copyTo(
            dst.roi(new cv.Rect(0, src.rows, histImage.cols, histImage.rows))
          );
        } finally {
          histImage.delete();
          resolve();
        }
      }),
    [params]
  );

  return (
    <div className="min-h-screen">
      {/* <h1 className="text-3xl font-bold mb-6">Color Histogram Analysis</h1> */}
      <p className="mb-4 text-gray-700">
        Advanced color distribution analysis with statistical measures.
      </p>
      <ThresholdControls controls={controls} onChange={handleParamChange} />
      <ImageProcessor
        processImage={processImage}
        title="Histogram Analysis Demo"
      />
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Statistical Analysis:</h2>
        <div className="grid grid-cols-3 gap-4">
          {["red", "green", "blue"].map((channel) => (
            <div
              key={channel}
              className={`p-4 border rounded bg-white text-${channel}-600`}
            >
              <h3 className="font-semibold text-lg mb-2">
                {channel.charAt(0).toUpperCase() + channel.slice(1)} Channel
              </h3>
              <div className="space-y-1 text-sm">
                <p>Mean (μ): {colorStats[channel].mean}</p>
                <p>Std Dev (): {colorStats[channel].std}</p>
                <p>Median: {colorStats[channel].median}</p>
                <p>Percentage: {colorStats[channel].percentage}%</p>
                <p>Skewness: {colorStats[channel].skewness}</p>
                <p>Kurtosis: {colorStats[channel].kurtosis}</p>
                <p>Entropy: {colorStats[channel].entropy} bits</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
