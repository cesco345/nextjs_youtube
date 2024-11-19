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
        if (inputImageRef.current) {
          inputImageRef.current.src = e.target?.result as string;
          inputImageRef.current.onload = () => {
            if (outputCanvasRef.current) {
              outputCanvasRef.current.width =
                inputImageRef.current!.naturalWidth;
              outputCanvasRef.current.height =
                inputImageRef.current!.naturalHeight;
            }
            setImageSelected(true);
          };
        }
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-center bg-gray-50 rounded-lg p-4">
            <img
              ref={inputImageRef}
              alt="Input"
              style={{
                display: imageSelected ? "block" : "none",
                maxHeight: "250vh",
                width: "auto",
              }}
            />
            {!imageSelected && (
              <div className="text-gray-400">No image selected</div>
            )}
          </div>

          <div className="flex justify-center bg-gray-50 rounded-lg p-4">
            <canvas
              ref={outputCanvasRef}
              style={{
                maxHeight: "250vh",
                width: "auto",
              }}
            />
            {!imageSelected && (
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
