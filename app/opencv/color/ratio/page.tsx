"use client";

import ColorRatioAnalysis from "./ColorRatioAnalysis";

export default function HistogramPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Color Ratio Analysis</h1>
      <ColorRatioAnalysis />
    </div>
  );
}