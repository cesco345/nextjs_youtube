// app/opencv/edge-detection/canny/canny.tsx
import { useState, useCallback } from "react";
import ImageProcessor from "../ImageProcessorComponent";
import ThresholdControls from "../../controls/ThresholdControls";

export default function Canny() {
  const [params, setParams] = useState({
    lowthreshold: 50,
    highthreshold: 150,
    aperturesize: 3,
    blursize: 5,
  });

  const handleParamChange = useCallback((name: string, value: number) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const controls = [
    {
      name: "Low Threshold",
      value: params.lowthreshold,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "High Threshold",
      value: params.highthreshold,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "Aperture Size",
      value: params.aperturesize,
      min: 3,
      max: 7,
      step: 2,
    },
    {
      name: "Blur Size",
      value: params.blursize,
      min: 1,
      max: 15,
      step: 2,
    },
  ];

  const processImage = useCallback(
    (cv: any, src: any, dst: any) => {
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      const blurred = new cv.Mat();
      const ksize = new cv.Size(params.blursize, params.blursize);
      cv.GaussianBlur(gray, blurred, ksize, 0);

      cv.Canny(
        blurred,
        dst,
        params.lowthreshold,
        params.highthreshold,
        params.aperturesize
      );

      gray.delete();
      blurred.delete();
    },
    [params]
  );

  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Canny Edge Detection</h1>
      <ThresholdControls controls={controls} onChange={handleParamChange} />
      <ImageProcessor
        processImage={processImage}
        title="Canny Edge Detection Demo"
      />
    </div>
  );
}
