// hooks/opencv/useDetectionParams.ts
import { useState, useRef, useEffect } from "react";

interface DetectionParams {
  [key: string]: number;
}

interface UseDetectionParamsResult<T> {
  params: T;
  paramsRef: React.RefObject<T>;
  handleParamChange: (name: string, value: number) => void;
}

export const useDetectionParams = <T extends DetectionParams>(
  initialParams: T
): UseDetectionParamsResult<T> => {
  const [params, setParams] = useState<T>(initialParams);
  const paramsRef = useRef<T>(initialParams);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const handleParamChange = (name: string, value: number) => {
    const paramName = name.toLowerCase().replace(/\s+/g, "");
    setParams((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  return { params, paramsRef, handleParamChange };
};
