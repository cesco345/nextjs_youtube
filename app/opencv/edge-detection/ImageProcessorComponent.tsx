"use client";
import React, { useRef, useState } from "react";
import { useOpenCV } from "../../hooks/opencv/useOpenCV";
import ImageUpload from "../../components/opencv/ImageUpload";
import ImagePreview from "../../components/opencv/ImagePreview";
import OutputPreview from "../../components/opencv/OutputPreview";

interface ImageProcessorProps {
  // processImage: (cv: any, src: any, dst: any) => void;
  processImage: (cv: any, src: any, dst: any) => Promise<unknown>;

  onCanvasClick?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseMove?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  title: string;
}

const ImageProcessorComponent: React.FC<ImageProcessorProps> = ({
  processImage,
  title,
}) => {
  const { cvLoaded, error: cvError } = useOpenCV();
  const [imageSelected, setImageSelected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(cvError);

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
            }
            setImageSelected(true);
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processSelectedImage = async () => {
    if (
      !cvLoaded ||
      !imageSelected ||
      !inputImageRef.current ||
      !outputCanvasRef.current
    ) {
      setError("Please make sure an image is selected and OpenCV is loaded");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) throw new Error("Could not get canvas context");

      tempCanvas.width = inputImageRef.current.naturalWidth;
      tempCanvas.height = inputImageRef.current.naturalHeight;
      tempCtx.drawImage(inputImageRef.current, 0, 0);

      const src = window.cv.imread(tempCanvas);
      const dst = new window.cv.Mat();

      await processImage(window.cv, src, dst);
      window.cv.imshow(outputCanvasRef.current, dst);

      src.delete();
      dst.delete();
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Error processing image. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // Function to handle downloading the processed image
  const handleDownloadImage = () => {
    if (!outputCanvasRef.current) {
      setError("No processed image available for download.");
      return;
    }

    const link = document.createElement("a");
    link.href = outputCanvasRef.current.toDataURL("image/png");
    link.download = "processed_image.png";
    link.click();
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {!cvLoaded ? (
        <p className="text-gray-600">Loading OpenCV.js...</p>
      ) : (
        <div className="space-y-4">
          <ImageUpload onImageUpload={handleImageUpload} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImagePreview
              imageRef={inputImageRef}
              imageSelected={imageSelected}
              title="Input Image:"
            />
            <OutputPreview
              canvasRef={outputCanvasRef}
              imageSelected={imageSelected}
            />
          </div>

          <div className="flex space-x-4 mt-4">
            <button
              onClick={processSelectedImage}
              disabled={!imageSelected || processing}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                !imageSelected || processing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {processing ? "Processing..." : "Process Image"}
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={!imageSelected || processing}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                !imageSelected || processing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              Save Processed Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageProcessorComponent;
