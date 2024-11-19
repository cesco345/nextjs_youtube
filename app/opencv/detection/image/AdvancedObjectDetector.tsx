"use client";
import React, { useState, useEffect, useRef } from "react";
import ThresholdControls from "../../controls/ThresholdControls";

type DetectionMethod = "connected" | "watershed" | "adaptive" | "hsvrange";

const AdvancedObjectDetector: React.FC = () => {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSelected, setImageSelected] = useState(false);
  const [detectionMethod, setDetectionMethod] =
    useState<DetectionMethod>("connected");
  const [detectionCount, setDetectionCount] = useState(0);

  const [params, setParams] = useState({
    // connected parameters
    ccThreshold: 127,
    minArea: 100,
    maxArea: 5000,
    connectivity: 8,

    // Watershed parameters
    distanceThreshold: 0.4,
    waterThreshold: 50,
    // Adaptive threshold parameters
    blockSize: 11,
    C: 2,

    // HSV Range parameters

    hueMin: 0,
    hueMax: 179,
    satMin: 100,
    valMin: 100,
  });

  const inputImageRef = useRef<HTMLImageElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  const getControls = () => {
    switch (detectionMethod) {
      case "connected":
        return [
          {
            name: "Threshold",
            value: params.ccThreshold,
            min: 0,
            max: 255,
            step: 1,
          },
          {
            name: "Min Area",
            value: params.minArea,
            min: 50,
            max: 1000,
            step: 50,
          },
          {
            name: "Max Area",
            value: params.maxArea,
            min: 1000,
            max: 10000,
            step: 100,
          },
        ];
      case "watershed":
        return [
          {
            name: "Distance Threshold",
            value: params.distanceThreshold * 100,
            min: 10,
            max: 90,
            step: 5,
          },
          {
            name: "Water Threshold",
            value: params.waterThreshold,
            min: 0,
            max: 255,
            step: 1,
          },
        ];
      case "adaptive":
        return [
          {
            name: "Block Size",
            value: params.blockSize,
            min: 3,
            max: 99,
            step: 2,
          },
          {
            name: "C Value",
            value: params.C,
            min: -10,
            max: 10,
            step: 1,
          },
        ];

      case "hsvrange":
        return [
          {
            name: "Hue Min",
            value: params.hueMin,
            min: 0,
            max: 179,
            step: 1,
          },
          {
            name: "Hue Max",
            value: params.hueMax,
            min: 0,
            max: 179,
            step: 1,
          },
          {
            name: "Saturation Min",
            value: params.satMin,
            min: 0,
            max: 255,
            step: 1,
          },
        ];

        return [];
    }
  };

  useEffect(() => {
    const loadOpenCv = async () => {
      try {
        if (window.cv) {
          console.log("OpenCV already loaded");
          setCvLoaded(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "/opencv.js";
        script.async = true;

        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            if (window.cv) {
              window.cv["onRuntimeInitialized"] = () => {
                console.log("OpenCV.js runtime initialized");
                setCvLoaded(true);
                resolve(true);
              };
            } else {
              reject("OpenCV load failed");
            }
          };
          script.onerror = () => reject("Script load failed");
        });

        document.body.appendChild(script);
        await loadPromise;
      } catch (err) {
        console.error("OpenCV load error:", err);
        setError("Failed to load OpenCV. Please refresh the page.");
      }
    };

    loadOpenCv();
  }, []);

  const handleParamChange = (name: string, value: number) => {
    const paramMapping: { [key: string]: string } = {
      delta: "delta",
      minarea: "minArea",
      maxarea: "maxArea",
      distancethreshold: "distanceThreshold",
      waterthreshold: "waterThreshold",
      blocksize: "blockSize",
      cvalue: "C",
      huemin: "hueMin",
      huemax: "hueMax",
      saturationmin: "satMin",
      valuemin: "valMin",
    };

    const normalizedName = name.toLowerCase().replace(/\s+/g, "");
    const paramName = paramMapping[normalizedName] || normalizedName;

    // Special handling for percentage values
    let adjustedValue = value;
    if (paramName === "distanceThreshold") {
      adjustedValue = value / 100;
    }

    setParams((prev) => ({
      ...prev,
      [paramName]: adjustedValue,
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && inputImageRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (inputImageRef.current) {
          const img = inputImageRef.current;
          img.onload = () => {
            setImageSelected(true);
            if (outputCanvasRef.current) {
              outputCanvasRef.current.width = img.naturalWidth;
              outputCanvasRef.current.height = img.naturalHeight;
              const ctx = outputCanvasRef.current.getContext("2d");
              if (ctx) {
                ctx.clearRect(
                  0,
                  0,
                  outputCanvasRef.current.width,
                  outputCanvasRef.current.height
                );
              }
            }
          };
          img.src = e.target?.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProcessedImage = () => {
    if (!outputCanvasRef.current) {
      setError("No processed image to save");
      return;
    }

    const link = document.createElement("a");
    link.href = outputCanvasRef.current.toDataURL("image/png");
    link.download = "advanced_detection_result.png";
    link.click();
  };
  // Detection Methods
  const detectConnectedComponents = (src: any, dst: any) => {
    const gray = new window.cv.Mat();
    const binary = new window.cv.Mat();
    const labels = new window.cv.Mat();
    const stats = new window.cv.Mat();
    const centroids = new window.cv.Mat();

    try {
      // Convert to grayscale
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);

      // Apply threshold
      window.cv.threshold(
        gray,
        binary,
        params.ccThreshold,
        255,
        window.cv.THRESH_BINARY
      );

      // Find connected components
      const numLabels = window.cv.connectedComponentsWithStats(
        binary,
        labels,
        stats,
        centroids,
        params.connectivity,
        window.cv.CV_32S
      );

      // Draw results
      src.copyTo(dst);
      let count = 0;

      // Start from 1 to skip background
      for (let i = 1; i < numLabels; i++) {
        const area = stats.intAt(i, window.cv.CC_STAT_AREA);

        if (area >= params.minArea && area <= params.maxArea) {
          count++;

          // Get component bounds
          const left = stats.intAt(i, window.cv.CC_STAT_LEFT);
          const top = stats.intAt(i, window.cv.CC_STAT_TOP);
          const width = stats.intAt(i, window.cv.CC_STAT_WIDTH);
          const height = stats.intAt(i, window.cv.CC_STAT_HEIGHT);

          // Draw rectangle
          window.cv.rectangle(
            dst,
            new window.cv.Point(left, top),
            new window.cv.Point(left + width, top + height),
            [0, 255, 0, 255],
            2
          );

          // Draw label
          window.cv.putText(
            dst,
            `Object ${count} (${area}px²)`,
            new window.cv.Point(left, Math.max(top - 5, 10)),
            window.cv.FONT_HERSHEY_SIMPLEX,
            0.5,
            [0, 255, 0, 255],
            1
          );
        }
      }

      setDetectionCount(count);
    } finally {
      gray.delete();
      binary.delete();
      labels.delete();
      stats.delete();
      centroids.delete();
    }
  };

  const detectWatershed = (src: any, dst: any) => {
    const gray = new window.cv.Mat();
    const binary = new window.cv.Mat();
    try {
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);

      // Create binary image
      window.cv.threshold(
        gray,
        binary,
        params.waterThreshold,
        255,
        window.cv.THRESH_BINARY_INV
      );

      // Find initial contours
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();
      window.cv.findContours(
        binary,
        contours,
        hierarchy,
        window.cv.RETR_EXTERNAL,
        window.cv.CHAIN_APPROX_SIMPLE
      );

      // Draw results
      src.copyTo(dst);
      let count = 0;

      // Process each contour
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = window.cv.contourArea(contour);

        // Filter contours by area
        if (area > 500) {
          count++;
          // Get contour bounding rect
          const rect = window.cv.boundingRect(contour);

          // Draw watershed markers
          window.cv.rectangle(
            dst,
            new window.cv.Point(rect.x, rect.y),
            new window.cv.Point(rect.x + rect.width, rect.y + rect.height),
            [0, 255, 0, 255],
            2
          );

          // Add label with area
          window.cv.putText(
            dst,
            `Region ${count} (${Math.round(area)}px²)`,
            new window.cv.Point(rect.x, Math.max(rect.y - 5, 10)),
            window.cv.FONT_HERSHEY_SIMPLEX,
            0.5,
            [0, 255, 0, 255],
            1
          );
        }
      }

      setDetectionCount(count);

      // Cleanup
      contours.delete();
      hierarchy.delete();
    } finally {
      gray.delete();
      binary.delete();
    }
  };

  const detectAdaptive = (src: any, dst: any) => {
    const gray = new window.cv.Mat();
    const binary = new window.cv.Mat();

    try {
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);

      // Apply adaptive threshold
      window.cv.adaptiveThreshold(
        gray,
        binary,
        255,
        window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        window.cv.THRESH_BINARY,
        params.blockSize,
        params.C
      );

      // Find and draw contours
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();
      window.cv.findContours(
        binary,
        contours,
        hierarchy,
        window.cv.RETR_EXTERNAL,
        window.cv.CHAIN_APPROX_SIMPLE
      );

      src.copyTo(dst);
      let count = 0;
      for (let i = 0; i < contours.size(); i++) {
        const area = window.cv.contourArea(contours.get(i));
        if (area > 100) {
          // Filter small contours
          count++;
          const color = [0, 255, 0, 255];
          window.cv.drawContours(dst, contours, i, color, 2);

          const rect = window.cv.boundingRect(contours.get(i));
          window.cv.putText(
            dst,
            `Object ${count}`,
            new window.cv.Point(rect.x, rect.y - 5),
            window.cv.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            1
          );
        }
      }
      setDetectionCount(count);

      contours.delete();
      hierarchy.delete();
    } finally {
      gray.delete();
      binary.delete();
    }
  };

  const detectHSVRange = (src: any, dst: any) => {
    const hsv = new window.cv.Mat();
    const mask = new window.cv.Mat();

    try {
      // Convert to HSV (using BGR as intermediate)
      const bgr = new window.cv.Mat();
      window.cv.cvtColor(src, bgr, window.cv.COLOR_RGBA2BGR);
      window.cv.cvtColor(bgr, hsv, window.cv.COLOR_BGR2HSV);
      bgr.delete();

      // Create the mask using basic thresholding
      const thresh = new window.cv.Mat();
      window.cv.cvtColor(src, thresh, window.cv.COLOR_RGBA2GRAY);
      window.cv.threshold(thresh, mask, 120, 255, window.cv.THRESH_BINARY);
      thresh.delete();

      // Find and draw contours
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();

      window.cv.findContours(
        mask,
        contours,
        hierarchy,
        window.cv.RETR_EXTERNAL,
        window.cv.CHAIN_APPROX_SIMPLE
      );

      // Draw results
      src.copyTo(dst);
      let count = 0;

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = window.cv.contourArea(contour);

        if (area > 100) {
          // Filter small contours
          count++;

          // Get bounding rectangle
          const rect = window.cv.boundingRect(contour);

          // Draw rectangle
          window.cv.rectangle(
            dst,
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            [0, 255, 0, 255],
            2
          );

          // Add label
          window.cv.putText(
            dst,
            `Object ${count}`,
            { x: rect.x, y: Math.max(rect.y - 5, 10) },
            window.cv.FONT_HERSHEY_SIMPLEX,
            0.5,
            [0, 255, 0, 255],
            1
          );
        }
      }

      setDetectionCount(count);

      // Cleanup
      contours.delete();
      hierarchy.delete();
    } catch (err) {
      console.error("HSV detection error:", err);
      throw err;
    } finally {
      hsv.delete();
      mask.delete();
    }
  };

  const processImage = async () => {
    if (!cvLoaded || !inputImageRef.current || !outputCanvasRef.current) {
      setError("OpenCV or image references not ready");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const src = window.cv.imread(inputImageRef.current);
      const dst = new window.cv.Mat();

      try {
        switch (detectionMethod) {
          case "connected":
            detectConnectedComponents(src, dst);
            break;
          case "watershed":
            detectWatershed(src, dst);
            break;
          case "adaptive":
            detectAdaptive(src, dst);
            break;
          case "hsvrange":
            detectHSVRange(src, dst);
            break;
        }

        window.cv.imshow(outputCanvasRef.current, dst);
      } finally {
        src.delete();
        dst.delete();
      }
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Error processing image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getMethodDescription = () => {
    switch (detectionMethod) {
      case "connected":
        return "MSER (Maximally Stable Extremal Regions) detects blob-like regions that remain stable across various thresholds. Great for text detection and finding stable image features.";
      case "watershed":
        return "Watershed segmentation treats the image like a topographical map and separates regions based on local minima. Excellent for separating touching objects.";
      case "adaptive":
        return "Adaptive thresholding calculates the threshold for each pixel based on a small region around it. Works well with varying lighting conditions and complex backgrounds.";
      case "hsvrange":
        return "HSV color range detection finds objects based on their color properties in HSV color space, which is more intuitive than RGB for color selection.";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Advanced Object Detection</h1>

      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detection Method
          </label>
          <select
            value={detectionMethod}
            onChange={(e) =>
              setDetectionMethod(e.target.value as DetectionMethod)
            }
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="connected">Connected Detection</option>
            <option value="watershed">Watershed Segmentation</option>
            <option value="adaptive">Adaptive Thresholding</option>
            <option value="hsvrange">HSV Color Range</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center space-x-4">
          <button
            onClick={processImage}
            disabled={!imageSelected || loading || !cvLoaded}
            className={`px-4 py-2 rounded-md font-medium ${
              !imageSelected || loading || !cvLoaded
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading
              ? "Processing..."
              : cvLoaded
              ? "Detect Objects"
              : "Loading OpenCV..."}
          </button>

          <button
            onClick={saveProcessedImage}
            disabled={!imageSelected || !cvLoaded}
            className={`px-4 py-2 rounded-md font-medium ${
              !imageSelected || !cvLoaded
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            Save Processed Image
          </button>

          {detectionCount > 0 && (
            <span className="text-sm text-gray-600">
              Detected: {detectionCount}{" "}
              {detectionCount === 1 ? "object" : "objects"}
            </span>
          )}
        </div>

        <ThresholdControls
          controls={getControls()}
          onChange={handleParamChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input Image Container */}
          <div className="relative w-full h-[400px] border rounded bg-gray-50 flex items-center justify-center overflow-hidden">
            <img
              ref={inputImageRef}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              alt="Input"
              style={{ display: imageSelected ? "block" : "none" }}
            />
            {!imageSelected && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                No image selected
              </div>
            )}
          </div>

          {/* Output Canvas Container */}
          <div className="relative w-full h-[400px] border rounded bg-gray-50 flex items-center justify-center overflow-hidden">
            <canvas
              ref={outputCanvasRef}
              className="max-w-full max-h-full w-auto h-auto object-contain"
            />
            {!imageSelected && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Processed image will appear here
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Method Description</h3>
          <div className="bg-gray-50 p-4 rounded text-sm">
            {getMethodDescription()}
          </div>

          <div className="mt-4 bg-blue-50 p-4 rounded">
            <h4 className="font-medium mb-2">Tips for best results:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {detectionMethod === "connected" && (
                <>
                  <li>Works best with high contrast images</li>
                  <li>Good for detecting text and consistent shapes</li>
                  <li>Adjust Delta for stability of detected regions</li>
                  <li>Use Min/Max Area to filter out noise</li>
                </>
              )}
              {detectionMethod === "watershed" && (
                <>
                  <li>Best for separating touching or overlapping objects</li>
                  <li>Works well with objects of similar intensity</li>
                  <li>
                    Adjust Distance Threshold to control separation sensitivity
                  </li>
                  <li>Water Threshold affects initial object detection</li>
                </>
              )}
              {detectionMethod === "adaptive" && (
                <>
                  <li>Ideal for images with varying lighting conditions</li>
                  <li>Block Size should be odd and larger than feature size</li>
                  <li>Adjust C Value to fine-tune threshold sensitivity</li>
                  <li>Works well with text and patterns</li>
                </>
              )}
              {detectionMethod === "hsvrange" && (
                <>
                  <li>Best for finding objects of specific colors</li>
                  <li>Adjust Hue range to target specific colors</li>
                  <li>Use Saturation/Value mins to filter out weak colors</li>
                  <li>Works well in consistent lighting</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedObjectDetector;
