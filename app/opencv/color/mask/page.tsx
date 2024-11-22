"use client";

import ColorMasking from "./ColorMasking";

export default function HistogramPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Color Masking</h1>
      <ColorMasking />
    </div>
  );
}
