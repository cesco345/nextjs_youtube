// app/opencv/color/segmentation/ColorSegmentation.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import ThresholdControls from "../../controls/ThresholdControls";

// Also add this type declaration at the top of your file:
declare global {
  interface Window {
    cv: any;
  }
}

type ColorPreset =
  | "red"
  | "green"
  | "blue"
  | "yellow"
  | "orange"
  | "purple"
  | "pink"
  | "brown"
  | "white"
  | "black"
  | "custom";
type VisualizationMode = "original" | "mask" | "hue" | "saturation" | "value";

interface ColorRange {
  hueLow: number;
  hueHigh: number;
  satLow: number;
  satHigh: number;
  valLow: number;
  valHigh: number;
}

const COLOR_PRESETS: Record<ColorPreset, ColorRange> = {
  red: {
    hueLow: 0,
    hueHigh: 10,
    satLow: 100,
    satHigh: 255,
    valLow: 100,
    valHigh: 255,
  },
  green: {
    hueLow: 40,
    hueHigh: 80,
    satLow: 50,
    satHigh: 255,
    valLow: 50,
    valHigh: 255,
  },
  blue: {
    hueLow: 100,
    hueHigh: 130,
    satLow: 150,
    satHigh: 255,
    valLow: 0,
    valHigh: 255,
  },
  yellow: {
    hueLow: 20,
    hueHigh: 40,
    satLow: 100,
    satHigh: 255,
    valLow: 100,
    valHigh: 255,
  },
  orange: {
    hueLow: 10,
    hueHigh: 20,
    satLow: 150,
    satHigh: 255,
    valLow: 100,
    valHigh: 255,
  },
  purple: {
    hueLow: 130,
    hueHigh: 150,
    satLow: 100,
    satHigh: 255,
    valLow: 50,
    valHigh: 255,
  },
  pink: {
    hueLow: 150,
    hueHigh: 170,
    satLow: 50,
    satHigh: 255,
    valLow: 150,
    valHigh: 255,
  },
  brown: {
    hueLow: 10,
    hueHigh: 30,
    satLow: 100,
    satHigh: 255,
    valLow: 20,
    valHigh: 150,
  },
  white: {
    hueLow: 0,
    hueHigh: 180,
    satLow: 0,
    satHigh: 30,
    valLow: 200,
    valHigh: 255,
  },
  black: {
    hueLow: 0,
    hueHigh: 180,
    satLow: 0,
    satHigh: 255,
    valLow: 0,
    valHigh: 50,
  },
  custom: {
    hueLow: 0,
    hueHigh: 179,
    satLow: 0,
    satHigh: 255,
    valLow: 0,
    valHigh: 255,
  },
};

const ColorSegmentation: React.FC = () => {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSelected, setImageSelected] = useState(false);
  const [colorPreset, setColorPreset] = useState<ColorPreset>("red");
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("original");
  const [showChannels, setShowChannels] = useState(false);

  const [params, setParams] = useState<
    ColorRange & {
      blurSize: number;
      erodeSize: number;
      dilateSize: number;
      medianSize: number;
    }
  >({
    ...COLOR_PRESETS.red,
    blurSize: 3,
    erodeSize: 1,
    dilateSize: 1,
    medianSize: 3,
  });

  const inputImageRef = useRef<HTMLImageElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const satCanvasRef = useRef<HTMLCanvasElement>(null);
  const valCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  // Rest of the state and refs...

  const controls = [
    // Color Range Controls
    {
      name: "Hue Low",
      value: params.hueLow,
      min: 0,
      max: 179,
      step: 1,
    },
    {
      name: "Hue High",
      value: params.hueHigh,
      min: 0,
      max: 179,
      step: 1,
    },
    {
      name: "Saturation Low",
      value: params.satLow,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "Saturation High",
      value: params.satHigh,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "Value Low",
      value: params.valLow,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "Value High",
      value: params.valHigh,
      min: 0,
      max: 255,
      step: 1,
    },
    // Pre-processing Controls
    {
      name: "Blur Size",
      value: params.blurSize,
      min: 1,
      max: 21,
      step: 2,
    },
    {
      name: "Erode Size",
      value: params.erodeSize,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      name: "Dilate Size",
      value: params.dilateSize,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      name: "Median Size",
      value: params.medianSize,
      min: 1,
      max: 21,
      step: 2,
    },
  ];

  useEffect(() => {
    const loadOpenCv = async () => {
      try {
        // Check if OpenCV is already loaded
        if (window.cv) {
          console.log("OpenCV already loaded and initialized");
          setCvLoaded(true);
          return;
        }

        // Create and add script tag
        const script = document.createElement("script");
        script.src = "/opencv.js";
        script.async = true;

        // Create a promise to handle the loading
        await new Promise((resolve, reject) => {
          script.onload = () => {
            // Wait for cv.onRuntimeInitialized
            if (window.cv) {
              const checkInterval = setInterval(() => {
                if (window.cv.Mat) {
                  // Check if core functionality is available
                  console.log("OpenCV.js runtime initialized");
                  clearInterval(checkInterval);
                  setCvLoaded(true);
                  resolve(true);
                }
              }, 100);

              // Add timeout to avoid infinite checking
              setTimeout(() => {
                clearInterval(checkInterval);
                reject("OpenCV initialization timeout");
              }, 10000);
            } else {
              reject("OpenCV load failed");
            }
          };
          script.onerror = () => reject("Failed to load OpenCV.js script");
          document.body.appendChild(script);
        });
      } catch (err) {
        console.error("OpenCV load error:", err);
        setError(`Failed to load OpenCV: ${err}`);
      }
    };

    // Start loading OpenCV
    loadOpenCv().catch((err) => {
      console.error("Failed to load OpenCV:", err);
      setError("Failed to load OpenCV. Please refresh the page.");
    });

    // Cleanup function
    return () => {
      const script = document.querySelector('script[src="/opencv.js"]');
      if (script) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (colorPreset !== "custom") {
      setParams((prev) => ({
        ...prev,
        ...COLOR_PRESETS[colorPreset],
      }));
    }
  }, [colorPreset]);

  const handleParamChange = (name: string, value: number) => {
    const paramName = name.toLowerCase().replace(/\s+/g, "");
    const paramMapping: { [key: string]: string } = {
      huelow: "hueLow",
      huehigh: "hueHigh",
      saturationlow: "satLow",
      saturationhigh: "satHigh",
      valuelow: "valLow",
      valuehigh: "valHigh",
      blursize: "blurSize",
      erodesize: "erodeSize",
      dilatesize: "dilateSize",
      mediansize: "medianSize",
    };

    const mappedName = paramMapping[paramName] || paramName;
    setParams((prev) => ({
      ...prev,
      [mappedName]: value,
    }));

    if (colorPreset !== "custom") {
      setColorPreset("custom");
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
            setImageSelected(true);
            [
              outputCanvasRef,
              hueCanvasRef,
              satCanvasRef,
              valCanvasRef,
              maskCanvasRef,
            ].forEach((canvasRef) => {
              if (canvasRef.current) {
                canvasRef.current.width = img.naturalWidth;
                canvasRef.current.height = img.naturalHeight;
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) {
                  ctx.clearRect(
                    0,
                    0,
                    canvasRef.current.width,
                    canvasRef.current.height
                  );
                }
              }
            });
          };
          img.src = e.target?.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const showHSVChannels = (hsv: any) => {
    // Split HSV channels
    const channels = new window.cv.MatVector();
    window.cv.split(hsv, channels);

    try {
      // Display Hue channel
      if (hueCanvasRef.current) {
        const normalizedHue = new window.cv.Mat();
        window.cv.normalize(
          channels.get(0),
          normalizedHue,
          0,
          255,
          window.cv.NORM_MINMAX
        );
        window.cv.imshow(hueCanvasRef.current, normalizedHue);
        normalizedHue.delete();
      }

      // Display Saturation channel
      if (satCanvasRef.current) {
        window.cv.imshow(satCanvasRef.current, channels.get(1));
      }

      // Display Value channel
      if (valCanvasRef.current) {
        window.cv.imshow(valCanvasRef.current, channels.get(2));
      }
    } finally {
      channels.delete();
    }
  };

  const processImage = async () => {
    if (!cvLoaded || !inputImageRef.current || !outputCanvasRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const src = window.cv.imread(inputImageRef.current);
      const hsv = new window.cv.Mat();
      const mask = new window.cv.Mat();
      const processed = new window.cv.Mat();
      const result = new window.cv.Mat();

      try {
        // Pre-processing
        if (params.blurSize > 1) {
          window.cv.GaussianBlur(
            src,
            processed,
            new window.cv.Size(params.blurSize, params.blurSize),
            0
          );
        } else {
          src.copyTo(processed);
        }

        if (params.medianSize > 1) {
          window.cv.medianBlur(processed, processed, params.medianSize);
        }

        // Convert to HSV
        window.cv.cvtColor(processed, hsv, window.cv.COLOR_RGB2HSV);

        // Show HSV channels if enabled
        if (showChannels) {
          showHSVChannels(hsv);
        }

        // Create mask for color range
        const lower = new window.cv.Mat(hsv.rows, hsv.cols, hsv.type(), [
          params.hueLow,
          params.satLow,
          params.valLow,
          0,
        ]);
        const upper = new window.cv.Mat(hsv.rows, hsv.cols, hsv.type(), [
          params.hueHigh,
          params.satHigh,
          params.valHigh,
          255,
        ]);

        window.cv.inRange(hsv, lower, upper, mask);

        // Special handling for red color (wraps around)
        if (colorPreset === "red") {
          const maskUpper = new window.cv.Mat();
          const lowerRed2 = new window.cv.Mat(hsv.rows, hsv.cols, hsv.type(), [
            170,
            params.satLow,
            params.valLow,
            0,
          ]);
          const upperRed2 = new window.cv.Mat(hsv.rows, hsv.cols, hsv.type(), [
            180,
            params.satHigh,
            params.valHigh,
            255,
          ]);

          window.cv.inRange(hsv, lowerRed2, upperRed2, maskUpper);
          window.cv.add(mask, maskUpper, mask);

          maskUpper.delete();
          lowerRed2.delete();
          upperRed2.delete();
        }

        // Morphological operations
        if (params.erodeSize > 0) {
          const erodeKernel = window.cv.getStructuringElement(
            window.cv.MORPH_RECT,
            new window.cv.Size(params.erodeSize + 1, params.erodeSize + 1)
          );
          window.cv.erode(mask, mask, erodeKernel);
          erodeKernel.delete();
        }

        if (params.dilateSize > 0) {
          const dilateKernel = window.cv.getStructuringElement(
            window.cv.MORPH_RECT,
            new window.cv.Size(params.dilateSize + 1, params.dilateSize + 1)
          );
          window.cv.dilate(mask, mask, dilateKernel);
          dilateKernel.delete();
        }

        // Show mask preview if enabled
        if (maskCanvasRef.current) {
          window.cv.imshow(maskCanvasRef.current, mask);
        }

        // Final result based on visualization mode
        switch (visualizationMode) {
          case "mask":
            mask.copyTo(result);
            break;
          case "hue":
            const hueChannel = new window.cv.MatVector();
            window.cv.split(hsv, hueChannel);
            window.cv.normalize(
              hueChannel.get(0),
              result,
              0,
              255,
              window.cv.NORM_MINMAX
            );
            hueChannel.delete();
            break;
          case "saturation":
            const satChannel = new window.cv.MatVector();
            window.cv.split(hsv, satChannel);
            satChannel.get(1).copyTo(result);
            satChannel.delete();
            break;
          case "value":
            const valChannel = new window.cv.MatVector();
            window.cv.split(hsv, valChannel);
            valChannel.get(2).copyTo(result);
            valChannel.delete();
            break;
          default:
            window.cv.bitwise_and(src, src, result, mask);
        }

        // Display result
        window.cv.imshow(outputCanvasRef.current, result);

        // Cleanup
        lower.delete();
        upper.delete();
      } finally {
        src.delete();
        hsv.delete();
        mask.delete();
        processed.delete();
        result.delete();
      }
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Error processing image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Color Segmentation</h1>

      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Preset
            </label>
            <select
              value={colorPreset}
              onChange={(e) => setColorPreset(e.target.value as ColorPreset)}
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.keys(COLOR_PRESETS).map((preset) => (
                <option key={preset} value={preset}>
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visualization Mode
            </label>
            <select
              value={visualizationMode}
              onChange={(e) =>
                setVisualizationMode(e.target.value as VisualizationMode)
              }
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="original">Original</option>
              <option value="mask">Mask</option>
              <option value="hue">Hue Channel</option>
              <option value="saturation">Saturation Channel</option>
              <option value="value">Value Channel</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showChannels}
                onChange={(e) => setShowChannels(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show HSV Channels</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          onClick={processImage}
          disabled={!imageSelected || loading || !cvLoaded}
          className={`mb-4 px-4 py-2 rounded-md font-medium ${
            !imageSelected || loading || !cvLoaded
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading
            ? "Processing..."
            : cvLoaded
            ? "Segment Colors"
            : "Loading OpenCV..."}
        </button>

        <div className="mb-4">
          <ThresholdControls controls={controls} onChange={handleParamChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative w-full h-[400px] border rounded bg-gray-50">
            <img
              ref={inputImageRef}
              className="absolute inset-0 w-full h-full object-contain"
              alt="Input"
              style={{ display: imageSelected ? "block" : "none" }}
            />
            {!imageSelected && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                No image selected
              </div>
            )}
          </div>

          <div className="relative w-full h-[400px] border rounded bg-gray-50">
            <canvas
              ref={outputCanvasRef}
              className="absolute inset-0 w-full h-full object-contain"
            />
            {!imageSelected && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Processed image will appear here
              </div>
            )}
          </div>
        </div>

        {showChannels && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative w-full h-[200px] border rounded bg-gray-50">
              <canvas
                ref={hueCanvasRef}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                Hue Channel
              </div>
            </div>
            <div className="relative w-full h-[200px] border rounded bg-gray-50">
              <canvas
                ref={satCanvasRef}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                Saturation Channel
              </div>
            </div>
            <div className="relative w-full h-[200px] border rounded bg-gray-50">
              <canvas
                ref={valCanvasRef}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                Value Channel
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="relative w-full h-[200px] border rounded bg-gray-50">
            <canvas
              ref={maskCanvasRef}
              className="absolute inset-0 w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              Mask Preview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorSegmentation;
