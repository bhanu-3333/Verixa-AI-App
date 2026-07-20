"use strict";
// src/services/AlphabetRecognizer.ts
// Rule‑based recognizer for a subset of ASL alphabet letters.
// Returns the best‑matching letter and a confidence score (0‑1).
Object.defineProperty(exports, "__esModule", { value: true });
exports.__internal = exports.DICTIONARY = void 0;
exports.recognizeAlphabet = recognizeAlphabet;
exports.getLevenshteinDistance = getLevenshteinDistance;
exports.getWordSuggestion = getWordSuggestion;
// Helper distance between two landmarks (2D Euclidean)
function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}
// Bounding box of hand (used for aspect‑ratio normalisation)
function boundingBox(landmarks) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    landmarks.forEach((p) => {
        if (p.x < minX)
            minX = p.x;
        if (p.x > maxX)
            maxX = p.x;
        if (p.y < minY)
            minY = p.y;
        if (p.y > maxY)
            maxY = p.y;
    });
    return { minX, maxX, minY, maxY };
}
// Finger is considered extended if tip is farther from wrist than its pip joint (simple heuristic)
function isExtended(landmarks, tipIdx, pipIdx, wristIdx = 0) {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const wrist = landmarks[wristIdx];
    const tipDist = dist(tip, wrist);
    const pipDist = dist(pip, wrist);
    return tipDist > pipDist * 1.1; // some margin
}
// ---------- Scoring functions for individual letters ---------- //
// Each returns a score between 0 and 1 (higher = more likely).
function scoreA(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // A: Fist, thumb alongside index finger.
    // All four fingers curled.
    if (extI > 0.45 || extM > 0.45 || extR > 0.45 || extP > 0.45)
        return 0;
    const d4_5 = dist(landmarks[4], landmarks[5]) / handSize;
    const thumbUp = landmarks[4].y < landmarks[3].y;
    if (d4_5 < 0.5 && thumbUp) {
        return 0.95;
    }
    return Math.max(0, 1 - d4_5) * 0.7 + (thumbUp ? 0.25 : 0);
}
function scoreB(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // B: All fingers extended and close together, thumb across palm.
    if (extI < 0.6 || extM < 0.6 || extR < 0.6 || extP < 0.6)
        return 0;
    const spread = (dist(landmarks[8], landmarks[12]) + dist(landmarks[12], landmarks[16]) + dist(landmarks[16], landmarks[20])) / handSize;
    if (spread > 0.65)
        return 0;
    const d4_9 = dist(landmarks[4], landmarks[9]) / handSize;
    const d4_13 = dist(landmarks[4], landmarks[13]) / handSize;
    if (d4_9 < 0.5 || d4_13 < 0.5) {
        return 0.95;
    }
    return 0.7;
}
function scoreC(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // C: Open hand with slight curve – all fingers partially extended.
    if (extI < 0.35 || extI > 0.7 || extM < 0.35 || extM > 0.7 || extR < 0.35 || extR > 0.7 || extP < 0.35 || extP > 0.7) {
        return 0;
    }
    const d4_8 = dist(landmarks[4], landmarks[8]) / handSize;
    if (d4_8 >= 0.45 && d4_8 <= 0.85) {
        return 0.95;
    }
    return 0.5;
}
function scoreD(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // D: Index finger extended, other fingers curled, thumb touching middle of index or curled fingers.
    if (extI < 0.65)
        return 0;
    if (extM > 0.45 || extR > 0.45 || extP > 0.45)
        return 0;
    const d4_12 = dist(landmarks[4], landmarks[12]) / handSize;
    const d4_16 = dist(landmarks[4], landmarks[16]) / handSize;
    const d4_10 = dist(landmarks[4], landmarks[10]) / handSize;
    if (d4_12 < 0.4 || d4_16 < 0.4 || d4_10 < 0.4) {
        return 0.95;
    }
    return 0.6;
}
function scoreF(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // F: Thumb tip and index tip form a circle, other fingers extended.
    const d4_8 = dist(landmarks[4], landmarks[8]) / handSize;
    if (d4_8 > 0.35)
        return 0;
    if (extM < 0.6 || extR < 0.6 || extP < 0.6)
        return 0;
    return 0.95;
}
function scoreI(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // I: Pinky extended, other fingers curled, thumb tucked.
    if (extP < 0.65)
        return 0;
    if (extI > 0.45 || extM > 0.45 || extR > 0.45)
        return 0;
    const d4_5 = dist(landmarks[4], landmarks[5]) / handSize;
    const d4_9 = dist(landmarks[4], landmarks[9]) / handSize;
    if (d4_5 > 0.55 && d4_9 > 0.55)
        return 0; // Avoid confusing with Y
    return 0.95;
}
function scoreL(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // L: Index finger extended, thumb outwards, other fingers curled.
    if (extI < 0.65)
        return 0;
    if (extM > 0.45 || extR > 0.45 || extP > 0.45)
        return 0;
    const d4_5 = dist(landmarks[4], landmarks[5]) / handSize;
    const d4_8 = dist(landmarks[4], landmarks[8]) / handSize;
    if (d4_5 > 0.4 && d4_8 > 0.55) {
        return 0.95;
    }
    return 0;
}
function scoreO(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // O: All fingertips close to each other forming a circle, thumb touching tips.
    const d4_8 = dist(landmarks[4], landmarks[8]) / handSize;
    const d4_12 = dist(landmarks[4], landmarks[12]) / handSize;
    const d4_16 = dist(landmarks[4], landmarks[16]) / handSize;
    const d4_20 = dist(landmarks[4], landmarks[20]) / handSize;
    if (d4_8 > 0.4 || d4_12 > 0.4 || d4_16 > 0.4 || d4_20 > 0.5)
        return 0;
    if (extI > 0.5 || extM > 0.5 || extR > 0.5 || extP > 0.5)
        return 0;
    return 0.95;
}
function scoreS(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // S: Fist, thumb across palm (similar to A but thumb over fingers).
    if (extI > 0.45 || extM > 0.45 || extR > 0.45 || extP > 0.45)
        return 0;
    const d4_9 = dist(landmarks[4], landmarks[9]) / handSize;
    const d4_10 = dist(landmarks[4], landmarks[10]) / handSize;
    if (d4_9 < 0.35 || d4_10 < 0.35) {
        return 0.95;
    }
    return 0.7;
}
function scoreV(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // V: Index and middle fingers extended and spread, others curled.
    if (extI < 0.65 || extM < 0.65)
        return 0;
    if (extR > 0.45 || extP > 0.45)
        return 0;
    const d8_12 = dist(landmarks[8], landmarks[12]) / handSize;
    if (d8_12 < 0.25)
        return 0;
    return 0.95;
}
function scoreW(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // W: Index, middle, ring extended and spread, pinky curled.
    if (extI < 0.6 || extM < 0.6 || extR < 0.6)
        return 0;
    if (extP > 0.45)
        return 0;
    const d8_12 = dist(landmarks[8], landmarks[12]) / handSize;
    const d12_16 = dist(landmarks[12], landmarks[16]) / handSize;
    if (d8_12 < 0.2 || d12_16 < 0.2)
        return 0;
    return 0.95;
}
function scoreY(landmarks) {
    const handSize = dist(landmarks[0], landmarks[9]) || 0.1;
    const extI = dist(landmarks[8], landmarks[5]) / handSize;
    const extM = dist(landmarks[12], landmarks[9]) / handSize;
    const extR = dist(landmarks[16], landmarks[13]) / handSize;
    const extP = dist(landmarks[20], landmarks[17]) / handSize;
    // Y: Thumb and pinky extended, other fingers curled.
    const d4_2 = dist(landmarks[4], landmarks[2]) / handSize;
    const d4_20 = dist(landmarks[4], landmarks[20]) / handSize;
    if (extP < 0.6 || d4_2 < 0.45 || d4_20 < 0.7)
        return 0;
    if (extI > 0.45 || extM > 0.45 || extR > 0.45)
        return 0;
    return 0.95;
}
const LETTERS = {
    A: scoreA,
    B: scoreB,
    C: scoreC,
    D: scoreD,
    F: scoreF,
    I: scoreI,
    L: scoreL,
    O: scoreO,
    S: scoreS,
    V: scoreV,
    W: scoreW,
    Y: scoreY,
};
/** Recognize a single alphabet letter from MediaPipe hand landmarks. */
function recognizeAlphabet(landmarks) {
    if (!landmarks || landmarks.length !== 21) {
        return { letter: null, confidence: 0 };
    }
    let bestLetter = null;
    let bestScore = 0;
    for (const [letter, fn] of Object.entries(LETTERS)) {
        const score = fn(landmarks);
        if (score > bestScore) {
            bestScore = score;
            bestLetter = letter;
        }
    }
    return { letter: bestLetter, confidence: bestScore };
}
// ---------------------------------------------------------------------------
// Lightweight Dictionary and Auto-correction suggestion logic
// ---------------------------------------------------------------------------
exports.DICTIONARY = [
    'HELLO',
    'HELP',
    'PLEASE',
    'THANK',
    'YES',
    'NO',
    'WATER',
    'FOOD',
    'DOCTOR',
    'POLICE',
    'CALL',
    'NAME',
    'ADDRESS',
    'NUMBER',
    'HOME'
];
/**
 * Calculates the Levenshtein distance between two strings.
 */
function getLevenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}
/**
 * Checks the current word against the dictionary and returns a suggestion if a word
 * in the dictionary differs by only 1-2 characters.
 */
function getWordSuggestion(word) {
    const cleanWord = word.trim().toUpperCase();
    if (!cleanWord)
        return null;
    // If already in dictionary, no suggestion needed
    if (exports.DICTIONARY.includes(cleanWord))
        return null;
    let bestMatch = null;
    let minDistance = Infinity;
    let bestLengthDiff = Infinity;
    for (const dictWord of exports.DICTIONARY) {
        const distVal = getLevenshteinDistance(cleanWord, dictWord);
        if (distVal >= 1 && distVal <= 2) {
            const lengthDiff = Math.abs(cleanWord.length - dictWord.length);
            if (distVal < minDistance) {
                minDistance = distVal;
                bestLengthDiff = lengthDiff;
                bestMatch = dictWord;
            }
            else if (distVal === minDistance) {
                if (lengthDiff < bestLengthDiff) {
                    bestLengthDiff = lengthDiff;
                    bestMatch = dictWord;
                }
            }
        }
    }
    return bestMatch;
}
exports.__internal = { dist, isExtended, boundingBox };
