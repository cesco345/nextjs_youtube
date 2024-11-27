// File: utils/imageProcessing.ts
import { ProcessingParams } from "../types/gel";

export const preprocessImage = async (src: any, params: ProcessingParams) => {
  const processed = new window.cv.Mat();
  window.cv.cvtColor(src, processed, window.cv.COLOR_RGBA2GRAY);

  if (params.enhanceContrast) {
    window.cv.equalizeHist(processed, processed);
  }

  if (params.denoise) {
    window.cv.GaussianBlur(processed, processed, new window.cv.Size(3, 3), 0);
  }

  return processed;
};

export const createBinaryImage = async (
  processed: any,
  params: ProcessingParams
) => {
  const binary = new window.cv.Mat();

  if (params.useotsu) {
    window.cv.threshold(
      processed,
      binary,
      0,
      255,
      window.cv.THRESH_BINARY_INV + window.cv.THRESH_OTSU
    );
  } else {
    window.cv.adaptiveThreshold(
      processed,
      binary,
      255,
      window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      window.cv.THRESH_BINARY_INV,
      params.threshold,
      2
    );
  }

  const kernel = window.cv.getStructuringElement(
    window.cv.MORPH_RECT,
    new window.cv.Size(3, 3)
  );
  window.cv.morphologyEx(binary, binary, window.cv.MORPH_OPEN, kernel);
  window.cv.dilate(binary, binary, kernel);
  window.cv.erode(binary, binary, kernel);
  window.cv.dilate(binary, binary, kernel);
  kernel.delete();

  return binary;
};
