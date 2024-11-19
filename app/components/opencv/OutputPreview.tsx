import React from "react";

interface OutputPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  imageSelected: boolean;
}

const OutputPreview: React.FC<OutputPreviewProps> = ({
  canvasRef,
  imageSelected,
}) => {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-gray-700 mb-2">Output Image:</p>
      <div className="relative w-full h-[400px] border rounded bg-gray-50">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain"
        />
        {!imageSelected && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Processed image will appear here
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPreview;
