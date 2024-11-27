// File: components/GelElectrophoresisOCR.tsx
import React, { useRef, useState, useCallback } from "react";
import { useOpenCV } from "../../../hooks/opencv/useOpenCV";
import ImageUpload from "../../../components/opencv/ImageUpload";
import ThresholdControls from "../../controls/ThresholdControls";
import { Position, ProcessingParams, GelAnalysis } from "./types/gel";
import * as canvasUtils from "./utils/canvasUtils";
import * as imageProcessing from "./utils/imageProcessing";
import * as gelAnalysis from "./utils/gelAnalysis";
import * as visualization from "./utils/visualization";
import { generateAnalysisText } from "./utils/analysisText";

const GelElectrophoresisOCR: React.FC = () => {
  const { cvLoaded, error: cvError } = useOpenCV();
  const [imageSelected, setImageSelected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(cvError);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState<Position | null>(null);
  const [endPosition, setEndPosition] = useState<Position | null>(null);

  const [params, setParams] = useState<ProcessingParams>({
    threshold: 5,
    resizefactor: 2,
    useotsu: true,
    denoise: true,
    enhanceContrast: true,
  });

  const inputImageRef = useRef<HTMLImageElement | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const controls = [
    {
      name: "threshold",
      value: params.threshold,
      min: 3,
      max: 255,
      step: 2,
    },
    {
      name: "resizefactor",
      value: params.resizefactor,
      min: 1,
      max: 4,
      step: 0.5,
    },
  ];

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !inputImageRef.current) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (!inputImageRef.current || !e.target?.result) return;

        inputImageRef.current.src = e.target.result as string;
        inputImageRef.current.onload = () => {
          if (!outputCanvasRef.current || !processedCanvasRef.current) return;

          const width = inputImageRef.current!.naturalWidth;
          const height = inputImageRef.current!.naturalHeight;

          outputCanvasRef.current.width = width;
          outputCanvasRef.current.height = height;
          processedCanvasRef.current.width = width;
          processedCanvasRef.current.height = height;

          const ctx = outputCanvasRef.current.getContext("2d");
          if (ctx) {
            ctx.drawImage(inputImageRef.current, 0, 0);
          }

          setImageSelected(true);
          setExtractedText("");
          setError(null);
          setStartPosition(null);
          setEndPosition(null);
        };
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const getCanvasPosition = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: Math.floor((event.clientX - rect.left) * scaleX),
        y: Math.floor((event.clientY - rect.top) * scaleY),
      };
    },
    []
  );

  const drawSelection = useCallback(() => {
    if (
      !outputCanvasRef.current ||
      !inputImageRef.current ||
      !startPosition ||
      !endPosition
    )
      return;

    const ctx = outputCanvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(inputImageRef.current, 0, 0);

    ctx.beginPath();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    const width = endPosition.x - startPosition.x;
    const height = endPosition.y - startPosition.y;
    ctx.strokeRect(startPosition.x, startPosition.y, width, height);

    ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
    ctx.fillRect(startPosition.x, startPosition.y, width, height);
  }, [startPosition, endPosition]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!imageSelected) return;

      const pos = getCanvasPosition(event);
      setStartPosition(pos);
      setEndPosition(pos);
      setIsDragging(true);
      setExtractedText("");
    },
    [imageSelected, getCanvasPosition]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !startPosition) return;

      const pos = getCanvasPosition(event);
      setEndPosition(pos);
      drawSelection();
    },
    [isDragging, startPosition, getCanvasPosition, drawSelection]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleParamChange = useCallback((name: string, value: number) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const analyzeGel = async (binary: any, width: number, height: number) => {
    const contours = new window.cv.MatVector();
    const hierarchy = new window.cv.Mat();

    try {
      // Find contours
      window.cv.findContours(
        binary,
        contours,
        hierarchy,
        window.cv.RETR_EXTERNAL,
        window.cv.CHAIN_APPROX_SIMPLE
      );

      // Create vertical intensity profile to detect lanes
      const profile = new Array(width).fill(0);
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          profile[x] += binary.ucharPtr(y, x)[0];
        }
      }

      // Detect lanes using peaks in the profile
      const lanes: any[] = [];
      let globalMaxIntensity = 0;
      let inLane = false;
      let laneStart = 0;
      const minLaneWidth = Math.floor(width * 0.03);
      const threshold = Math.max(...profile) * 0.1;

      // Find lane boundaries
      for (let x = 0; x < width; x++) {
        if (!inLane && profile[x] > threshold) {
          inLane = true;
          laneStart = x;
        } else if (inLane && (profile[x] <= threshold || x === width - 1)) {
          const laneWidth = x - laneStart;
          if (laneWidth >= minLaneWidth) {
            lanes.push({
              laneNumber: lanes.length + 1,
              startX: laneStart,
              endX: x,
              bands: [],
              maxIntensity: 0,
            });
          }
          inLane = false;
        }
      }

      // Process detected lanes
      const analysis = await processLanes(
        lanes,
        contours,
        globalMaxIntensity,
        height
      );
      return analysis;
    } finally {
      contours.delete();
      hierarchy.delete();
    }
  };

  const processLanes = async (
    lanes: any[],
    contours: any,
    globalMaxIntensity: number,
    height: number
  ) => {
    // Group contours into detected lanes
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = window.cv.contourArea(contour);
      const minArea = contours.size() * height * 0.0001;

      if (area > minArea) {
        const moments = window.cv.moments(contour);
        const centerX = moments.m10 / moments.m00;
        const centerY = moments.m01 / moments.m00;
        const rect = window.cv.boundingRect(contour);

        const lane = lanes.find((l) => centerX >= l.startX && centerX < l.endX);

        if (lane) {
          const band = {
            position: centerY,
            intensity: moments.m00 / area,
            estimatedWeight: 0,
            area: area,
            width: rect.width,
            height: rect.height,
            centerX: centerX,
            centerY: centerY,
          };

          lane.bands.push(band);
          lane.maxIntensity = Math.max(lane.maxIntensity, band.intensity);
          globalMaxIntensity = Math.max(globalMaxIntensity, band.intensity);
        }
      }
      contour.delete();
    }

    // Sort bands in each lane
    lanes.forEach((lane) => {
      lane.bands.sort((a: any, b: any) => a.position - b.position);
    });

    // Identify standard lane and calculate weights
    const standardLane = gelAnalysis.findStandardLane(lanes);
    const standardCurve = standardLane
      ? gelAnalysis.detectStandards(standardLane, height)
      : undefined;

    if (standardCurve) {
      calculateMolecularWeights(lanes, standardCurve, height);
    }

    return {
      standardCurve,
      lanes,
      globalMaxIntensity,
    };
  };

  const calculateMolecularWeights = (
    lanes: any[],
    standardCurve: any[],
    height: number
  ) => {
    lanes.forEach((lane) => {
      lane.bands.forEach((band: any) => {
        const pos = band.position;
        let higher = standardCurve[0];
        let lower = standardCurve[standardCurve.length - 1];

        for (let i = 0; i < standardCurve.length - 1; i++) {
          if (
            pos >= standardCurve[i].position &&
            pos <= standardCurve[i + 1].position
          ) {
            higher = standardCurve[i];
            lower = standardCurve[i + 1];
            break;
          }
        }

        const fraction =
          (pos - higher.position) / (lower.position - higher.position);
        const logWeight =
          Math.log10(higher.weight) +
          fraction * (Math.log10(lower.weight) - Math.log10(higher.weight));

        band.estimatedWeight = Math.pow(10, logWeight);
      });
    });
  };

  const processSelection = useCallback(async () => {
    if (
      !cvLoaded ||
      !outputCanvasRef.current ||
      !startPosition ||
      !endPosition ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setError(null);

    let src: any = null;
    let processed: any = null;
    let binary: any = null;

    try {
      const { x, y, width, height } = canvasUtils.getSelectionDimensions(
        startPosition,
        endPosition
      );

      const tempCanvas = await canvasUtils.createProcessingCanvas(
        x,
        y,
        width,
        height,
        outputCanvasRef
      );

      src = window.cv.imread(tempCanvas);
      processed = await imageProcessing.preprocessImage(src, params);
      binary = await imageProcessing.createBinaryImage(processed, params);

      const analysis = await analyzeGel(binary, width, height);
      const result = await visualization.visualizeResults(
        analysis,
        width,
        height
      );
      const text = generateAnalysisText(analysis, height);

      if (processedCanvasRef.current) {
        window.cv.imshow(processedCanvasRef.current, result);
      }
      setExtractedText(text);
    } catch (err) {
      console.error("Processing error:", err);
      setError(
        err instanceof Error ? err.message : "Error processing selection"
      );
    } finally {
      [src, processed, binary].forEach((mat) => {
        if (mat) mat.delete();
      });
      setProcessing(false);
    }
  }, [cvLoaded, startPosition, endPosition, processing, params]);

  return (
    <div className="min-h-screen p-4">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <div className="space-y-4">
        <ImageUpload onImageUpload={handleImageUpload} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="font-medium mb-2">Input Image:</p>
            <div className="relative border rounded">
              <img ref={inputImageRef} className="hidden" alt="" />
              <canvas
                ref={outputCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-auto cursor-crosshair"
              />
            </div>
          </div>

          <div>
            <p className="font-medium mb-2">Processed Image:</p>
            <div className="relative border rounded">
              <canvas ref={processedCanvasRef} className="w-full h-auto" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ThresholdControls controls={controls} onChange={handleParamChange} />

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={params.useotsu}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, useotsu: e.target.checked }))
                }
                className="rounded text-blue-600"
              />
              <span>Use Otsu thresholding</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={params.denoise}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, denoise: e.target.checked }))
                }
                className="rounded text-blue-600"
              />
              <span>Apply Denoising</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={params.enhanceContrast}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    enhanceContrast: e.target.checked,
                  }))
                }
                className="rounded text-blue-600"
              />
              <span>Enhance Contrast</span>
            </label>
          </div>

          <button
            onClick={processSelection}
            disabled={
              !imageSelected || !startPosition || !endPosition || processing
            }
            className={`px-4 py-2 rounded-md text-white font-medium ${
              !imageSelected || !startPosition || !endPosition || processing
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {processing ? "Processing..." : "Process Selection"}
          </button>
        </div>

        {extractedText && (
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Extracted Data:</h3>
            <p className="font-mono text-sm whitespace-pre-wrap">
              {extractedText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GelElectrophoresisOCR;
