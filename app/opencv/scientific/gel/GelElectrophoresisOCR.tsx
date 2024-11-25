// app/opencv/document/gel/GelElectrophoresisOCR.tsx
"use client";

import React, { useRef, useState, useCallback } from "react";
import { useOpenCV } from "../../../hooks/opencv/useOpenCV";
import ImageUpload from "../../../components/opencv/ImageUpload";
import ThresholdControls from "../../controls/ThresholdControls";
import Tesseract from "tesseract.js";

interface Position {
  x: number;
  y: number;
}

const GelElectrophoresisOCR: React.FC = () => {
  const { cvLoaded, error: cvError } = useOpenCV();
  const [imageSelected, setImageSelected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(cvError);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState<Position | null>(null);
  const [endPosition, setEndPosition] = useState<Position | null>(null);

  const [params, setParams] = useState({
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

    // Initialize OpenCV Mats
    let src: any = null;
    let processed: any = null;
    let normalized: any = null;
    let binary: any = null;
    let contours: any = null;
    let hierarchy: any = null;

    try {
      const x = Math.min(startPosition.x, endPosition.x);
      const y = Math.min(startPosition.y, endPosition.y);
      const width = Math.abs(endPosition.x - startPosition.x);
      const height = Math.abs(endPosition.y - startPosition.y);

      if (width < 10 || height < 10) {
        throw new Error("Selected area is too small");
      }

      // Create temporary canvas
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;

      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      if (!tempCtx) throw new Error("Failed to create temporary context");

      const sourceCtx = outputCanvasRef.current.getContext("2d");
      if (!sourceCtx) throw new Error("Failed to get source context");

      // Copy the selected area
      const imageData = sourceCtx.getImageData(x, y, width, height);
      tempCtx.putImageData(imageData, 0, 0);

      // Read source image
      src = window.cv.imread(tempCanvas);
      processed = new window.cv.Mat();

      // Convert to grayscale
      window.cv.cvtColor(src, processed, window.cv.COLOR_RGBA2GRAY);

      // Normalize the image
      normalized = new window.cv.Mat();
      window.cv.normalize(processed, normalized, 0, 255, window.cv.NORM_MINMAX);

      // Apply threshold to detect bands
      binary = new window.cv.Mat();
      window.cv.threshold(
        normalized,
        binary,
        0,
        255,
        window.cv.THRESH_BINARY_INV + window.cv.THRESH_OTSU
      );

      // Find contours of bands
      contours = new window.cv.MatVector();
      hierarchy = new window.cv.Mat();
      window.cv.findContours(
        binary,
        contours,
        hierarchy,
        window.cv.RETR_EXTERNAL,
        window.cv.CHAIN_APPROX_SIMPLE
      );

      // Process contours to find band positions and characteristics
      let bands = [];
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = window.cv.contourArea(contour);

        // Filter out noise by area
        if (area > 50) {
          const moments = window.cv.moments(contour);
          const centerY = moments.m01 / moments.m00;
          const centerX = moments.m10 / moments.m00;
          const rect = window.cv.boundingRect(contour);

          // Calculate band intensity
          const roi = normalized.roi(rect);
          const mean = window.cv.mean(roi);
          roi.delete();

          // Calculate band shape characteristics
          const perimeter = window.cv.arcLength(contour, true);
          const circularity = (4 * Math.PI * area) / (perimeter * perimeter);

          bands.push({
            y: centerY,
            x: centerX,
            width: rect.width,
            height: rect.height,
            area: area,
            intensity: mean[0],
            perimeter: perimeter,
            circularity: circularity,
            rect: rect,
          });

          contour.delete();
        }
      }

      // Sort bands by position (top to bottom)
      bands.sort((a, b) => a.y - b.y);

      // Calculate inter-band distances and statistics
      const bandDistances = [];
      for (let i = 1; i < bands.length; i++) {
        bandDistances.push(bands[i].y - bands[i - 1].y);
      }

      // Calculate average band characteristics
      const avgIntensity =
        bands.reduce((sum, band) => sum + band.intensity, 0) / bands.length;
      const avgWidth =
        bands.reduce((sum, band) => sum + band.width, 0) / bands.length;
      const avgDistance =
        bandDistances.length > 0
          ? bandDistances.reduce((sum, dist) => sum + dist, 0) /
            bandDistances.length
          : 0;

      // Draw result on processed image
      let result = window.cv.Mat.zeros(height, width, window.cv.CV_8UC3);
      window.cv.cvtColor(binary, result, window.cv.COLOR_GRAY2BGR);

      // Draw detailed band analysis
      for (let i = 0; i < bands.length; i++) {
        const band = bands[i];
        const y = band.y;

        // Draw band outline
        window.cv.rectangle(
          result,
          new window.cv.Point(band.rect.x, band.rect.y),
          new window.cv.Point(
            band.rect.x + band.rect.width,
            band.rect.y + band.rect.height
          ),
          new window.cv.Scalar(0, 255, 0),
          1
        );

        // Draw center line
        window.cv.line(
          result,
          new window.cv.Point(0, y),
          new window.cv.Point(width, y),
          new window.cv.Scalar(255, 0, 0),
          1
        );

        // Draw band number and position
        const relativePos = ((y / height) * 100).toFixed(1);
        window.cv.putText(
          result,
          `${i + 1}: ${relativePos}%`,
          new window.cv.Point(5, y - 5),
          window.cv.FONT_HERSHEY_SIMPLEX,
          0.3,
          new window.cv.Scalar(0, 255, 0),
          1
        );

        // Draw intensity bar
        const intensityWidth = (band.intensity / 255) * 30;
        window.cv.rectangle(
          result,
          new window.cv.Point(width - 35, y - 5),
          new window.cv.Point(width - 35 + intensityWidth, y - 2),
          new window.cv.Scalar(0, 255, 255),
          -1
        );
      }

      // Show processed image
      if (processedCanvasRef.current) {
        window.cv.imshow(processedCanvasRef.current, result);
      }

      // Prepare detailed analysis output
      let processedText = "Comprehensive Band Analysis:\n";
      processedText += `Number of bands detected: ${bands.length}\n\n`;

      processedText += "Individual Band Analysis:\n";
      bands.forEach((band, index) => {
        const relativePos = ((band.y / height) * 100).toFixed(1);
        const normalizedIntensity = ((band.intensity / 255) * 100).toFixed(1);

        processedText += `\nBand ${index + 1}:\n`;
        processedText += `  Position: ${relativePos}% from top\n`;
        processedText += `  Intensity: ${normalizedIntensity}%\n`;
        processedText += `  Width: ${band.width.toFixed(1)} pixels\n`;
        processedText += `  Height: ${band.height.toFixed(1)} pixels\n`;
        processedText += `  Area: ${band.area.toFixed(1)} pixels²\n`;
        processedText += `  Circularity: ${band.circularity.toFixed(3)}\n`;

        if (index > 0) {
          const distance = bandDistances[index - 1].toFixed(1);
          processedText += `  Distance from previous band: ${distance} pixels\n`;
        }
      });

      processedText += "\nLane Statistics:\n";
      processedText += `Average band intensity: ${(
        (avgIntensity / 255) *
        100
      ).toFixed(1)}%\n`;
      processedText += `Average band width: ${avgWidth.toFixed(1)} pixels\n`;
      if (bandDistances.length > 0) {
        processedText += `Average band spacing: ${avgDistance.toFixed(
          1
        )} pixels\n`;
      }

      // Add Rf values
      processedText += "\nRelative Mobility (Rf values):\n";
      const totalDistance = height;
      bands.forEach((band, index) => {
        const rf = (band.y / totalDistance).toFixed(3);
        processedText += `Band ${index + 1}: ${rf}\n`;
      });

      setExtractedText(processedText);
      result.delete();
    } catch (err) {
      console.error("Processing error:", err);
      setError(
        err instanceof Error ? err.message : "Error processing selection"
      );
    } finally {
      // Cleanup
      if (src) src.delete();
      if (processed) processed.delete();
      if (normalized) normalized.delete();
      if (binary) binary.delete();
      if (contours) contours.delete();
      if (hierarchy) hierarchy.delete();
      setProcessing(false);
    }
  }, [cvLoaded, startPosition, endPosition, processing]);

  return (
    <div className="min-h-screen p-4">
      {/* <h1 className="text-2xl font-bold mb-4">Gel Electrophoresis Analysis</h1> */}

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
