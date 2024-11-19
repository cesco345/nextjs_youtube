"use client";
import { useState, useCallback } from "react";
import ImageProcessor from "../ImageProcessor";
import ThresholdControls from "../../controls/ThresholdControls";

export default function ImageFilteringPage() {
  const [filterType, setFilterType] = useState("gaussian");
  const [params, setParams] = useState({
    kernelsize: 15,
    sigmacolor: 50,
    sigmaspace: 50,
  });

  // Define filter-specific controls
  const filterControls = {
    gaussian: [
      {
        name: "Kernel Size",
        value: params.kernelsize,
        min: 3,
        max: 25,
        step: 2,
      },
    ],
    median: [
      {
        name: "Kernel Size",
        value: params.kernelsize,
        min: 3,
        max: 25,
        step: 2,
      },
    ],
    bilateral: [
      {
        name: "Kernel Size",
        value: params.kernelsize,
        min: 3,
        max: 25,
        step: 2,
      },
      {
        name: "Sigma Color",
        value: params.sigmacolor,
        min: 10,
        max: 200,
        step: 10,
      },
      {
        name: "Sigma Space",
        value: params.sigmaspace,
        min: 10,
        max: 200,
        step: 10,
      },
    ],
  };

  const handleParamChange = useCallback((name: string, value: number) => {
    console.log("Updating parameter:", name, value); // Debug log
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const processImage = useCallback(
    (cv: any, src: any, dst: any) => {
      try {
        console.log("Processing with params:", params); // Debug log
        console.log("Filter type:", filterType); // Debug log

        const ksize = new cv.Size(params.kernelsize, params.kernelsize);

        switch (filterType) {
          case "gaussian":
            cv.GaussianBlur(src, dst, ksize, 0);
            break;
          case "median":
            cv.medianBlur(src, dst, params.kernelsize);
            break;
          case "bilateral":
            cv.bilateralFilter(
              src,
              dst,
              params.kernelsize,
              params.sigmacolor,
              params.sigmaspace
            );
            break;
          default:
            src.copyTo(dst);
        }
      } catch (error) {
        console.error("Error in filtering:", error);
        src.copyTo(dst);
      }
    },
    [filterType, params]
  );

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Image Filtering</h1>

      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter Type
        </label>
        <select
          value={filterType}
          onChange={(e) => {
            console.log("Changing filter type to:", e.target.value); // Debug log
            setFilterType(e.target.value);
          }}
          className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="gaussian">Gaussian Blur</option>
          <option value="median">Median Blur</option>
          <option value="bilateral">Bilateral Filter</option>
        </select>
      </div>

      <ThresholdControls
        controls={filterControls[filterType as keyof typeof filterControls]}
        onChange={handleParamChange}
      />

      <ImageProcessor
        processImage={processImage}
        title="Image Filtering Demo"
      />
    </div>
  );
}
