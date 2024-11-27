// File: utils/canvasUtils.ts
import { Position, Dimensions } from "../types/gel";

export const getSelectionDimensions = (
  start: Position,
  end: Position
): Dimensions => {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
};

export const createProcessingCanvas = async (
  x: number,
  y: number,
  width: number,
  height: number,
  outputCanvasRef: React.RefObject<HTMLCanvasElement>
): Promise<HTMLCanvasElement> => {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;

  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  if (!tempCtx) throw new Error("Failed to create temporary context");

  const sourceCtx = outputCanvasRef.current?.getContext("2d");
  if (!sourceCtx) throw new Error("Failed to get source context");

  const imageData = sourceCtx.getImageData(x, y, width, height);
  tempCtx.putImageData(imageData, 0, 0);

  return tempCanvas;
};
