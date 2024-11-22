"use client";
import React, { useRef, useState, useCallback } from "react";
import { useOpenCV } from "../../../hooks/opencv/useOpenCV";
import ImageUpload from "../../../components/opencv/ImageUpload";
import ImagePreview from "../../../components/opencv/ImagePreview";
import OutputPreview from "../../../components/opencv/OutputPreview";
import ThresholdControls from "../../controls/ThresholdControls";

const ColorMasking = () => {
  const { cvLoaded, error: cvError } = useOpenCV();
  const [imageSelected, setImageSelected] = useState(false);
  const [error, setError] = useState<string | null>(cvError);

  const [params, setParams] = useState({
    huelow: 0,
    huehigh: 179,
    saturationlow: 0,
    saturationhigh: 255,
    valuelow: 0,
    valuehigh: 255,
    blursize: 3,
  });

  const inputImageRef = useRef<HTMLImageElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  const controls = [
    {
      name: "huelow",
      value: params.huelow,
      min: 0,
      max: 179,
      step: 1,
    },
    {
      name: "huehigh",
      value: params.huehigh,
      min: 0,
      max: 179,
      step: 1,
    },
    {
      name: "saturationlow",
      value: params.saturationlow,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "saturationhigh",
      value: params.saturationhigh,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "valuelow",
      value: params.valuelow,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "valuehigh",
      value: params.valuehigh,
      min: 0,
      max: 255,
      step: 1,
    },
    {
      name: "blursize",
      value: params.blursize,
      min: 1,
      max: 21,
      step: 2,
    },
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && inputImageRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (inputImageRef.current) {
          inputImageRef.current.src = e.target?.result as string;
          inputImageRef.current.onload = () => {
            if (outputCanvasRef.current && maskCanvasRef.current) {
              outputCanvasRef.current.width =
                inputImageRef.current!.naturalWidth;
              outputCanvasRef.current.height =
                inputImageRef.current!.naturalHeight;
              maskCanvasRef.current.width = inputImageRef.current!.naturalWidth;
              maskCanvasRef.current.height =
                inputImageRef.current!.naturalHeight;
            }
            setImageSelected(true);
            processImage();
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleParamChange = useCallback((name: string, value: number) => {
    console.log("original name:", name);

    setParams((prev) => {
      const newParams = { ...prev, [name]: value };

      return newParams;
    });
  }, []);

  const processImage = useCallback(() => {
    if (
      !cvLoaded ||
      !imageSelected ||
      !inputImageRef.current ||
      !outputCanvasRef.current ||
      !maskCanvasRef.current
    ) {
      return;
    }

    try {
      const src = window.cv.imread(inputImageRef.current);
      const dst = new window.cv.Mat();
      const mask = new window.cv.Mat();

      const hsv = new window.cv.Mat();
      window.cv.cvtColor(src, hsv, window.cv.COLOR_BGR2HSV);

      if (params.blursize > 1) {
        const ksize = new window.cv.Size(params.blursize, params.blursize);
        window.cv.GaussianBlur(hsv, hsv, ksize, 0);
      }

      const lower = new window.cv.Mat(1, 1, hsv.type(), [
        params.huelow,
        params.saturationlow,
        params.valuelow,
        0,
      ]);

      const upper = new window.cv.Mat(1, 1, hsv.type(), [
        params.huehigh,
        params.saturationhigh,
        params.valuehigh,
        255,
      ]);

      window.cv.inRange(hsv, lower, upper, mask);
      window.cv.bitwise_and(src, src, dst, mask);

      window.cv.imshow(outputCanvasRef.current, dst);
      window.cv.imshow(maskCanvasRef.current, mask);

      src.delete();
      dst.delete();
      mask.delete();
      hsv.delete();
      lower.delete();
      upper.delete();
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Error processing image. Please try again.");
    }
  }, [cvLoaded, imageSelected, params]);

  React.useEffect(() => {
    if (imageSelected) {
      processImage();
    }
  }, [imageSelected, processImage]);

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Color Masking</h1>

      <div className="space-y-4">
        <p className="text-gray-700">
          Use HSV color space to isolate specific colors. Adjust the sliders to
          control the color range.
        </p>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <ImageUpload onImageUpload={handleImageUpload} />

            <div className="mt-4">
              <ImagePreview
                imageRef={inputImageRef}
                imageSelected={imageSelected}
                title="Input Image:"
              />
            </div>
          </div>

          <div className="space-y-4">
            <OutputPreview
              canvasRef={outputCanvasRef}
              imageSelected={imageSelected}
              title="Masked Result:"
            />

            <OutputPreview
              canvasRef={maskCanvasRef}
              imageSelected={imageSelected}
              title="Binary Mask:"
            />
          </div>
        </div>

        <ThresholdControls controls={controls} onChange={handleParamChange} />

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Common Color Ranges:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-red-600">Red</p>
              <p>Hue: 0-10 or 170-179</p>
            </div>
            <div>
              <p className="font-medium text-green-600">Green</p>
              <p>Hue: 35-85</p>
            </div>
            <div>
              <p className="font-medium text-blue-600">Blue</p>
              <p>Hue: 85-135</p>
            </div>
            <div>
              <p className="font-medium text-yellow-600">Yellow</p>
              <p>Hue: 20-35</p>
            </div>
            <div>
              <p className="font-medium text-purple-600">Purple</p>
              <p>Hue: 135-150</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorMasking;
