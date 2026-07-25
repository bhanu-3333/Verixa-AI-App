/**
 * signPhraseFilter.ts
 *
 * Module-specific phrase allowlists for the Verixa AI sign recognition system.
 * After model prediction, apply these filters to restrict which phrases are
 * accepted based on the active module.
 *
 * DO NOT modify the AI model or backend — filtering is purely post-prediction.
 */

/** All 4 LSTM-trained phrases (class labels) */
export const ALL_SIGN_PHRASES = [
  'WHEN_SHOULD_I_TAKE_MY_TABLETS',
  'BANK_ACCOUNT_REQUIRED_DETAILS',
  'CAN_YOU_HELP_ME',
  'CAN_YOU_CONVEY_THIS_MESSAGE',
] as const;

export type SignPhrase = typeof ALL_SIGN_PHRASES[number];

/** Module context identifiers */
export type SignModule = 'general' | 'hospital' | 'bank';

/**
 * Allowed phrases per module:
 *  - general  → CAN_YOU_HELP_ME, CAN_YOU_CONVEY_THIS_MESSAGE
 *  - hospital → WHEN_SHOULD_I_TAKE_MY_TABLETS only
 *  - bank     → BANK_ACCOUNT_REQUIRED_DETAILS only
 */
export const MODULE_ALLOWED_PHRASES: Record<SignModule, string[]> = {
  general: [
    'CAN_YOU_HELP_ME',
    'CAN_YOU_CONVEY_THIS_MESSAGE',
  ],
  hospital: [
    'WHEN_SHOULD_I_TAKE_MY_TABLETS',
  ],
  bank: [
    'BANK_ACCOUNT_REQUIRED_DETAILS',
  ],
};

/**
 * Returns true if the given phrase is allowed for the specified module.
 * @param phrase  - Predicted phrase string (e.g. "CAN_YOU_HELP_ME")
 * @param module  - Active module context ('general' | 'hospital' | 'bank')
 */
export function isPhraseAllowedForModule(phrase: string, module: SignModule): boolean {
  const allowed = MODULE_ALLOWED_PHRASES[module];
  return allowed.includes(phrase.toUpperCase());
}

/**
 * Filter a predicted phrase; returns the phrase if allowed, or null if blocked.
 * Use this immediately after LSTM prediction before updating the UI.
 *
 * @param phrase   - Predicted phrase (may be null/undefined)
 * @param module   - Active module
 * @returns phrase if allowed, null otherwise
 */
export function filterPhraseForModule(
  phrase: string | null | undefined,
  module: SignModule,
): string | null {
  if (!phrase) return null;
  return isPhraseAllowedForModule(phrase, module) ? phrase : null;
}
