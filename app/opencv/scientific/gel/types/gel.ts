// File: types/gel.ts
export interface Position {
  x: number;
  y: number;
}

export interface StandardBand {
  position: number;
  weight: number;
}

export interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedBand {
  position: number;
  intensity: number;
  estimatedWeight: number;
  area: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface LaneData {
  laneNumber: number;
  startX: number;
  endX: number;
  bands: DetectedBand[];
  maxIntensity: number;
}

export interface GelAnalysis {
  standardCurve?: StandardBand[];
  lanes: LaneData[];
  globalMaxIntensity: number;
}

export interface ProcessingParams {
  threshold: number;
  resizefactor: number;
  useotsu: boolean;
  denoise: boolean;
  enhanceContrast: boolean;
}
