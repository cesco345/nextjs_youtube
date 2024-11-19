import { useState, useCallback } from "react";
import ImageProcessor from "../ImageProcessorComponent";
import ThresholdControls from "../../controls/ThresholdControls";

export default function Sobel() {
  const [params, setParams] = useState({
    kernelsize: 3, // Changed from kernelSize
    scalex: 1, // Changed from scaleX
    scaley: 1, // Changed from scaleY
    blursize: 5, // Changed from blurSize
    delta: 0,
  });

  const handleParamChange = useCallback((name: string, value: number) => {
    // No need to modify the name as it's already in the correct format
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const controls = [
    {
      name: "Kernel Size",
      value: params.kernelsize,
      min: 1,
      max: 7,
      step: 2,
    },
    {
      name: "Scale X",
      value: params.scalex,
      min: 0,
      max: 10,
      step: 0.5,
    },
    {
      name: "Scale Y",
      value: params.scaley,
      min: 0,
      max: 10,
      step: 0.5,
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
      const blurred = new cv.Mat();
      const gradX = new cv.Mat();
      const gradY = new cv.Mat();
      const absGradX = new cv.Mat();
      const absGradY = new cv.Mat();

      try {
        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // Apply Gaussian blur if blur size > 1
        if (params.blursize > 1) {
          const ksize = new cv.Size(params.blursize, params.blursize);
          cv.GaussianBlur(gray, blurred, ksize, 0);
        } else {
          gray.copyTo(blurred);
        }

        // Apply Sobel in X direction
        cv.Sobel(
          blurred,
          gradX,
          cv.CV_16S,
          1,
          0,
          params.kernelsize,
          params.scalex,
          params.delta,
          cv.BORDER_DEFAULT
        );

        // Apply Sobel in Y direction
        cv.Sobel(
          blurred,
          gradY,
          cv.CV_16S,
          0,
          1,
          params.kernelsize,
          params.scaley,
          params.delta,
          cv.BORDER_DEFAULT
        );

        // Convert gradients to absolute values
        cv.convertScaleAbs(gradX, absGradX);
        cv.convertScaleAbs(gradY, absGradY);

        // Combine the two gradients
        cv.addWeighted(absGradX, 0.5, absGradY, 0.5, 0, dst);
      } finally {
        // Clean up
        gray.delete();
        blurred.delete();
        gradX.delete();
        gradY.delete();
        absGradX.delete();
        absGradY.delete();
      }
    },
    [params]
  );

  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Sobel Edge Detection</h1>
      <ThresholdControls controls={controls} onChange={handleParamChange} />
      <ImageProcessor
        processImage={processImage}
        title="Sobel Edge Detection Demo"
      />
    </div>
  );
}
