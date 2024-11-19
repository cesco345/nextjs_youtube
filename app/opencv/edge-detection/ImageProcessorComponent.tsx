"use client";
import React, { useRef, useState, useEffect } from "react";

interface ImageProcessorProps {
  title: string;
  processImage: (cv: any, src: any, dst: any) => void;
}

const ImageProcessor: React.FC<ImageProcessorProps> = ({
  title,
  processImage,
}) => {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputImageRef = useRef<HTMLImageElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadOpenCv = async () => {
      if (window.cv) {
        setCvLoaded(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "/opencv.js";
      script.async = true;
      script.onload = () => {
        if (window.cv) {
          window.cv["onRuntimeInitialized"] = () => {
            console.log("OpenCV.js is ready!");
            setCvLoaded(true);
          };
        }
      };
      document.body.appendChild(script);
    };

    loadOpenCv();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && inputImageRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (inputImageRef.current && outputCanvasRef.current) {
            // Calculate scaled dimensions
            const scale = Math.min(
              1200 / img.naturalWidth,
              800 / img.naturalHeight
            );
            const scaledWidth = Math.round(img.naturalWidth * scale);
            const scaledHeight = Math.round(img.naturalHeight * scale);

            // Set input image
            inputImageRef.current.src = e.target?.result as string;
            inputImageRef.current.style.width = `${scaledWidth}px`;
            inputImageRef.current.style.height = `${scaledHeight}px`;

            // Set canvas dimensions
            outputCanvasRef.current.width = scaledWidth;
            outputCanvasRef.current.height = scaledHeight;
            outputCanvasRef.current.style.width = `${scaledWidth}px`;
            outputCanvasRef.current.style.height = `${scaledHeight}px`;

            setImageSelected(true);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessImage = () => {
    if (
      !cvLoaded ||
      !imageSelected ||
      !inputImageRef.current ||
      !outputCanvasRef.current
    ) {
      console.error("Not ready to process image");
      return;
    }

    setProcessing(true);
    try {
      const src = window.cv.imread(inputImageRef.current);
      const dst = new window.cv.Mat();

      processImage(window.cv, src, dst);

      window.cv.imshow(outputCanvasRef.current, dst);

      src.delete();
      dst.delete();
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {!cvLoaded && (
        <div className="mb-4 text-amber-600">Loading OpenCV.js...</div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Select an image:
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
            />
          </label>
        </div>

        <button
          onClick={handleProcessImage}
          disabled={!cvLoaded || !imageSelected || processing}
          className={`w-full px-4 py-2 rounded-md text-white font-medium ${
            !cvLoaded || !imageSelected || processing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {processing ? "Processing..." : "Process Image"}
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 min-h-[500px]">
            {imageSelected ? (
              <img ref={inputImageRef} alt="Input" className="rounded-lg" />
            ) : (
              <div className="text-gray-400">No image selected</div>
            )}
          </div>

          <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 min-h-[500px]">
            {imageSelected ? (
              <canvas ref={outputCanvasRef} className="rounded-lg" />
            ) : (
              <div className="text-gray-400">
                Processed image will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageProcessor;
