import { useState, useEffect } from "react";

export const useOpenCV = () => {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOpenCv = async () => {
      if (window.cv) {
        setCvLoaded(true);
        return;
      }

      try {
        const script = document.createElement("script");
        script.src = "/opencv.js";
        script.async = true;

        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            if (window.cv) {
              window.cv.onRuntimeInitialized = () => {
                setCvLoaded(true);
                resolve(true);
              };
            }
          };
          script.onerror = () => reject("Failed to load OpenCV.js");
        });

        document.body.appendChild(script);
        await loadPromise;
      } catch (err) {
        setError("Failed to load OpenCV.js");
      }
    };

    loadOpenCv();

    return () => {
      const script = document.querySelector('script[src="/opencv.js"]');
      if (script) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return { cvLoaded, error };
};
