// app/components/opencv/types.ts
export interface ImageUploadProps {
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface ImagePreviewProps {
  imageRef: React.RefObject<HTMLImageElement>;
  imageSelected: boolean;
  title: string;
}

export interface OutputPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  imageSelected: boolean;
}
