const videoElement = document.getElementById('gestureCamera');
const canvasElement = document.getElementById('handCanvas');
const canvasCtx = canvasElement.getContext('2d');

const muteIcon = document.getElementById('muteIcon');
let isMuted = false;

document.getElementById('muteButton').addEventListener('click', () => {
  isMuted = !isMuted;
  muteIcon.className = isMuted ? 'fa fa-volume-mute' : 'fa fa-volume-up';
});

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 2, // ✅ Allow two hands
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});

camera.start();

const handHistory = {
  left: [],
  right: []
};

function updateHandHistory(handednessLabel, landmarks) {
  if (!handHistory[handednessLabel.toLowerCase()]) return;
  const history = handHistory[handednessLabel.toLowerCase()];
  history.push(landmarks);
  if (history.length > 15) history.shift(); // keep max 15 frames
}

function detectNod(handHistory) {
  // Simplified: check y-axis of palm base (landmark 0) over last frames for up/down oscillation
  const ys = handHistory.map(landmarks => landmarks[0].y);
  const maxY = Math.max(...ys);
  const minY = Math.min(...ys);
  return (maxY - minY) > 0.02; // threshold for nodding
}

function detectHandForwardPush(handHistory) {
  // Check if x moves towards camera (x decreases or increases depending on mirroring)
  const xs = handHistory.map(landmarks => landmarks[0].x);
  return (xs[0] - xs[xs.length - 1]) > 0.03; // hand moved forward in x-axis (adjust axis as needed)
}

function detectHandRubbing(handHistoryLeft, handHistoryRight) {
  // Check lateral oscillation between both hands
  if (!handHistoryLeft.length || !handHistoryRight.length) return false;
  const lastLeftX = handHistoryLeft[handHistoryLeft.length - 1][0].x;
  const lastRightX = handHistoryRight[handHistoryRight.length - 1][0].x;
  const prevLeftX = handHistoryLeft[0][0].x;
  const prevRightX = handHistoryRight[0][0].x;

  const leftMove = Math.abs(lastLeftX - prevLeftX);
  const rightMove = Math.abs(lastRightX - prevRightX);

  return leftMove > 0.02 && rightMove > 0.02 && (lastLeftX < lastRightX);
}


let lastSpokenGesture = "";

function speakGesture(text) {
  if (!window.speechSynthesis) return; // Browser doesn't support it

  if (text === lastSpokenGesture) return; // Avoid repeating the same speech

  lastSpokenGesture = text;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; // Set language (change if needed)
  window.speechSynthesis.cancel(); // Cancel any ongoing speech
  window.speechSynthesis.speak(utterance);
}

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  let detectedText = "None"; // Default text if no gestures detected

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    results.multiHandLandmarks.forEach((landmarks, index) => {
      if (!landmarks || landmarks.length === 0) return;

      const handednessLabel = results.multiHandedness?.[index]?.label || "Unknown";
      const labelMap = { "Left": "Right", "Right": "Left" };
      const mirroredHandednessLabel = labelMap[handednessLabel] || handednessLabel;

      updateHandHistory(handednessLabel.toLowerCase(), landmarks);

      const adjustedLandmarks = landmarks.map(lm => ({
        x: (lm.x * canvasElement.width + 5) / canvasElement.width,
        y: (lm.y * canvasElement.height + 10) / canvasElement.height,
        z: lm.z
      }));

      // Detect specific signs here
      const sign = detectSpecificSigns(landmarks, handednessLabel) || "No Gesture";

      if (sign !== "No Gesture" && sign !== "") {
        detectedText = `${mirroredHandednessLabel} - ${sign}`;

        drawConnectors(canvasCtx, adjustedLandmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
        drawLandmarks(canvasCtx, adjustedLandmarks, { color: '#FF0000', lineWidth: 2 });
      }
    });
  } else {
    console.log("No hands detected.");
  }

  // Update the recognizedGesture text content
  const recognizedGestureEl = document.getElementById("recognizedGesture");
  if (recognizedGestureEl) {
    recognizedGestureEl.textContent = `Detected: ${detectedText}`;
  }

  // Speak detected gesture (only the gesture word, not the label)
  if (detectedText !== "None") {
    // Extract only the gesture part from "Right - Hello" => "Hello"
    const gestureWord = detectedText.split(" - ")[1] || detectedText;
    if (gestureWord !== "No Gesture" && gestureWord !== "") {
      speakGesture(gestureWord);
    }
  }

  canvasCtx.restore();
}


function detectSimpleGesture(landmarks, handednessLabel) {
  const tips = [4, 8, 12, 16, 20];
  let fingersUp = 0;

  // Thumb detection
  const isRightHand = handednessLabel === "Right";
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];

  if ((isRightHand && thumbTip.x < thumbIP.x) || (!isRightHand && thumbTip.x > thumbIP.x)) {
    fingersUp++;
  }

  // Other fingers (Index to Pinky)
  for (let i = 1; i < tips.length; i++) {
    const tip = landmarks[tips[i]];
    const pip = landmarks[tips[i] - 2];
    if (tip.y < pip.y) fingersUp++;
  }

  switch (fingersUp) {
    case 0: return 'Fist';
    case 1: return 'One';
    case 2: return 'Two';
    case 3: return 'Three';
    case 4: return 'Four';
    case 5: return 'Open Hand';
    default: return 'Unknown';
  }
}

function detectSpecificSigns(landmarks, handednessLabel) {
  function isFingerUp(tipIndex, pipIndex) {
    return landmarks[tipIndex].y < landmarks[pipIndex].y;
  }

  function isThumbExtended() {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const isRightHand = handednessLabel === "Right";
    return isRightHand ? (thumbTip.x < thumbIP.x) : (thumbTip.x > thumbIP.x);
  }

  // "Hi" and "Hello" - all fingers up
  if (
    isThumbExtended() &&
    isFingerUp(8, 6) &&
    isFingerUp(12, 10) &&
    isFingerUp(16, 14) &&
    isFingerUp(20, 18)
  ) {
    return "Hi or Hello";
  }

  // "Yes" - fist (all fingers down)
  if (
    !isThumbExtended() &&
    !isFingerUp(8, 6) &&
    !isFingerUp(12, 10) &&
    !isFingerUp(16, 14) &&
    !isFingerUp(20, 18)
  ) {
    return "Yes";
  }

  // "No" - thumb down, index and middle fingers up, ring and pinky down
  if (
    !isThumbExtended() &&                // thumb folded (down)
    isFingerUp(8, 6) &&                 // index up
    isFingerUp(12, 10) &&               // middle up
    !isFingerUp(16, 14) &&              // ring down
    !isFingerUp(20, 18)                 // pinky down
  ) {
    return "No";
  }

  // "I Love You" - thumb, index, pinky extended; middle and ring down
  if (
    isThumbExtended() &&
    isFingerUp(8, 6) &&
    !isFingerUp(12, 10) &&
    !isFingerUp(16, 14) &&
    isFingerUp(20, 18)
  ) {
    return "I Love You";
  }

  // Default fallback to simple finger counting
  return detectSimpleGesture(landmarks, handednessLabel);
}

function detectASLLetter(landmarks, handednessLabel) {
  if (handednessLabel !== "Left") return ""; // Only detect ASL if left hand is used

  function isFingerUp(tipIndex, pipIndex) {
    return landmarks[tipIndex].y < landmarks[pipIndex].y;
  }

  function isThumbExtended() {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    return thumbTip.x > thumbIP.x; // Left hand: thumb points right
  }

  // === ASL Letters (Add more conditions here for full alphabet) ===

  // A: Fist with thumb on the side
  const isA =
    !isFingerUp(8, 6) &&
    !isFingerUp(12, 10) &&
    !isFingerUp(16, 14) &&
    !isFingerUp(20, 18) &&
    isThumbExtended();

  // B: All fingers up, thumb folded across palm
  const isB =
    isFingerUp(8, 6) &&
    isFingerUp(12, 10) &&
    isFingerUp(16, 14) &&
    isFingerUp(20, 18) &&
    !isThumbExtended();

  // C: Curved fingers forming a "C"
  const isC =
    isFingerUp(8, 6) &&
    isFingerUp(12, 10) &&
    landmarks[8].x - landmarks[5].x > 0.05 &&
    landmarks[12].x - landmarks[9].x > 0.05;

  // I: Only pinky finger up
  const isI =
    !isFingerUp(8, 6) &&
    !isFingerUp(12, 10) &&
    !isFingerUp(16, 14) &&
    isFingerUp(20, 18);

  // L: Thumb and index up, others down
  const isL =
    isThumbExtended() &&
    isFingerUp(8, 6) &&
    !isFingerUp(12, 10) &&
    !isFingerUp(16, 14) &&
    !isFingerUp(20, 18);

  // Y: Thumb and pinky up, others down
  const isY =
    isThumbExtended() &&
    !isFingerUp(8, 6) &&
    !isFingerUp(12, 10) &&
    !isFingerUp(16, 14) &&
    isFingerUp(20, 18);

  // === Return Letter ===
  if (isA) return 'A';
  if (isB) return 'B';
  if (isC) return 'C';
  if (isI) return 'I';
  if (isL) return 'L';
  if (isY) return 'Y';

  return ''; // No match
}


// Tab switch logic
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  document.getElementById(tabId).style.display = 'block';
}

window.onload = () => {
  switchTab('signToText');

  const muteIcon = document.getElementById('muteIcon');
  const muteButton = document.getElementById('muteButton');
  
  muteButton.addEventListener('click', () => {
    isMuted = !isMuted;
    muteIcon.className = isMuted ? 'fa fa-volume-mute' : 'fa fa-volume-up';
  });

};
