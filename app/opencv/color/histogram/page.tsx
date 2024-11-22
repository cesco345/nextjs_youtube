"use client";

import ColorHistogram from "./ColorHistogram";

export default function HistogramPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Color Histogram Analysis</h1>
      <ColorHistogram />
    </div>
  );
}
