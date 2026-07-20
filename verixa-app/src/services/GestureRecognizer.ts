/**
 * Verixa AI — Rule-Based Gesture Recognizer
 *
 * ARCHITECTURE:
 * This module is intentionally a pure function (no state, no side effects, no UI).
 * It accepts 21 MediaPipe hand landmarks and returns a GestureResult.
 *
 * To replace with an ML model later: swap out `recognizeGesture()` implementation only.
 * The input/output contract (NormalizedLandmark[] → GestureResult) stays the same.
 *
 * MEDIAPIPE LANDMARK INDICES (reference):
 *  0  = WRIST
 *  1  = THUMB_CMC    2  = THUMB_MCP    3  = THUMB_IP    4  = THUMB_TIP
 *  5  = INDEX_MCP    6  = INDEX_PIP    7  = INDEX_DIP   8  = INDEX_TIP
 *  9  = MIDDLE_MCP  10  = MIDDLE_PIP  11  = MIDDLE_DIP  12 = MIDDLE_TIP
 * 13  = RING_MCP    14  = RING_PIP    15  = RING_DIP    16 = RING_TIP
 * 17  = PINKY_MCP   18  = PINKY_PIP   19  = PINKY_DIP   20 = PINKY_TIP
 *
 * COORDINATE SYSTEM:
 * x: 0.0 (left) → 1.0 (right)  [MIRRORED on front camera — left/right are flipped]
 * y: 0.0 (top)  → 1.0 (bottom)
 * z: depth (negative = closer to camera)
 *
 * CONFIDENCE THRESHOLD:
 * Each rule returns a confidence score 0–1. The recognizer only fires if the
 * best-matching gesture exceeds MIN_CONFIDENCE to avoid false positives.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface GestureResult {
  /** The recognized gesture word, or null if nothing matched */
  word: string | null;
  /** Confidence score 0–1 for the best match */
  confidence: number;
  /** Which rule fired */
  rule: string;
}

type GestureRule = (lm: Landmark[]) => number; // returns confidence 0–1

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_CONFIDENCE = 0.70;

/** Landmark index aliases for readability */
const LM = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
} as const;

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

/** Euclidean distance between two landmarks in 2D (x, y only) */
function dist2d(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Is a finger extended?
 * A finger is "extended" when its TIP is higher (smaller y) than its PIP joint,
 * with a margin relative to hand height for robustness.
 */
function isFingerExtended(lm: Landmark[], tip: number, pip: number): boolean {
  return lm[tip].y < lm[pip].y - 0.02;
}

/**
 * Is a finger curled/closed?
 * TIP is clearly below (larger y) the PIP joint.
 */
function isFingerCurled(lm: Landmark[], tip: number, pip: number): boolean {
  return lm[tip].y > lm[pip].y + 0.02;
}

/** Approximate hand height as distance from wrist to middle finger MCP */
function handHeight(lm: Landmark[]): number {
  return dist2d(lm[LM.WRIST], lm[LM.MIDDLE_MCP]) || 0.001;
}

/**
 * Is the thumb extended sideways (abducted)?
 * We detect abduction by checking that the thumb tip is further from the index MCP
 * than the thumb CMC is.
 */
function isThumbExtended(lm: Landmark[]): boolean {
  const tipToIndex = dist2d(lm[LM.THUMB_TIP], lm[LM.INDEX_MCP]);
  const cmcToIndex = dist2d(lm[LM.THUMB_CMC], lm[LM.INDEX_MCP]);
  return tipToIndex > cmcToIndex * 0.9;
}

function isThumbCurled(lm: Landmark[]): boolean {
  return !isThumbExtended(lm);
}

// Convenience: count of non-thumb fingers extended
function countExtendedFingers(lm: Landmark[]): number {
  let count = 0;
  if (isFingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP)) count++;
  if (isFingerExtended(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) count++;
  if (isFingerExtended(lm, LM.RING_TIP, LM.RING_PIP)) count++;
  if (isFingerExtended(lm, LM.PINKY_TIP, LM.PINKY_PIP)) count++;
  return count;
}

// Convenience: all four fingers (excluding thumb) curled
function allFingersCurled(lm: Landmark[]): boolean {
  return (
    isFingerCurled(lm, LM.INDEX_TIP, LM.INDEX_PIP) &&
    isFingerCurled(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP) &&
    isFingerCurled(lm, LM.RING_TIP, LM.RING_PIP) &&
    isFingerCurled(lm, LM.PINKY_TIP, LM.PINKY_PIP)
  );
}

// Average distance between all 5 fingertips
function averageTipDistance(lm: Landmark[]): number {
  const tips = [LM.THUMB_TIP, LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP];
  let totalDist = 0;
  let count = 0;
  for (let i = 0; i < tips.length; i++) {
    for (let j = i + 1; j < tips.length; j++) {
      totalDist += dist2d(lm[tips[i]], lm[tips[j]]);
      count++;
    }
  }
  return totalDist / count;
}

function isThumbPointingUp(lm: Landmark[]): boolean {
  return lm[LM.THUMB_TIP].y < lm[LM.THUMB_MCP].y - 0.02 && lm[LM.THUMB_TIP].y < lm[LM.INDEX_MCP].y;
}

function isThumbPointingDown(lm: Landmark[]): boolean {
  return lm[LM.THUMB_TIP].y > lm[LM.THUMB_MCP].y + 0.02 && lm[LM.THUMB_TIP].y > lm[LM.WRIST].y;
}

// ---------------------------------------------------------------------------
// Gesture scoring functions (Independent recognition functions)
// ---------------------------------------------------------------------------

/** HELLO — Open palm vertical, all 5 digits extended, fingers spread */
const scoreHello: GestureRule = (lm) => {
  let score = 0;
  if (countExtendedFingers(lm) === 4) score += 0.4;
  if (isThumbExtended(lm)) score += 0.2;
  const h = handHeight(lm);
  const spread = dist2d(lm[LM.INDEX_TIP], lm[LM.PINKY_TIP]);
  if (spread > h * 0.65) score += 0.2;
  if (lm[LM.WRIST].y > lm[LM.MIDDLE_MCP].y) score += 0.2;
  return score;
};

/** YES — Fist pointing up, thumb folded over middle/index PIP */
const scoreYes: GestureRule = (lm) => {
  let score = 0;
  if (allFingersCurled(lm)) score += 0.55;
  const thumbToIndexPip = dist2d(lm[LM.THUMB_TIP], lm[LM.INDEX_PIP]);
  const thumbToMiddlePip = dist2d(lm[LM.THUMB_TIP], lm[LM.MIDDLE_PIP]);
  const h = handHeight(lm);
  if (thumbToIndexPip < h * 0.5 || thumbToMiddlePip < h * 0.5) score += 0.3;
  if (lm[LM.WRIST].y > lm[LM.MIDDLE_MCP].y) score += 0.15;
  return score;
};

/** NO — Index and middle extended, ring and pinky curled, thumb curled */
const scoreNo: GestureRule = (lm) => {
  let score = 0;
  if (isFingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP)) score += 0.3;
  if (isFingerExtended(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) score += 0.3;
  if (isFingerCurled(lm, LM.RING_TIP, LM.RING_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.PINKY_TIP, LM.PINKY_PIP)) score += 0.15;
  if (isThumbCurled(lm)) score += 0.1;
  return score;
};

/** HELP — Fist with thumb pointing UP */
const scoreHelp: GestureRule = (lm) => {
  let score = 0;
  if (allFingersCurled(lm)) score += 0.45;
  if (isThumbPointingUp(lm)) score += 0.45;
  if (lm[LM.THUMB_TIP].y < lm[LM.WRIST].y) score += 0.1;
  return score;
};

/** PLEASE — 4 fingers extended vertical, grouped close together, thumb curled/tucked */
const scorePlease: GestureRule = (lm) => {
  let score = 0;
  if (countExtendedFingers(lm) === 4) score += 0.4;
  if (isThumbCurled(lm)) score += 0.2;
  const h = handHeight(lm);
  const spread = dist2d(lm[LM.INDEX_TIP], lm[LM.PINKY_TIP]);
  if (spread < h * 0.55) score += 0.2;
  if (lm[LM.WRIST].y > lm[LM.MIDDLE_MCP].y) score += 0.2;
  return score;
};

/** THANK YOU — 4 fingers extended vertical, grouped close together, thumb extended sideways */
const scoreThankYou: GestureRule = (lm) => {
  let score = 0;
  if (countExtendedFingers(lm) === 4) score += 0.4;
  if (isThumbExtended(lm)) score += 0.2;
  const h = handHeight(lm);
  const spread = dist2d(lm[LM.INDEX_TIP], lm[LM.PINKY_TIP]);
  if (spread < h * 0.55) score += 0.2;
  if (lm[LM.WRIST].y > lm[LM.MIDDLE_MCP].y) score += 0.2;
  return score;
};

/** STOP — Open palm vertical, all 5 digits extended, fingers grouped or slightly spread */
const scoreStop: GestureRule = (lm) => {
  let score = 0;
  if (countExtendedFingers(lm) === 4) score += 0.4;
  if (isThumbExtended(lm)) score += 0.2;
  const h = handHeight(lm);
  const spread = dist2d(lm[LM.INDEX_TIP], lm[LM.PINKY_TIP]);
  if (spread > h * 0.45 && spread < h * 0.65) score += 0.2;
  if (lm[LM.WRIST].y > lm[LM.MIDDLE_MCP].y + h * 0.3) score += 0.2;
  return score;
};

/** WAIT — Pinky finger extended vertical, other fingers curled */
const scoreWait: GestureRule = (lm) => {
  let score = 0;
  if (isFingerExtended(lm, LM.PINKY_TIP, LM.PINKY_PIP)) score += 0.5;
  if (isFingerCurled(lm, LM.INDEX_TIP, LM.INDEX_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.RING_TIP, LM.RING_PIP)) score += 0.15;
  if (isThumbCurled(lm)) score += 0.05;
  return score;
};

/** COME — Index finger pointing up but tilted/rotated sideways */
const scoreCome: GestureRule = (lm) => {
  let score = 0;
  if (isFingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP)) score += 0.4;
  if (isFingerCurled(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.RING_TIP, LM.RING_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.PINKY_TIP, LM.PINKY_PIP)) score += 0.15;
  if (isThumbCurled(lm)) score += 0.05;
  const dy = Math.abs(lm[LM.INDEX_TIP].y - lm[LM.INDEX_MCP].y);
  const dx = Math.abs(lm[LM.INDEX_TIP].x - lm[LM.INDEX_MCP].x);
  const h = handHeight(lm);
  if (dx > h * 0.25 && dy > h * 0.25 && dy < h * 0.6) score += 0.1;
  return score;
};

/** I — Index pointing straight up, others curled */
const scoreI: GestureRule = (lm) => {
  let score = 0;
  if (isFingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP)) score += 0.4;
  if (isFingerCurled(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.RING_TIP, LM.RING_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.PINKY_TIP, LM.PINKY_PIP)) score += 0.15;
  if (isThumbCurled(lm)) score += 0.05;
  const dx = Math.abs(lm[LM.INDEX_TIP].x - lm[LM.INDEX_MCP].x);
  if (dx < handHeight(lm) * 0.25) score += 0.1;
  return score;
};

/** YOU — Index pointing forward at camera (foreshortened tip, z closer to camera) */
const scoreYou: GestureRule = (lm) => {
  let score = 0;
  const dist = dist2d(lm[LM.INDEX_TIP], lm[LM.INDEX_MCP]);
  const h = handHeight(lm);
  if (dist < h * 0.45) score += 0.3;
  if (lm[LM.INDEX_TIP].z < lm[LM.INDEX_MCP].z - 0.04) score += 0.2;
  if (isFingerCurled(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.RING_TIP, LM.RING_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.PINKY_TIP, LM.PINKY_PIP)) score += 0.15;
  if (isThumbCurled(lm)) score += 0.05;
  return score;
};

/** BAD — Fist with thumb pointing DOWN */
const scoreBad: GestureRule = (lm) => {
  let score = 0;
  if (allFingersCurled(lm)) score += 0.45;
  if (isThumbPointingDown(lm)) score += 0.45;
  if (lm[LM.THUMB_TIP].y > lm[LM.WRIST].y) score += 0.1;
  return score;
};

/** OKAY — Thumb tip and Index tip touching, other three fingers extended */
const scoreOkay: GestureRule = (lm) => {
  let score = 0;
  const thumbToIndex = dist2d(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]);
  const h = handHeight(lm);
  if (thumbToIndex < h * 0.22) score += 0.5;
  if (isFingerExtended(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) score += 0.15;
  if (isFingerExtended(lm, LM.RING_TIP, LM.RING_PIP)) score += 0.15;
  if (isFingerExtended(lm, LM.PINKY_TIP, LM.PINKY_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.INDEX_TIP, LM.INDEX_PIP)) score += 0.05;
  return score;
};

/** MORE — All 5 fingertips pinched together (tilted/horizontal hand) */
const scoreMore: GestureRule = (lm) => {
  let score = 0;
  const avgTipDist = averageTipDistance(lm);
  const h = handHeight(lm);
  if (avgTipDist < h * 0.38) score += 0.6;
  const dy = Math.abs(lm[LM.WRIST].y - lm[LM.MIDDLE_MCP].y);
  if (dy < h * 0.8) score += 0.4;
  return score;
};

/** WATER — W-hand (index, middle, ring extended, thumb and pinky curled) */
const scoreWater: GestureRule = (lm) => {
  let score = 0;
  if (isFingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP)) score += 0.25;
  if (isFingerExtended(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) score += 0.25;
  if (isFingerExtended(lm, LM.RING_TIP, LM.RING_PIP)) score += 0.25;
  if (isFingerCurled(lm, LM.PINKY_TIP, LM.PINKY_PIP)) score += 0.15;
  if (isThumbCurled(lm)) score += 0.1;
  return score;
};

/** FOOD — All 5 fingertips pinched together pointing straight up */
const scoreFood: GestureRule = (lm) => {
  let score = 0;
  const avgTipDist = averageTipDistance(lm);
  const h = handHeight(lm);
  if (avgTipDist < h * 0.38) score += 0.6;
  const dy = lm[LM.WRIST].y - lm[LM.MIDDLE_MCP].y;
  if (dy > h * 0.8) score += 0.4;
  return score;
};

/** DRINK — C-shape hand (thumb extended, all fingers semi-curled) */
const scoreDrink: GestureRule = (lm) => {
  let score = 0;
  const h = handHeight(lm);
  if (isThumbExtended(lm)) score += 0.3;
  let semiCurledCount = 0;
  const fingers = [
    { tip: LM.INDEX_TIP, mcp: LM.INDEX_MCP },
    { tip: LM.MIDDLE_TIP, mcp: LM.MIDDLE_MCP },
    { tip: LM.RING_TIP, mcp: LM.RING_MCP },
    { tip: LM.PINKY_TIP, mcp: LM.PINKY_MCP },
  ];
  for (const f of fingers) {
    const tipToMcp = dist2d(lm[f.tip], lm[f.mcp]);
    if (tipToMcp > h * 0.3 && tipToMcp < h * 0.65) semiCurledCount++;
  }
  score += (semiCurledCount / 4) * 0.5;
  const thumbToIndex = dist2d(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]);
  if (thumbToIndex > h * 0.3 && thumbToIndex < h * 0.7) score += 0.2;
  return score;
};

/** WHAT — Flat hand horizontal, palm up/tilted, fingers extended and spread */
const scoreWhat: GestureRule = (lm) => {
  let score = 0;
  if (countExtendedFingers(lm) === 4) score += 0.4;
  if (isThumbExtended(lm)) score += 0.2;
  const h = handHeight(lm);
  const spread = dist2d(lm[LM.INDEX_TIP], lm[LM.PINKY_TIP]);
  if (spread > h * 0.6) score += 0.2;
  const dy = Math.abs(lm[LM.WRIST].y - lm[LM.MIDDLE_MCP].y);
  if (dy < h * 0.7) score += 0.2;
  return score;
};

/** WHERE — Index pointing sideways horizontally, other fingers curled */
const scoreWhere: GestureRule = (lm) => {
  let score = 0;
  if (isFingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP) || Math.abs(lm[LM.INDEX_TIP].x - lm[LM.INDEX_MCP].x) > handHeight(lm) * 0.5) score += 0.4;
  if (isFingerCurled(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.RING_TIP, LM.RING_PIP)) score += 0.15;
  if (isFingerCurled(lm, LM.PINKY_TIP, LM.PINKY_PIP)) score += 0.15;
  if (isThumbCurled(lm)) score += 0.05;
  const dy = Math.abs(lm[LM.INDEX_TIP].y - lm[LM.INDEX_MCP].y);
  const dx = Math.abs(lm[LM.INDEX_TIP].x - lm[LM.INDEX_MCP].x);
  if (dy < handHeight(lm) * 0.4 && dx > handHeight(lm) * 0.5) score += 0.1;
  return score;
};

/** PHONE — Y-hand (thumb and pinky extended, other three curled) */
const scorePhone: GestureRule = (lm) => {
  let score = 0;
  if (isThumbExtended(lm)) score += 0.3;
  if (isFingerExtended(lm, LM.PINKY_TIP, LM.PINKY_PIP)) score += 0.3;
  if (isFingerCurled(lm, LM.INDEX_TIP, LM.INDEX_PIP)) score += 0.1;
  if (isFingerCurled(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP)) score += 0.1;
  if (isFingerCurled(lm, LM.RING_TIP, LM.RING_PIP)) score += 0.1;
  const thumbToPinky = dist2d(lm[LM.THUMB_TIP], lm[LM.PINKY_TIP]);
  if (thumbToPinky > handHeight(lm) * 0.8) score += 0.1;
  return score;
};

// ---------------------------------------------------------------------------
// Rule registry (Priority ordered: specific checks first)
// ---------------------------------------------------------------------------

const GESTURE_RULES: Array<{ word: string; rule: GestureRule }> = [
  { word: 'Okay',      rule: scoreOkay },
  { word: 'Phone',     rule: scorePhone },
  { word: 'Water',     rule: scoreWater },
  { word: 'Wait',      rule: scoreWait },
  { word: 'Yes',       rule: scoreYes },
  { word: 'Help',      rule: scoreHelp },
  { word: 'Bad',       rule: scoreBad },
  { word: 'I',         rule: scoreI },
  { word: 'Where',     rule: scoreWhere },
  { word: 'You',       rule: scoreYou },
  { word: 'Come',      rule: scoreCome },
  { word: 'Food',      rule: scoreFood },
  { word: 'More',      rule: scoreMore },
  { word: 'Drink',     rule: scoreDrink },
  { word: 'Please',    rule: scorePlease },
  { word: 'Thank You', rule: scoreThankYou },
  { word: 'Stop',      rule: scoreStop },
  { word: 'What',      rule: scoreWhat },
  { word: 'Hello',     rule: scoreHello },
  { word: 'No',        rule: scoreNo },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Recognize a hand gesture from 21 MediaPipe landmarks.
 *
 * @param landmarks - Array of exactly 21 NormalizedLandmark objects from MediaPipe
 * @returns GestureResult with the recognized word and confidence, or { word: null } if no match
 *
 * CONTRACT: This function is pure — same input always gives same output.
 * Replace this implementation with an ML model inference call without changing
 * the function signature.
 */
export function recognizeGesture(landmarks: Landmark[]): GestureResult {
  if (!landmarks || landmarks.length !== 21) {
    return { word: null, confidence: 0, rule: 'invalid-input' };
  }

  let bestWord: string | null = null;
  let bestConfidence = 0;
  let bestRule = 'none';

  for (const { word, rule } of GESTURE_RULES) {
    const confidence = rule(landmarks);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestWord = word;
      bestRule = word.toLowerCase().replace(/ /g, '-');
    }
  }

  if (bestConfidence >= MIN_CONFIDENCE) {
    return { word: bestWord, confidence: bestConfidence, rule: bestRule };
  }

  return { word: null, confidence: bestConfidence, rule: 'below-threshold' };
}

/**
 * Returns all gesture names this recognizer supports, in priority order.
 * Useful for displaying a legend in the UI.
 */
export function getSupportedGestures(): string[] {
  return GESTURE_RULES.map((g) => g.word);
}
