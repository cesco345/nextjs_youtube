"use client";
import { useState, useCallback } from "react";
import ImageProcessor from "../ImageProcessor";
import ThresholdControls from "../../controls/ThresholdControls";

export default function ImageSharpeningPage() {
  const [params, setParams] = useState({
    intensity: 50,
    kernelsize: 3,
    sigma: 1.0,
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
      name: "Kernel Size",
      value: params.kernelsize,
      min: 3,
      max: 7,
      step: 2,
    },
    {
      name: "Sigma",
      value: params.sigma,
      min: 0.1,
      max: 3.0,
      step: 0.1,
    },
  ];

  const handleParamChange = useCallback((name: string, value: number) => {
    console.log("Updating parameter:", name, value);
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const processImage = useCallback(
    (cv: any, src: any, dst: any) => {
      const blurred = new cv.Mat();
      try {
        console.log("Processing with params:", params);

        // Apply Gaussian blur
        const ksize = new cv.Size(params.kernelsize, params.kernelsize);
        cv.GaussianBlur(src, blurred, ksize, params.sigma);

        // Apply unsharp masking
        const alpha = 1 + params.intensity / 50;
        const beta = -(params.intensity / 50);
        cv.addWeighted(src, alpha, blurred, beta, 0, dst);
      } finally {
        blurred.delete();
      }
    },
    [params]
  );

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Image Sharpening</h1>
      <ThresholdControls controls={controls} onChange={handleParamChange} />
      <ImageProcessor
        processImage={processImage}
        title="Image Sharpening Demo"
      />
    </div>
  );
}
