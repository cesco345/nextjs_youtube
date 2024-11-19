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
};
