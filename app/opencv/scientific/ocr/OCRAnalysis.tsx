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

const OCRAnalysis: React.FC = () => {
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
    resizefactor: 1,
    useotsu: false,
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
      min: 0.5,
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

          // Set both canvases to the natural image size
          outputCanvasRef.current.width = width;
          outputCanvasRef.current.height = height;
          processedCanvasRef.current.width = width;
          processedCanvasRef.current.height = height;

          // Draw initial image
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

    // Redraw original image
    ctx.drawImage(inputImageRef.current, 0, 0);

    // Draw selection rectangle
    ctx.beginPath();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    const width = endPosition.x - startPosition.x;
    const height = endPosition.y - startPosition.y;
    ctx.strokeRect(startPosition.x, startPosition.y, width, height);

    // Add transparent fill
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

    try {
      const x = Math.min(startPosition.x, endPosition.x);
      const y = Math.min(startPosition.y, endPosition.y);
      const width = Math.abs(endPosition.x - startPosition.x);
      const height = Math.abs(endPosition.y - startPosition.y);

      if (width < 10 || height < 10) {
        throw new Error("Selected area is too small");
      }

      // Create temporary canvas for processing
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;

      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) throw new Error("Failed to create temporary context");

      // Copy selection to temp canvas
      const sourceCtx = outputCanvasRef.current.getContext("2d");
      if (!sourceCtx) throw new Error("Failed to get source context");

      const imageData = sourceCtx.getImageData(x, y, width, height);
      tempCtx.putImageData(imageData, 0, 0);

      // Process with OpenCV
      let src = window.cv.imread(tempCanvas);
      let processed = new window.cv.Mat();

      try {
        // Resize
        window.cv.resize(
          src,
          processed,
          new window.cv.Size(
            width * params.resizefactor,
            height * params.resizefactor
          ),
          0,
          0,
          window.cv.INTER_CUBIC
        );

        // Convert to grayscale
        window.cv.cvtColor(processed, processed, window.cv.COLOR_RGBA2GRAY);

        // Enhance contrast
        window.cv.equalizeHist(processed, processed);

        // Apply thresholding
        if (params.useotsu) {
          window.cv.threshold(
            processed,
            processed,
            0,
            255,
            window.cv.THRESH_BINARY | window.cv.THRESH_OTSU
          );
        } else {
          window.cv.adaptiveThreshold(
            processed,
            processed,
            255,
            window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            window.cv.THRESH_BINARY,
            params.threshold,
            2
          );
        }

        // Show processed image
        if (processedCanvasRef.current) {
          window.cv.imshow(processedCanvasRef.current, processed);
        }

        // Perform OCR with Greek language
        const result = await Tesseract.recognize(tempCanvas, "eng+grc", {
          logger: (m) => console.log(m),
          tessedit_char_whitelist:
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,- αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ",
          tessedit_pageseg_mode: "6",
          preserve_interword_spaces: "1",
        });

        // // Perform OCR
        // const result = await Tesseract.recognize(tempCanvas, "eng", {
        //   logger: (m) => console.log(m),
        //   tessedit_char_whitelist:
        //     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,- ",
        //   tessedit_pageseg_mode: "6",
        //   preserve_interword_spaces: "1",
        // });

        setExtractedText(result.data.text.trim());
      } finally {
        src.delete();
        processed.delete();
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error processing selection"
      );
    } finally {
      setProcessing(false);
    }
  }, [cvLoaded, startPosition, endPosition, processing, params]);

  return (
    <div className="min-h-screen p-4">
      {/* <h1 className="text-2xl font-bold mb-4">OCR Analysis</h1> */}

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
        </div>

        {extractedText && (
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Extracted Text:</h3>
            <p className="font-mono text-sm whitespace-pre-wrap">
              {extractedText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OCRAnalysis;
