export class DetectionProcessor {
  static cleanup(...mats: any[]) {
    mats.forEach((mat) => {
      if (mat && !mat.isDeleted()) {
        try {
          mat.delete();
        } catch (e) {
          console.warn("Failed to delete matrix:", e);
        }
      }
    });
  }

  static processTemplate(cv: any, src: any, template: any, params: any) {
    console.log("Starting template matching");
    const result = src.clone();
    const preprocessedMats: any[] = [];

    try {
      // First do basic template matching in grayscale
      const graySource = new cv.Mat();
      const grayTemplate = new cv.Mat();
      preprocessedMats.push(graySource, grayTemplate);

      cv.cvtColor(src, graySource, cv.COLOR_RGBA2GRAY);
      cv.cvtColor(template, grayTemplate, cv.COLOR_RGBA2GRAY);

      // Calculate initial scale range
      const avgSourceDim = (src.rows + src.cols) / 2;
      const avgTemplateDim = (template.rows + template.cols) / 2;
      const estimatedScale = (avgSourceDim / avgTemplateDim) * 0.15; // Typical logo is about 15% of source size

      // Define scale range
      const scaleRange = {
        min: estimatedScale * 0.5,
        max: estimatedScale * 2.0,
        steps: params.scales,
      };

      const matches = [];
      const scaleStep =
        (scaleRange.max - scaleRange.min) / (scaleRange.steps - 1);

      // Try different scales
      for (let s = 0; s < scaleRange.steps; s++) {
        const scale = scaleRange.min + s * scaleStep;
        const scaledWidth = Math.round(template.cols * scale);
        const scaledHeight = Math.round(template.rows * scale);

        // Skip invalid sizes
        if (
          scaledWidth < 10 ||
          scaledHeight < 10 ||
          scaledWidth >= src.cols ||
          scaledHeight >= src.rows
        ) {
          continue;
        }

        console.log(
          `Trying scale ${scale.toFixed(
            3
          )}, size: ${scaledWidth}x${scaledHeight}`
        );

        // Scale template
        const scaledTemplate = new cv.Mat();
        preprocessedMats.push(scaledTemplate);
        cv.resize(
          grayTemplate,
          scaledTemplate,
          new cv.Size(scaledWidth, scaledHeight)
        );

        // Perform template matching
        const matchResult = new cv.Mat();
        preprocessedMats.push(matchResult);

        cv.matchTemplate(
          graySource,
          scaledTemplate,
          matchResult,
          cv.TM_CCOEFF_NORMED
        );

        const minMax = cv.minMaxLoc(matchResult);
        console.log(
          `Confidence at scale ${scale.toFixed(3)}: ${minMax.maxVal.toFixed(3)}`
        );

        if (minMax.maxVal >= params.threshold) {
          matches.push({
            x: minMax.maxLoc.x,
            y: minMax.maxLoc.y,
            width: scaledWidth,
            height: scaledHeight,
            confidence: minMax.maxVal,
            scale: scale,
          });
        }
      }

      // Sort matches by confidence
      matches.sort((a, b) => b.confidence - a.confidence);

      // Filter overlapping matches
      const finalMatches = matches.filter((match, index, array) => {
        return !array.slice(0, index).some((earlier) => {
          const xOverlap = Math.max(
            0,
            Math.min(earlier.x + earlier.width, match.x + match.width) -
              Math.max(earlier.x, match.x)
          );
          const yOverlap = Math.max(
            0,
            Math.min(earlier.y + earlier.height, match.y + match.height) -
              Math.max(earlier.y, match.y)
          );
          return xOverlap * yOverlap > 0.5 * match.width * match.height;
        });
      });

      // Draw matches
      finalMatches.forEach((match) => {
        cv.rectangle(
          result,
          new cv.Point(match.x, match.y),
          new cv.Point(match.x + match.width, match.y + match.height),
          [0, 255, 0, 255],
          2
        );

        const label = `${(match.confidence * 100).toFixed(1)}%`;
        cv.putText(
          result,
          label,
          new cv.Point(match.x, Math.max(match.y - 5, 10)),
          cv.FONT_HERSHEY_SIMPLEX,
          0.5,
          [0, 255, 0, 255],
          1
        );
      });

      return { result, matchCount: finalMatches.length };
    } catch (err) {
      console.error("Template processing error:", err);
      throw err;
    } finally {
      this.cleanup(...preprocessedMats);
    }
  }

  static processMotion(
    cv: any,
    prevFrame: any,
    currentFrame: any,
    params: any
  ) {
    const diff = new cv.Mat();
    const gray = new cv.Mat();
    const thresh = new cv.Mat();
    const result = currentFrame.clone();

    try {
      // Convert to grayscale and apply blur
      cv.cvtColor(currentFrame, gray, cv.COLOR_RGBA2GRAY);
      const ksize = new cv.Size(params.blur * 2 + 1, params.blur * 2 + 1);
      cv.GaussianBlur(gray, gray, ksize, 0);

      if (prevFrame) {
        // Calculate absolute difference
        cv.absdiff(prevFrame, gray, diff);
        cv.threshold(diff, thresh, params.threshold, 255, cv.THRESH_BINARY);

        // Apply morphological operations for noise reduction
        const kernel = cv.getStructuringElement(
          cv.MORPH_RECT,
          new cv.Size(3, 3)
        );
        cv.erode(thresh, thresh, kernel, new cv.Point(-1, -1), 1);
        cv.dilate(thresh, thresh, kernel, new cv.Point(-1, -1), 2);

        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(
          thresh,
          contours,
          hierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE
        );

        let motionCount = 0;
        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i);
          const area = cv.contourArea(contour);

          if (area > params.minarea && area < params.maxarea) {
            motionCount++;
            const rect = cv.boundingRect(contour);

            // Draw rectangle
            cv.rectangle(
              result,
              new cv.Point(rect.x, rect.y),
              new cv.Point(rect.x + rect.width, rect.y + rect.height),
              [255, 0, 0, 255],
              2
            );

            // Add label
            cv.putText(
              result,
              `Motion ${motionCount}`,
              new cv.Point(rect.x, rect.y - 5),
              cv.FONT_HERSHEY_SIMPLEX,
              0.5,
              [255, 0, 0, 255],
              1
            );
          }
        }

        kernel.delete();
        contours.delete();
        hierarchy.delete();
        return { result, gray: gray.clone(), motionCount };
      }

      return { result, gray: gray.clone(), motionCount: 0 };
    } finally {
      this.cleanup(diff, gray, thresh);
    }
  }

  static processVideoFrame(cv: any, frame: HTMLVideoElement) {
    const src = new cv.Mat(frame.videoHeight, frame.videoWidth, cv.CV_8UC4);
    const cap = new cv.VideoCapture(frame);
    cap.read(src);
    return src;
  }
}
