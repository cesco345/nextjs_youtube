// app/opencv/image-processing/histogram/page.tsx
"use client";
import { useState, useCallback } from "react";
import ImageProcessor from "../ImageProcessor";
import ThresholdControls from "../../controls/ThresholdControls";

export default function HistogramEqualizationPage() {
  const [params, setParams] = useState({
    intensity: 50,
    cliplimit: 40,
    tilesize: 8,
  });

  const controls = [
    {
      name: "Intensity",
      value: params.intensity,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      name: "Clip Limit",
      value: params.cliplimit,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      name: "Tile Size",
      value: params.tilesize,
      min: 4,
      max: 16,
      step: 2,
    },
  ];

  const handleParamChange = (name: string, value: number) => {
    const paramName = name.toLowerCase().replace(/\s+/g, "");
    console.log("Parameter change:", paramName, value);

    setParams((prev) => {
      const newParams = { ...prev, [paramName]: value };
      console.log("New params:", newParams);
      return newParams;
    });
  };

  const processImage = useCallback(
    (cv: any, src: any, dst: any) => {
      console.log("Processing with params:", params);

      const gray = new cv.Mat();
      const equalizedBase = new cv.Mat();

      try {
        // Convert to grayscale if needed
        if (src.channels() > 1) {
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        } else {
          src.copyTo(gray);
        }

        // Apply CLAHE
        const clahe = new cv.CLAHE(
          params.cliplimit / 10,
          new cv.Size(params.tilesize, params.tilesize)
        );
        clahe.apply(gray, equalizedBase);

        // Blend original and equalized image
        const alpha = params.intensity / 100;
        cv.addWeighted(equalizedBase, alpha, gray, 1 - alpha, 0, dst);

        // Convert back to color if needed
        if (src.channels() > 1) {
          cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
        }
      } catch (error) {
        console.error("Error in histogram equalization:", error);
        src.copyTo(dst);
      } finally {
        gray.delete();
        equalizedBase.delete();
      }
    },
    [params]
  );

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Histogram Equalization</h1>

      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Current Parameters:</h2>
          <div className="text-sm text-gray-600">
            <div>Intensity: {params.intensity}</div>
            <div>Clip Limit: {params.cliplimit}</div>
            <div>Tile Size: {params.tilesize}</div>
          </div>
        </div>

        <ThresholdControls controls={controls} onChange={handleParamChange} />
      </div>

      <ImageProcessor
        processImage={processImage}
        title="Histogram Equalization Demo"
      />
    </div>
  );
}
