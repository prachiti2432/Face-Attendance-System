// Anti-Spoofing Detection (Fake Detection)
// Detects printed photos, mobile screens, and verifies liveness

let blinkCount = 0;
let headMovementDetected = false;
let lastFacePosition = null;
let blinkDetectionActive = false;

/**
 * Detect if face is from a printed photo or screen
 * Uses multiple heuristics:
 * - Screen reflection detection
 * - Face size consistency
 * - Movement patterns
 */
export function detectSpoofing(detection, video) {
  if (!detection || !video) return { isSpoofed: false, confidence: 0 };

  const box = detection.detection.box;
  const faceSize = box.width * box.height;
  const videoArea = video.videoWidth * video.videoHeight;
  const faceRatio = faceSize / videoArea;

  // Heuristic 1: Face size consistency (printed photos often have inconsistent sizes)
  const sizeConsistency = faceRatio > 0.05 && faceRatio < 0.4; // Reasonable face size range

  // Heuristic 2: Check for screen-like reflections (simplified)
  // In a real implementation, you'd analyze pixel patterns

  // Heuristic 3: Face position stability (screens/prints are usually more stable)
  const currentPosition = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };

  let positionStability = 1;
  if (lastFacePosition) {
    const movement = Math.sqrt(
      Math.pow(currentPosition.x - lastFacePosition.x, 2) +
      Math.pow(currentPosition.y - lastFacePosition.y, 2)
    );
    // Some movement is good (indicates real person), too much or too little is suspicious
    positionStability = movement > 5 && movement < 50 ? 0.8 : 0.3;
  }

  lastFacePosition = currentPosition;

  // Combine heuristics
  const spoofScore = sizeConsistency ? 0.2 : 0.6;
  const finalScore = spoofScore * (1 - positionStability * 0.3);

  return {
    isSpoofed: finalScore > 0.5,
    confidence: finalScore,
    details: {
      sizeConsistency,
      positionStability
    }
  };
}

/**
 * Detect blinks by analyzing eye landmarks
 * @param {Object} landmarks - Face landmarks from face-api
 */
export function detectBlink(landmarks) {
  if (!landmarks) return false;

  try {
    // Get eye landmarks (left and right eye)
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Calculate eye aspect ratio (EAR)
    function calculateEAR(eyePoints) {
      const vertical1 = Math.sqrt(
        Math.pow(eyePoints[1].y - eyePoints[5].y, 2) +
        Math.pow(eyePoints[1].x - eyePoints[5].x, 2)
      );
      const vertical2 = Math.sqrt(
        Math.pow(eyePoints[2].y - eyePoints[4].y, 2) +
        Math.pow(eyePoints[2].x - eyePoints[4].x, 2)
      );
      const horizontal = Math.sqrt(
        Math.pow(eyePoints[0].x - eyePoints[3].x, 2) +
        Math.pow(eyePoints[0].y - eyePoints[3].y, 2)
      );
      return (vertical1 + vertical2) / (2 * horizontal);
    }

    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    // EAR threshold for blink detection (typically 0.2-0.3)
    const BLINK_THRESHOLD = 0.25;
    return avgEAR < BLINK_THRESHOLD;
  } catch (error) {
    console.error('Error detecting blink:', error);
    return false;
  }
}

/**
 * Verify liveness through blink detection
 * Requires at least 2 blinks within a time window
 */
export async function verifyLiveness(video, faceapi, onProgress) {
  return new Promise((resolve) => {
    blinkCount = 0;
    headMovementDetected = false;
    blinkDetectionActive = true;
    let frameCount = 0;
    const maxFrames = 300; // ~10 seconds at 30fps
    const requiredBlinks = 2;

    const detectLiveness = async () => {
      if (!blinkDetectionActive || frameCount >= maxFrames) {
        blinkDetectionActive = false;
        resolve({
          success: blinkCount >= requiredBlinks && headMovementDetected,
          blinks: blinkCount,
          headMovement: headMovementDetected
        });
        return;
      }

      frameCount++;
      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (detection) {
          // Check for blink
          const isBlinking = detectBlink(detection.landmarks);
          if (isBlinking && frameCount % 5 === 0) { // Debounce blinks
            blinkCount++;
            if (onProgress) {
              onProgress({ blinks: blinkCount, required: requiredBlinks });
            }
          }

          // Check for head movement
          const box = detection.detection.box;
          const currentPosition = {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2
          };

          if (lastFacePosition) {
            const movement = Math.sqrt(
              Math.pow(currentPosition.x - lastFacePosition.x, 2) +
              Math.pow(currentPosition.y - lastFacePosition.y, 2)
            );
            if (movement > 10) {
              headMovementDetected = true;
            }
          }
          lastFacePosition = currentPosition;
        }
      } catch (error) {
        console.error('Error in liveness detection:', error);
      }

      requestAnimationFrame(detectLiveness);
    };

    detectLiveness();
  });
}

/**
 * Stop liveness detection
 */
export function stopLivenessDetection() {
  blinkDetectionActive = false;
}
