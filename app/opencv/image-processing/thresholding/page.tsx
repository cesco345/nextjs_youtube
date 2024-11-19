"use client";
import { useState, useCallback } from "react";
import ImageProcessor from "../ImageProcessor";
import ThresholdControls from "../../controls/ThresholdControls";

export default function ImageThresholdingPage() {
  const [thresholdType, setThresholdType] = useState("binary");
  const [params, setParams] = useState({
    thresholdvalue: 127,
    maxvalue: 255,
    blocksize: 11,
    cconstant: 2,
  });

  // Update the controls to match exactly with the state parameter names
  const controls = [
    {
      name: "Threshold Value",
      value: params.thresholdvalue,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "Max Value",
      value: params.maxvalue,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "Block Size",
      value: params.blocksize,
      min: 3,
      max: 99,
      step: 2,
    },
    {
      name: "C Constant",
      value: params.cconstant,
      min: -10,
      max: 10,
      step: 1,
    },
  ];

  const handleParamChange = useCallback((name: string, value: number) => {
    // Convert control name to parameter name (matching exactly with state keys)
    const paramMapping: { [key: string]: string } = {
      "threshold value": "thresholdvalue",
      "max value": "maxvalue",
      "block size": "blocksize",
      "c constant": "cconstant",
    };

    const paramName = paramMapping[name.toLowerCase()] || name.toLowerCase();
    console.log("Updating parameter:", paramName, value); // Debug log

    setParams((prev) => {
      const newParams = { ...prev, [paramName]: value };
      console.log("New params:", newParams); // Debug log
      return newParams;
    });
  }, []);

  const processImage = useCallback(
    (cv: any, src: any, dst: any) => {
      const gray = new cv.Mat();
      try {
        console.log("Processing with params:", params);
        console.log("Threshold type:", thresholdType);

        // Convert to grayscale if needed
        if (src.channels() > 1) {
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        } else {
          src.copyTo(gray);
        }

        // Apply thresholding based on selected type
        switch (thresholdType) {
          case "binary":
            cv.threshold(
              gray,
              dst,
              params.thresholdvalue,
              params.maxvalue,
              cv.THRESH_BINARY
            );
            break;
          case "binaryInv":
            cv.threshold(
              gray,
              dst,
              params.thresholdvalue,
              params.maxvalue,
              cv.THRESH_BINARY_INV
            );
            break;
          case "adaptive":
            // Make sure block size is odd
            const blockSize =
              params.blocksize % 2 === 0
                ? params.blocksize + 1
                : params.blocksize;

            cv.adaptiveThreshold(
              gray,
              dst,
              params.maxvalue,
              cv.ADAPTIVE_THRESH_GAUSSIAN_C,
              cv.THRESH_BINARY,
              blockSize,
              params.cconstant
            );
            break;
          case "otsu":
            cv.threshold(
              gray,
              dst,
              params.thresholdvalue,
              params.maxvalue,
              cv.THRESH_BINARY + cv.THRESH_OTSU
            );
            break;
          default:
            gray.copyTo(dst);
        }

        // Convert back to RGBA if input was color
        if (src.channels() > 1) {
          const colored = new cv.Mat();
          cv.cvtColor(dst, colored, cv.COLOR_GRAY2RGBA);
          colored.copyTo(dst);
          colored.delete();
        }
      } catch (error) {
        console.error("Error in thresholding:", error);
        src.copyTo(dst);
      } finally {
        gray.delete();
      }
    },
    [thresholdType, params]
  );

  // Get appropriate controls based on threshold type
  const getVisibleControls = useCallback(() => {
    switch (thresholdType) {
      case "adaptive":
        return controls.filter((c) =>
          ["Block Size", "Max Value", "C Constant"].includes(c.name)
        );
      case "otsu":
        return controls.filter((c) => ["Max Value"].includes(c.name));
      default:
        return controls.filter((c) =>
          ["Threshold Value", "Max Value"].includes(c.name)
        );
    }
  }, [thresholdType, controls]);

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Image Thresholding</h1>

      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Threshold Type
        </label>
        <select
          value={thresholdType}
          onChange={(e) => {
            console.log("Changing threshold type to:", e.target.value);
            setThresholdType(e.target.value);
          }}
          className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="binary">Binary</option>
          <option value="binaryInv">Binary Inverse</option>
          <option value="adaptive">Adaptive Gaussian</option>
          <option value="otsu">Otsu's Method</option>
        </select>
      </div>

      <ThresholdControls
        controls={getVisibleControls()}
        onChange={handleParamChange}
      />
      <ImageProcessor
        processImage={processImage}
        title="Image Thresholding Demo"
      />
    </div>
  );
}
