import React from "react";

interface ImagePreviewProps {
  imageRef: React.RefObject<HTMLImageElement>;
  imageSelected: boolean;
  title: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageRef,
  imageSelected,
  title,
}) => {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>
      <div className="relative w-full h-[400px] border rounded bg-gray-50">
        <img
          ref={imageRef}
          className="absolute inset-0 w-full h-full object-contain"
          alt="Input"
          style={{ display: imageSelected ? "block" : "none" }}
        />
        {!imageSelected && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No image selected
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagePreview;
