(() => {
  "use strict";

  /** Shared speed constants used by content script, popup, and service worker */
  const SPEED_STEP = 0.25;
  const MIN_PLAYBACK_RATE = 0.25;
  const MAX_PLAYBACK_RATE = 10;

  /** Storage key map — single source of truth for all chrome.storage keys */
  const STORAGE_KEYS = Object.freeze({
    rate: "youtubeSpeedController.playbackRate",
    widgetHidden: "youtubeSpeedController.widgetHidden",
    toastHidden: "youtubeSpeedController.toastHidden",
    enabled: "youtubeSpeedController.enabled",
    keyboardEnabled: "youtubeSpeedController.keyboardEnabled",
    mouseWheelEnabled: "youtubeSpeedController.mouseWheelEnabled",
    boostEnabled: "youtubeSpeedController.boostEnabled",
    rememberPerChannel: "youtubeSpeedController.rememberPerChannel",
    rememberGlobally: "youtubeSpeedController.rememberGlobally",
    rememberPerSite: "youtubeSpeedController.rememberPerSite",
    autoApplyPreferredSpeed: "youtubeSpeedController.autoApplyPreferredSpeed",
    compactMode: "youtubeSpeedController.compactMode",
    fullscreenOnlyControls: "youtubeSpeedController.fullscreenOnlyControls",
    themeMode: "youtubeSpeedController.themeMode",
    startupDefaultSpeed: "youtubeSpeedController.startupDefaultSpeed",
    shortcuts: "youtubeSpeedController.shortcuts",
    channelRates: "youtubeSpeedController.channelRates",
    analytics: "youtubeSpeedController.analytics",
    sitePolicies: "youtubeSpeedController.sitePolicies",
    siteAccessMode: "youtubeSpeedController.siteAccessMode",
    siteAccessList: "youtubeSpeedController.siteAccessList",
    defaultNativeMode: "youtubeSpeedController.defaultNativeMode"
  });

  const DEFAULT_SHORTCUTS = Object.freeze({
    increase: Object.freeze({ label: "Shift + .", code: "Period", shift: true }),
    decrease: Object.freeze({ label: "Shift + ,", code: "Comma", shift: true }),
    reset: Object.freeze({ label: "Shift + Backspace", code: "Backspace", shift: true }),
    boost: Object.freeze({ label: "X (hold)", code: "KeyX", hold: true }),
    widgetToggle: Object.freeze({ label: "Shift + S", code: "KeyS", shift: true }),
    overlayToggle: Object.freeze({ label: "Shift + H", code: "KeyH", shift: true }),
    preset1: Object.freeze({ label: "Alt + 1", code: "Digit1", alt: true }),
    preset2: Object.freeze({ label: "Alt + 2", code: "Digit2", alt: true }),
    preset3: Object.freeze({ label: "Alt + 3", code: "Digit3", alt: true }),
    preset4: Object.freeze({ label: "Alt + 4", code: "Digit4", alt: true }),
    preset5: Object.freeze({ label: "Alt + 5", code: "Digit5", alt: true }),
    preset10: Object.freeze({ label: "Alt + 0", code: "Digit0", alt: true })
  });

  const PRESET_ACTION_RATES = Object.freeze({
    preset1: 1,
    preset2: 2,
    preset3: 3,
    preset4: 4,
    preset5: 5,
    preset10: 10
  });

  /**
   * Formats a playback rate for display (e.g. 2 → "2x", 1.5 → "1.5x")
   * @param {number} rate - The playback rate to format
   * @returns {string} Formatted rate string
   */
  const formatRate = (rate) => {
    const clamped = Math.min(
      MAX_PLAYBACK_RATE,
      Math.max(MIN_PLAYBACK_RATE, Math.round(Number(rate) / SPEED_STEP) * SPEED_STEP)
    );

    return `${String(clamped).replace(/\.?0+$/, "")}x`;
  };

  // Expose shared constants to globalThis for cross-script access
  globalThis.YSC_SPEED_STEP = SPEED_STEP;
  globalThis.YSC_MIN_PLAYBACK_RATE = MIN_PLAYBACK_RATE;
  globalThis.YSC_MAX_PLAYBACK_RATE = MAX_PLAYBACK_RATE;
  globalThis.YSC_STORAGE_KEYS = STORAGE_KEYS;
  globalThis.YSC_DEFAULT_SHORTCUTS = DEFAULT_SHORTCUTS;
  globalThis.YSC_PRESET_ACTION_RATES = PRESET_ACTION_RATES;
  globalThis.YSC_FORMAT_RATE = formatRate;
})();
