// app/opencv/detection/template/TemplateDetector.tsx
"use client";
import React, { useState, useRef } from "react";
import { useOpenCV } from "../../../hooks/opencv/useOpenCV";
import ImageUpload from "../../../components/opencv/ImageUpload";
import ImagePreview from "../../../components/opencv/ImagePreview";
import OutputPreview from "../../../components/opencv/OutputPreview";
import ThresholdControls from "../../controls/ThresholdControls";
import { DetectionProcessor } from "../utils/processors";

const TemplateDetector: React.FC = () => {
  const { cvLoaded, error: cvError } = useOpenCV();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mainImageSelected, setMainImageSelected] = useState(false);
  const [templateSelected, setTemplateSelected] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  const mainImageRef = useRef<HTMLImageElement>(null);
  const templateImageRef = useRef<HTMLImageElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  const [params, setParams] = useState({
    threshold: 0.5,
    minScale: 0.5,
    maxScale: 2.0,
    scales: 20,
  });

  const controls = [
    {
      name: "Match Threshold",
      value: params.threshold * 100,
      min: 10,
      max: 100,
      step: 1,
    },
    {
      name: "Min Scale",
      value: params.minScale * 100,
      min: 20,
      max: 100,
      step: 5,
    },
    {
      name: "Max Scale",
      value: params.maxScale * 100,
      min: 100,
      max: 200,
      step: 5,
    },
    {
      name: "Scale Steps",
      value: params.scales,
      min: 1,
      max: 50,
      step: 1,
    },
  ];

  const handleParamChange = (name: string, value: number) => {
    console.log("Parameter change:", name, value);
    const paramName = name.toLowerCase().replace(/\s+/g, "");

    let newValue = value;
    if (
      paramName === "matchthreshold" ||
      paramName === "minscale" ||
      paramName === "maxscale"
    ) {
      newValue = value / 100;
    }

    const paramMapping: { [key: string]: string } = {
      matchthreshold: "threshold",
      minscale: "minScale",
      maxscale: "maxScale",
      scalesteps: "scales",
    };

    setParams((prev) => ({
      ...prev,
      [paramMapping[paramName] || paramName]: newValue,
    }));
  };

  const handleMainImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && mainImageRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (mainImageRef.current) {
          const img = mainImageRef.current;
          img.onload = () => {
            setMainImageSelected(true);
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

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && templateImageRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (templateImageRef.current) {
          templateImageRef.current.onload = () => {
            setTemplateSelected(true);
            setMatchCount(0);
            if (outputCanvasRef.current) {
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
          templateImageRef.current.src = e.target?.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!cvLoaded) {
      setError("OpenCV is not loaded yet");
      return;
    }

    if (
      !mainImageRef.current ||
      !templateImageRef.current ||
      !outputCanvasRef.current
    ) {
      setError("Images or canvas reference is missing");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Starting image processing with params:", params);

      const src = window.cv.imread(mainImageRef.current);
      const template = window.cv.imread(templateImageRef.current);

      console.log("Source size:", src.cols, "x", src.rows);
      console.log("Template size:", template.cols, "x", template.rows);

      const { result, matchCount: count } = DetectionProcessor.processTemplate(
        window.cv,
        src,
        template,
        params
      );

      window.cv.imshow(outputCanvasRef.current, result);
      setMatchCount(count);

      result.delete();
      src.delete();
      template.delete();
    } catch (err) {
      console.error("Image processing error:", err);
      setError("Error processing image");
    } finally {
      setLoading(false);
    }
  };

  const saveProcessedImage = () => {
    if (!outputCanvasRef.current) {
      setError("No processed image to save");
      return;
    }

    const link = document.createElement("a");
    link.href = outputCanvasRef.current.toDataURL("image/png");
    link.download = "template_matching_result.png";
    link.click();
  };

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Template Matching</h1>

      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Main Image
            </label>
            <ImageUpload onImageUpload={handleMainImageUpload} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Template Image
            </label>
            <ImageUpload onImageUpload={handleTemplateUpload} />
          </div>
        </div>
        {(error || cvError) && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error || cvError}
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={processImage}
            disabled={
              !mainImageSelected || !templateSelected || loading || !cvLoaded
            }
            className={`px-4 py-2 rounded-md font-medium ${
              !mainImageSelected || !templateSelected || loading || !cvLoaded
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading ? "Processing..." : "Find Matches"}
          </button>

          {matchCount > 0 && (
            <span className="text-sm text-gray-600">
              Found: {matchCount} {matchCount === 1 ? "match" : "matches"}
            </span>
          )}
        </div>
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={saveProcessedImage}
            disabled={!mainImageSelected || !templateSelected || !cvLoaded}
            className={`px-4 py-2 rounded-md font-medium ${
              !mainImageSelected || !templateSelected || !cvLoaded
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            Save Processed Image
          </button>
        </div>
        <ThresholdControls controls={controls} onChange={handleParamChange} />
        // Replace the grid section with this code:
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            {/* Main Image Container */}
            <div className="relative w-full h-[400px] border rounded bg-gray-50 overflow-hidden flex items-center justify-center">
              <img
                ref={mainImageRef}
                className="max-w-full max-h-full object-contain"
                alt="Main"
                style={{
                  display: mainImageSelected ? "block" : "none",
                  width: "auto",
                  height: "auto",
                }}
              />
              {!mainImageSelected && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  No main image selected
                </div>
              )}
            </div>

            {/* Template Image Container */}
            <div className="relative w-full h-[150px] border rounded bg-gray-50 overflow-hidden flex items-center justify-center">
              <img
                ref={templateImageRef}
                className="max-w-full max-h-full object-contain"
                alt="Template"
                style={{
                  display: templateSelected ? "block" : "none",
                  width: "auto",
                  height: "auto",
                }}
              />
              {!templateSelected && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  No template image selected
                </div>
              )}
            </div>
          </div>

          {/* Output Canvas Container */}
          <div className="relative w-full h-[400px] border rounded bg-gray-50 overflow-hidden flex items-center justify-center">
            <canvas
              ref={outputCanvasRef}
              className="max-w-full max-h-full"
              style={{
                objectFit: "contain",
                width: "auto",
                height: "auto",
              }}
            />
            {!mainImageSelected && (
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

export default TemplateDetector;
