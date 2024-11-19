// app/components/controls/ThresholdControls.tsx
"use client";
import React from "react";

interface ControlConfig {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

interface ThresholdControlsProps {
  controls: ControlConfig[];
  onChange: (name: string, value: number) => void;
}

const ThresholdControls: React.FC<ThresholdControlsProps> = ({
  controls,
  onChange,
}) => {
  const handleSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    control: ControlConfig
  ) => {
    const newValue = Number(e.target.value);
    // Convert control name to parameter name (e.g., "Kernel Size" -> "kernelsize")
    const paramName = control.name.toLowerCase().replace(/\s+/g, "");
    onChange(paramName, newValue);
  };

  return (
    <div className="mb-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Adjust Parameters:
      </h3>
      <div className="space-y-4">
        {controls.map((control) => (
          <div key={control.name} className="flex flex-col">
            <div className="flex justify-between">
              <label className="text-sm text-gray-700">{control.name}</label>
              <span className="text-sm text-gray-600">{control.value}</span>
            </div>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={control.value}
              onChange={(e) => handleSliderChange(e, control)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-gray-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThresholdControls;
