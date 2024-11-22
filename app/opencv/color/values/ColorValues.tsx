// app/opencv/color/values/ColorValues.tsx
"use client";
import React, { useRef, useState, useCallback } from "react";
import { useOpenCV } from "../../../hooks/opencv/useOpenCV";
import ImageUpload from "../../../components/opencv/ImageUpload";

interface ColorInfo {
  rgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  hex: string;
}

const getColorDescription = (colorInfo: ColorInfo) => {
  const { rgb, hsv } = colorInfo;

  const maxChannel = Math.max(rgb.r, rgb.g, rgb.b);
  let primaryColor = "";
  if (maxChannel === rgb.r) primaryColor = "red";
  else if (maxChannel === rgb.g) primaryColor = "green";
  else if (maxChannel === rgb.b) primaryColor = "blue";

  return {
    rgb: `RGB values show ${primaryColor} dominance:
      • Red: ${rgb.r} (${Math.round(rgb.r / 2.55)}%) - ${
      rgb.r > 127 ? "High" : "Low"
    } red content
      • Green: ${rgb.g} (${Math.round(rgb.g / 2.55)}%) - ${
      rgb.g > 127 ? "High" : "Low"
    } green content
      • Blue: ${rgb.b} (${Math.round(rgb.b / 2.55)}%) - ${
      rgb.b > 127 ? "High" : "Low"
    } blue content`,

    hsv: `HSV representation shows:
      • Hue: ${hsv.h}° - ${
      hsv.h < 30
        ? "Red range"
        : hsv.h < 90
        ? "Yellow-Green range"
        : hsv.h < 150
        ? "Green-Cyan range"
        : hsv.h < 210
        ? "Cyan-Blue range"
        : hsv.h < 270
        ? "Blue-Purple range"
        : hsv.h < 330
        ? "Purple-Pink range"
        : "Red range"
    }
      • Saturation: ${hsv.s}% - ${
      hsv.s > 90
        ? "Very pure color"
        : hsv.s > 70
        ? "Mostly pure color"
        : hsv.s > 40
        ? "Somewhat muted"
        : "Very muted/grayish"
    }
      • Value: ${hsv.v}% - ${
      hsv.v > 90
        ? "Very bright"
        : hsv.v > 70
        ? "Bright"
        : hsv.v > 40
        ? "Medium brightness"
        : "Dark"
    }`,
  };
};

const ColorValues = () => {
  const { cvLoaded, error: cvError } = useOpenCV();
  const [imageSelected, setImageSelected] = useState(false);
  const [error, setError] = useState<string | null>(cvError);
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [endPosition, setEndPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [colorInfo, setColorInfo] = useState<ColorInfo | null>(null);

  const inputImageRef = useRef<HTMLImageElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && inputImageRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (inputImageRef.current) {
          inputImageRef.current.src = e.target?.result as string;
          inputImageRef.current.onload = () => {
            if (outputCanvasRef.current) {
              outputCanvasRef.current.width =
                inputImageRef.current!.naturalWidth;
              outputCanvasRef.current.height =
                inputImageRef.current!.naturalHeight;
              const ctx = outputCanvasRef.current.getContext("2d");
              if (ctx) {
                ctx.drawImage(inputImageRef.current, 0, 0);
              }
            }
            setImageSelected(true);
            setColorInfo(null);
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const rgbToHex = useCallback((r: number, g: number, b: number): string => {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }, []);

  const rgbToHsv = useCallback((r: number, g: number, b: number) => {
    r = r / 255;
    g = g / 255;
    b = b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
    };
  }, []);

  const processSelectedArea = useCallback(() => {
    if (!cvLoaded || !outputCanvasRef.current || !startPosition || !endPosition)
      return;

    try {
      const src = window.cv.imread(outputCanvasRef.current);

      const x = Math.min(startPosition.x, endPosition.x);
      const y = Math.min(startPosition.y, endPosition.y);
      const width = Math.abs(endPosition.x - startPosition.x);
      const height = Math.abs(endPosition.y - startPosition.y);

      if (width > 0 && height > 0) {
        const roi = src.roi(new window.cv.Rect(x, y, width, height));
        const means = window.cv.mean(roi);

        // OpenCV uses BGR format
        const rgb = {
          r: Math.round(means[0]), // Red channel
          g: Math.round(means[1]), // Green channel
          b: Math.round(means[2]), // Blue channel
        };

        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

        setColorInfo({ rgb, hsv, hex });

        roi.delete();
      }

      src.delete();
    } catch (err) {
      console.error("Error processing selection:", err);
      setError("Error analyzing selected area");
    }
  }, [cvLoaded, startPosition, endPosition, rgbToHex, rgbToHsv]);

  const redrawCanvas = useCallback(() => {
    if (!outputCanvasRef.current || !inputImageRef.current) return;

    const ctx = outputCanvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(inputImageRef.current, 0, 0);

    if (startPosition && endPosition) {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      const width = endPosition.x - startPosition.x;
      const height = endPosition.y - startPosition.y;
      ctx.strokeRect(startPosition.x, startPosition.y, width, height);
    }
  }, [startPosition, endPosition]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!imageSelected) return;

      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(
        (event.clientX - rect.left) * (canvas.width / rect.width)
      );
      const y = Math.floor(
        (event.clientY - rect.top) * (canvas.height / rect.height)
      );

      setStartPosition({ x, y });
      setEndPosition({ x, y });
      setIsDragging(true);
      setColorInfo(null);
    },
    [imageSelected]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !imageSelected) return;

      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(
        (event.clientX - rect.left) * (canvas.width / rect.width)
      );
      const y = Math.floor(
        (event.clientY - rect.top) * (canvas.height / rect.height)
      );

      setEndPosition({ x, y });
      redrawCanvas();
    },
    [isDragging, imageSelected, redrawCanvas]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      processSelectedArea();
    }
  }, [isDragging, processSelectedArea]);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Color Analysis</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {!cvLoaded ? (
        <p className="text-gray-600">Loading OpenCV.js...</p>
      ) : (
        <div className="space-y-4">
          <ImageUpload onImageUpload={handleImageUpload} />

          <div className="relative">
            <img ref={inputImageRef} alt="Input" className="hidden" />
            <canvas
              ref={outputCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="border rounded"
            />
            {!imageSelected && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                Select an image to begin
              </div>
            )}
          </div>

          {colorInfo && (
            <div className="p-4 bg-gray-50 rounded space-y-4">
              <h3 className="font-semibold text-lg">Selected Area Colors:</h3>

              <div className="flex items-start gap-4">
                <div className="flex-grow space-y-4">
                  {/* Basic color values */}
                  <div className="font-mono">
                    <p>
                      RGB({colorInfo.rgb.r}, {colorInfo.rgb.g},{" "}
                      {colorInfo.rgb.b})
                    </p>
                    <p>
                      HSV({colorInfo.hsv.h}°, {colorInfo.hsv.s}%,{" "}
                      {colorInfo.hsv.v}%)
                    </p>
                    <p>HEX: {colorInfo.hex}</p>
                  </div>

                  {/* Color explanations */}
                  <div className="space-y-4 text-sm">
                    <div className="p-3 bg-white rounded shadow-sm">
                      <h4 className="font-semibold mb-2">RGB Analysis</h4>
                      <p className="whitespace-pre-line">
                        {getColorDescription(colorInfo).rgb}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded shadow-sm">
                      <h4 className="font-semibold mb-2">HSV Analysis</h4>
                      <p className="whitespace-pre-line">
                        {getColorDescription(colorInfo).hsv}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded shadow-sm">
                      <h4 className="font-semibold mb-2">
                        Color Space Comparison
                      </h4>
                      <p>
                        RGB values show the mixture of red, green, and blue
                        light needed to create this color. HSV represents the
                        same color in terms of human perception: hue (color
                        type), saturation (color purity), and value
                        (brightness). The HEX value is the RGB values encoded in
                        hexadecimal format, commonly used in web development.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="w-24 h-24 border rounded shadow-sm flex-shrink-0"
                  style={{ backgroundColor: colorInfo.hex }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ColorValues;
