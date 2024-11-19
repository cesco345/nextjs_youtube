// app/opencv/edge-detection/contours/contours.tsx
import { useState, useCallback } from "react";
import ImageProcessor from "../ImageProcessorComponent";
import ThresholdControls from "../../controls/ThresholdControls";

export default function Contours() {
  const [params, setParams] = useState({
    thresholdvalue: 127,
    mincontourarea: 100,
    linethickness: 2,
  });

  const handleParamChange = useCallback((name: string, value: number) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const controls = [
    {
      name: "Threshold Value",
      value: params.thresholdvalue,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "Min Contour Area",
      value: params.mincontourarea,
      min: 0,
      max: 1000,
      step: 10,
    },
    {
      name: "Line Thickness",
      value: params.linethickness,
      min: 1,
      max: 10,
      step: 1,
    },
  ];

  const processImage = useCallback(
    (cv: any, src: any, dst: any) => {
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      const thresh = new cv.Mat();
      cv.threshold(gray, thresh, params.thresholdvalue, 255, cv.THRESH_BINARY);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        thresh,
        contours,
        hierarchy,
        cv.RETR_TREE,
        cv.CHAIN_APPROX_SIMPLE
      );

      cv.cvtColor(thresh, dst, cv.COLOR_GRAY2RGBA);
      for (let i = 0; i < contours.size(); ++i) {
        const contourArea = cv.contourArea(contours.get(i));
        if (contourArea > params.mincontourarea) {
          const color = new cv.Scalar(
            Math.random() * 255,
            Math.random() * 255,
            Math.random() * 255,
            255
          );
          cv.drawContours(
            dst,
            contours,
            i,
            color,
            params.linethickness,
            cv.LINE_8,
            hierarchy,
            0
          );
        }
      }

      gray.delete();
      thresh.delete();
      contours.delete();
      hierarchy.delete();
    },
    [params]
  );

  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Contour Detection</h1>
      <ThresholdControls controls={controls} onChange={handleParamChange} />
      <ImageProcessor
        processImage={processImage}
        title="Contour Detection Demo"
      />
    </div>
  );
}
