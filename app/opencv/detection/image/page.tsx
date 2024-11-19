/// app/opencv/detection/object/page.tsx
"use client";
import AdvancedObjectDetector from "./AdvancedObjectDetector";

export default function ObjectDetectionPage() {
  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Object Detection</h1>
      <AdvancedObjectDetector />
    </div>
  );
}
