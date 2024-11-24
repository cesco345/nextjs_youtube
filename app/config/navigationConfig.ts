export const navigationCategories = {
  edgeDetection: {
    title: "Edge Detection",
    items: [
      { name: "Canny Edge Detection", path: "/opencv/edge-detection/canny" },
      { name: "Contour Detection", path: "/opencv/edge-detection/contours" },
      { name: "Sobel Edge Detection", path: "/opencv/edge-detection/sobel" },
    ],
  },
  imageProcessing: {
    title: "Image Processing",
    items: [
      { name: "Image Filtering", path: "/opencv/image-processing/filtering" },
      {
        name: "Image Sharpening",
        path: "/opencv/image-processing/sharpening",
      },
      {
        name: "Image Thresholding",
        path: "/opencv/image-processing/thresholding",
      },
      {
        name: "Histogram Equalization",
        path: "/opencv/image-processing/histogram",
      },
    ],
  },
  objectDetection: {
    title: "Detection",
    items: [
      { name: "Feature Detection", path: "/opencv/detection/feature" },
      { name: "Object Detection", path: "/opencv/detection/object" },
      { name: "Motion Detection", path: "/opencv/detection/motion" },
      { name: "Template Matching", path: "/opencv/detection/template" },
      { name: "Advanced Detection", path: "/opencv/detection/image" },
    ],
  },
  colorAnalysis: {
    title: "Color Analysis",
    items: [
      { name: "Color Histogram", path: "/opencv/color/histogram" },
      { name: "Color Ratio Analysis", path: "/opencv/color/ratio" },
      { name: "Color Value Display", path: "/opencv/color/values" },
      { name: "Color Masking", path: "/opencv/color/mask" },
      { name: "Color Segmentation", path: "/opencv/color/segmentation" },
    ],
  },
  scientificAnalysis: {
    title: "Scientific Imaging",
    items: [
      { name: "Basic OCR Analysis", path: "/opencv/scientific/ocr" },
      { name: "Gel Electrophoresis", path: "/opencv/scientific/gel" },
      {
        name: "Western Blot Fluorescence",
        path: "/opencv/scientific/fl_western",
      },
      {
        name: "Western Blot Black & White",
        path: "/opencv/scientific/bw_western",
      },
      { name: "Cell & Colony Counter", path: "/opencv/scientific/colony" },
      { name: "Microscopy Analysis", path: "/opencv/scientific/microscopy" },
    ],
  },
};
