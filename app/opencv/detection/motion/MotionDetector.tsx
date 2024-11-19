"use client";
import React, { useRef, useState, useEffect } from "react";
import { useOpenCV } from "../../../hooks/opencv/useOpenCV";
import ThresholdControls from "../../controls/ThresholdControls";
import { DetectionProcessor } from "../utils/processors";

const MotionDetector: React.FC = () => {
  const { cvLoaded, error: cvError } = useOpenCV();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motionCount, setMotionCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const previousFrameRef = useRef<any>(null);
  const processingRef = useRef(false);
  const tempCanvasRef = useRef<HTMLCanvasElement>();
  const motionHistoryRef = useRef<boolean[]>([]);

  const [params, setParams] = useState({
    threshold: 25,
    blur: 5,
    minarea: 500,
    maxarea: 15000,
    stability: 3,
  });

  const controls = [
    {
      name: "Threshold",
      value: params.threshold,
      min: 10,
      max: 100,
      step: 5,
    },
    {
      name: "Blur",
      value: params.blur,
      min: 3,
      max: 15,
      step: 2,
    },
    {
      name: "Min Area",
      value: params.minarea,
      min: 100,
      max: 5000,
      step: 100,
    },
    {
      name: "Max Area",
      value: params.maxarea,
      min: 5000,
      max: 50000,
      step: 1000,
    },
    {
      name: "Stability",
      value: params.stability,
      min: 1,
      max: 10,
      step: 1,
    },
  ];

  const handleParamChange = (name: string, value: number) => {
    const paramName = name.toLowerCase().replace(/\s+/g, "");
    setParams((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const saveProcessedImage = () => {
    if (!canvasRef.current || !isCameraActive) {
      setError("No processed image to save");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = canvasRef.current.toDataURL("image/png");
      link.download = `motion_detection_${new Date().toISOString()}.png`;
      link.click();
    } catch (err) {
      console.error("Error saving image:", err);
      setError("Failed to save image");
    }
  };

  const startCamera = async () => {
    try {
      if (!cvLoaded) {
        setError("OpenCV not loaded yet");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();

            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current!.videoWidth;
              canvasRef.current.height = videoRef.current!.videoHeight;
            }

            setIsCameraActive(true);
            setError(null);
            motionHistoryRef.current = [];
          } catch (err) {
            console.error("Error playing video:", err);
            setError("Failed to start video playback");
          }
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Failed to start camera");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    if (previousFrameRef.current) {
      previousFrameRef.current.delete();
      previousFrameRef.current = null;
    }
    setIsCameraActive(false);
    setMotionCount(0);
    motionHistoryRef.current = [];
  };

  useEffect(() => {
    if (!isCameraActive || !cvLoaded || !videoRef.current || !canvasRef.current)
      return;

    let lastTime = 0;
    const frameInterval = 1000 / 24;

    const processVideo = () => {
      if (
        !videoRef.current ||
        !canvasRef.current ||
        !window.cv ||
        processingRef.current
      )
        return;

      processingRef.current = true;

      try {
        if (!tempCanvasRef.current) {
          tempCanvasRef.current = document.createElement("canvas");
          tempCanvasRef.current.width = videoRef.current.videoWidth;
          tempCanvasRef.current.height = videoRef.current.videoHeight;
        }

        const tempCtx = tempCanvasRef.current.getContext("2d");
        if (!tempCtx) return;

        tempCtx.drawImage(videoRef.current, 0, 0);

        const src = window.cv.imread(tempCanvasRef.current);
        const {
          result,
          gray,
          motionCount: currentMotionCount,
        } = DetectionProcessor.processMotion(
          window.cv,
          previousFrameRef.current,
          src,
          params
        );

        motionHistoryRef.current.push(currentMotionCount > 0);
        if (motionHistoryRef.current.length > params.stability) {
          motionHistoryRef.current.shift();
        }

        const isStableMotion =
          motionHistoryRef.current.filter(Boolean).length >= params.stability;

        setMotionCount(isStableMotion ? currentMotionCount : 0);

        window.cv.imshow(canvasRef.current, result);

        if (previousFrameRef.current) {
          previousFrameRef.current.delete();
        }
        previousFrameRef.current = gray;

        src.delete();
        result.delete();
      } catch (err) {
        console.error("Processing error:", err);
      } finally {
        processingRef.current = false;
      }
    };

    const animate = (timestamp: number) => {
      if (timestamp - lastTime >= frameInterval) {
        processVideo();
        lastTime = timestamp;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (previousFrameRef.current) {
        previousFrameRef.current.delete();
        previousFrameRef.current = null;
      }
      if (tempCanvasRef.current) {
        tempCanvasRef.current = undefined;
      }
      motionHistoryRef.current = [];
    };
  }, [isCameraActive, cvLoaded, params]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div suppressHydrationWarning className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Motion Detection</h2>
        <div className="flex space-x-4">
          <button
            onClick={saveProcessedImage}
            disabled={!isCameraActive || !cvLoaded}
            className={`px-4 py-2 rounded-md font-medium ${
              !isCameraActive || !cvLoaded
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            Save Frame
          </button>
          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            disabled={!cvLoaded}
            className={`px-4 py-2 rounded text-white ${
              !cvLoaded
                ? "bg-gray-400"
                : isCameraActive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {!cvLoaded
              ? "Loading OpenCV..."
              : isCameraActive
              ? "Stop Camera"
              : "Start Camera"}
          </button>
        </div>
      </div>

      {(error || cvError) && (
        <div className="p-4 bg-red-50 text-red-700 rounded">
          {error || cvError}
        </div>
      )}

      {motionCount > 0 && (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          Motion Detected: {motionCount} areas
        </div>
      )}

      <ThresholdControls controls={controls} onChange={handleParamChange} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative aspect-video bg-gray-100">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain"
            playsInline
            muted
            autoPlay
          />
          <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded">
            Original
          </div>
          {!isCameraActive && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Camera feed will appear here
            </div>
          )}
        </div>

        <div className="relative aspect-video bg-gray-100">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded">
            Motion Detection
          </div>
          {!isCameraActive && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Processed feed will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MotionDetector;
