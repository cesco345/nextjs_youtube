"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import ThresholdControls from "../../controls/ThresholdControls";

const FeatureDetector: React.FC = () => {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeatures, setShowFeatures] = useState(true);
  const [imageSelected, setImageSelected] = useState(false);
  const [detectorType, setDetectorType] = useState<"orb" | "akaze">("orb");

  const [params, setParams] = useState({
    nfeatures: 500,
    scalefactor: 1.2,
    nlevels: 8,
  });

  const inputImageRef = useRef<HTMLImageElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  const controls = useMemo(
    () => [
      {
        name: "Features Count",
        value: params.nfeatures,
        min: 100,
        max: 3000,
        step: 100,
      },
      {
        name: "Scale Factor",
        value: params.scalefactor * 100,
        min: 110,
        max: 150,
        step: 5,
      },
      {
        name: "Levels",
        value: params.nlevels,
        min: 3,
        max: 12,
        step: 1,
      },
    ],
    [params]
  );

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
      featurescount: "nfeatures",
      scalefactor: "scalefactor",
      levels: "nlevels",
    };

    const paramName = paramMapping[name];
    if (paramName) {
      setParams((prev) => ({
        ...prev,
        [paramName]: name === "scalefactor" ? value / 100 : value,
      }));
    }
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
    link.download = "feature_detection_result.png";
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

      // Create working images
      const gray = new window.cv.Mat();
      const result = src.clone();

      try {
        // Convert to grayscale
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);

        // Create feature detector
        let detector;
        if (detectorType === "orb") {
          detector = new window.cv.ORB(
            params.nfeatures,
            params.scalefactor,
            params.nlevels
          );
        } else {
          detector = new window.cv.AKAZE();
        }

        // Detect keypoints
        const keypoints = new window.cv.KeyPointVector();
        const descriptors = new window.cv.Mat();

        detector.detect(gray, keypoints);
        console.log("Detected keypoints:", keypoints.size());

        if (showFeatures) {
          // Draw keypoints
          for (let i = 0; i < keypoints.size(); i++) {
            const kp = keypoints.get(i);
            const point = new window.cv.Point(kp.pt.x, kp.pt.y);

            // Draw circle for each keypoint
            window.cv.circle(
              result,
              point,
              3, // radius
              [0, 255, 0, 255], // green color
              1, // thickness
              window.cv.LINE_AA
            );

            // Draw orientation line
            if (kp.angle !== -1) {
              const angle = (kp.angle * Math.PI) / 180;
              const line_length = 15;
              const endPoint = new window.cv.Point(
                kp.pt.x + Math.cos(angle) * line_length,
                kp.pt.y + Math.sin(angle) * line_length
              );
              window.cv.line(
                result,
                point,
                endPoint,
                [255, 0, 0, 255], // red color
                1,
                window.cv.LINE_AA
              );
            }
          }

          // Add text with number of features
          window.cv.putText(
            result,
            `Features: ${keypoints.size()}`,
            new window.cv.Point(20, 40),
            window.cv.FONT_HERSHEY_SIMPLEX,
            1,
            [0, 255, 0, 255],
            2
          );
        }

        // Show result
        window.cv.imshow(outputCanvasRef.current, result);

        // Cleanup detector
        detector.delete();
        keypoints.delete();
        descriptors.delete();
      } finally {
        // Cleanup
        src.delete();
        gray.delete();
        result.delete();
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
      <h1 className="text-3xl font-bold mb-6">Feature Detection</h1>

      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detection Method
          </label>
          <select
            value={detectorType}
            onChange={(e) => setDetectorType(e.target.value as "orb" | "akaze")}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="orb">ORB (Oriented FAST and Rotated BRIEF)</option>
            <option value="akaze">AKAZE (Accelerated KAZE)</option>
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
              ? "Detect Features"
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
              id="show-features"
              checked={showFeatures}
              onChange={(e) => setShowFeatures(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="show-features" className="text-sm text-gray-700">
              Show Features
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

export default FeatureDetector;
