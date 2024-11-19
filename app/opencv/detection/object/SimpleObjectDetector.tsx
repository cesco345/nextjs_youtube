"use client";
import React, { useState, useEffect, useRef } from "react";
import ThresholdControls from "../../controls/ThresholdControls";

const SimpleObjectDetector: React.FC = () => {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetections, setShowDetections] = useState(true);
  const [imageSelected, setImageSelected] = useState(false);

  const [params, setParams] = useState({
    blursize: 3,
    threshold: 127,
    maxval: 255,
    minarea: 1000,
  });

  const inputImageRef = useRef<HTMLImageElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  const controls = [
    {
      name: "Blur Size",
      value: params.blursize,
      min: 3,
      max: 11,
      step: 2,
    },
    {
      name: "Threshold",
      value: params.threshold,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "Min Area",
      value: params.minarea,
      min: 100,
      max: 5000,
      step: 100,
    },
  ];

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
    const paramName = name.toLowerCase().replace(/\s+/g, "");
    setParams((prev) => ({
      ...prev,
      [paramName]: value,
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
            console.log("Image loaded:", img.width, "x", img.height);
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
    link.download = "object_detection_result.png";
    link.click();
  };

  const processImage = async () => {
    if (!cvLoaded) {
      setError("OpenCV is not loaded yet");
      return;
    }

    if (!inputImageRef.current || !outputCanvasRef.current) {
      setError("Image or canvas reference is missing");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("Processing image with params:", params);

      // Read the input image
      const src = window.cv.imread(inputImageRef.current);
      console.log("Source image:", src.rows, "x", src.cols);

      // Create working matrices
      const gray = new window.cv.Mat();
      const blurred = new window.cv.Mat();
      const binary = new window.cv.Mat();
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();

      try {
        // Convert to grayscale
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);

        // Apply Gaussian blur
        const ksize = new window.cv.Size(params.blursize, params.blursize);
        window.cv.GaussianBlur(gray, blurred, ksize, 0);

        // Apply threshold
        window.cv.threshold(
          blurred,
          binary,
          params.threshold,
          params.maxval,
          window.cv.THRESH_BINARY
        );

        // Find contours
        window.cv.findContours(
          binary,
          contours,
          hierarchy,
          window.cv.RETR_EXTERNAL,
          window.cv.CHAIN_APPROX_SIMPLE
        );

        console.log("Found contours:", contours.size());

        // Draw results
        const result = src.clone();

        if (showDetections) {
          let objectCount = 0;
          for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = window.cv.contourArea(contour);

            if (area > params.minarea) {
              objectCount++;
              // Get rotated rectangle
              const rect = window.cv.boundingRect(contour);

              // Draw rectangle
              window.cv.rectangle(
                result,
                new window.cv.Point(rect.x, rect.y),
                new window.cv.Point(rect.x + rect.width, rect.y + rect.height),
                [0, 255, 0, 255],
                2
              );

              // Add label
              window.cv.putText(
                result,
                `Object ${objectCount} (${Math.round(area)}px)`,
                new window.cv.Point(rect.x, rect.y - 5),
                window.cv.FONT_HERSHEY_SIMPLEX,
                0.5,
                [0, 255, 0, 255],
                1
              );
            }
          }
          console.log("Drew", objectCount, "objects");
        }

        // Show result
        window.cv.imshow(outputCanvasRef.current, result);
        result.delete();
      } finally {
        // Cleanup
        src.delete();
        gray.delete();
        blurred.delete();
        binary.delete();
        contours.delete();
        hierarchy.delete();
      }
    } catch (err) {
      console.error("Image processing error:", err);
      setError(
        `Error processing image: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Simple Object Detection</h1>

      <div className="mb-4 bg-white p-4 rounded-lg shadow">
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

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-detections"
              checked={showDetections}
              onChange={(e) => setShowDetections(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="show-detections" className="text-sm text-gray-700">
              Show Detections
            </label>
          </div>
        </div>

        <ThresholdControls controls={controls} onChange={handleParamChange} />

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
              className="max-w-full max-h-full w-auto h-auto"
              style={{ objectFit: "contain" }}
            />
            {!imageSelected && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Processed image will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleObjectDetector;
