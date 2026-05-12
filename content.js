(() => {
  "use strict";

  const SCRIPT_INSTANCE_KEY = "__youtubeSpeedControllerLoaded";

  if (window[SCRIPT_INSTANCE_KEY]) {
    return;
  }

  window[SCRIPT_INSTANCE_KEY] = true;

  const STORAGE_KEY = "youtubeSpeedController.playbackRate";
  const EPSILON = 0.01;
  const SPEED_STEP = 0.25;
  const MIN_PLAYBACK_RATE = 0.25;
  const MAX_PLAYBACK_RATE = 10;
  const SPEEDS = Array.from(
    { length: Math.round((MAX_PLAYBACK_RATE - MIN_PLAYBACK_RATE) / SPEED_STEP) + 1 },
    (_, index) => Number((MIN_PLAYBACK_RATE + (index * SPEED_STEP)).toFixed(2))
  );

  let preferredRate = 1;
  let widget = null;
  let toast = null;
  let toastRateText = null;
  let activeVideo = null;
  let mutationTimer = 0;
  let saveTimer = 0;
  let toastTimer = 0;

  const getChromeStorage = () => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      return null;
    }

    return chrome.storage.local;
  };

  const roundToStep = (rate) => Number((Math.round(rate / SPEED_STEP) * SPEED_STEP).toFixed(2));

  const normalizePlaybackRate = (rate) => {
    const parsed = Number(rate);

    if (!Number.isFinite(parsed)) {
      return 1;
    }

    return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, roundToStep(parsed)));
  };

  const formatRate = (rate) => {
    const normalized = normalizePlaybackRate(rate);

    return `${String(normalized).replace(/\.?0+$/, "")}x`;
  };

  const readStoredRate = () => new Promise((resolve) => {
    const storage = getChromeStorage();

    if (!storage) {
      resolve(1);
      return;
    }

    storage.get(STORAGE_KEY, (result) => {
      if (chrome.runtime?.lastError) {
        resolve(1);
        return;
      }

      resolve(normalizePlaybackRate(result[STORAGE_KEY]));
    });
  });

  const savePreferredRate = (rate) => {
    const storage = getChromeStorage();

    if (!storage) {
      return;
    }

    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      storage.set({ [STORAGE_KEY]: normalizePlaybackRate(rate) });
    }, 100);
  };

  const getPlayer = () => document.querySelector(".html5-video-player");

  const getVideo = () => {
    const player = getPlayer();

    return player?.querySelector("video.html5-main-video")
      || document.querySelector("video.html5-main-video")
      || document.querySelector("video");
  };

  const showSpeedToast = (rate) => {
    const player = getPlayer();
    const parent = player || document.body;

    if (!parent) {
      return;
    }

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "ysc-speed-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");

      const label = document.createElement("span");
      label.className = "ysc-speed-toast-label";
      label.textContent = "Speed";

      toastRateText = document.createElement("span");
      toastRateText.className = "ysc-speed-toast-rate";

      toast.append(label, toastRateText);
    }

    if (toast.parentElement !== parent) {
      parent.append(toast);
    }

    toastRateText.textContent = formatRate(rate);
    toast.classList.add("ysc-speed-toast-visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast?.classList.remove("ysc-speed-toast-visible");
    }, 900);
  };

  const updateWidget = (rate = preferredRate) => {
    if (!widget) {
      return;
    }

    const displayRate = formatRate(rate);
    const rateButton = widget.querySelector(".ysc-speed-rate");

    rateButton.textContent = displayRate;
    rateButton.setAttribute("aria-label", `Current speed ${displayRate}. Click to increase.`);
    rateButton.title = `Playback speed ${displayRate}`;

    widget.querySelector(".ysc-speed-decrease").disabled = rate <= SPEEDS[0] + EPSILON;
    widget.querySelector(".ysc-speed-increase").disabled = rate >= SPEEDS[SPEEDS.length - 1] - EPSILON;
  };

  const applyRate = (rate, { persist = true, notify = false } = {}) => {
    const nextRate = normalizePlaybackRate(rate);
    const video = getVideo();
    const currentRate = normalizePlaybackRate(video?.playbackRate || preferredRate);
    const changed = Math.abs(currentRate - nextRate) > EPSILON;

    preferredRate = nextRate;

    if (video && changed) {
      video.playbackRate = nextRate;
    }

    updateWidget(nextRate);

    if (persist) {
      savePreferredRate(nextRate);
    }

    if (notify && changed) {
      showSpeedToast(nextRate);
    }

    return changed;
  };

  const getCurrentRate = () => normalizePlaybackRate(getVideo()?.playbackRate || preferredRate);

  const moveRate = (direction, options = {}) => {
    const currentRate = getCurrentRate();
    const nextRate = normalizePlaybackRate(currentRate + (direction * SPEED_STEP));

    return applyRate(nextRate, options);
  };

  const createButton = ({ className, text, label, title, onClick }) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = `ysc-speed-button ${className}`;
    button.textContent = text;
    button.setAttribute("aria-label", label);
    button.title = title;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });

    return button;
  };

  const createWidget = () => {
    const container = document.createElement("div");

    container.className = "ysc-speed-widget";
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "Playback speed controls");

    const decrease = createButton({
      className: "ysc-speed-decrease",
      text: "-",
      label: "Decrease playback speed",
      title: "Decrease playback speed",
      onClick: () => moveRate(-1, { notify: true })
    });

    const rate = createButton({
      className: "ysc-speed-rate",
      text: formatRate(preferredRate),
      label: `Current speed ${formatRate(preferredRate)}. Click to increase.`,
      title: `Playback speed ${formatRate(preferredRate)}`,
      onClick: () => moveRate(1, { notify: true })
    });

    const increase = createButton({
      className: "ysc-speed-increase",
      text: "+",
      label: "Increase playback speed",
      title: "Increase playback speed",
      onClick: () => moveRate(1, { notify: true })
    });

    container.append(decrease, rate, increase);

    for (const eventName of ["click", "dblclick", "mousedown", "pointerdown", "touchstart"]) {
      container.addEventListener(eventName, (event) => event.stopPropagation());
    }

    return container;
  };

  const isVisibleControl = (element) => {
    if (!element) {
      return false;
    }

    const style = window.getComputedStyle(element);

    return style.display !== "none" && style.visibility !== "hidden";
  };

  const placeWidget = () => {
    const player = getPlayer();
    const rightControls = player?.querySelector(".ytp-right-controls");

    if (!rightControls) {
      return;
    }

    if (!widget) {
      widget = createWidget();
    }

    const captionsButton = rightControls.querySelector(".ytp-subtitles-button");
    const settingsButton = rightControls.querySelector(".ytp-settings-button");

    if (captionsButton && isVisibleControl(captionsButton)) {
      if (captionsButton.nextElementSibling !== widget) {
        captionsButton.insertAdjacentElement("afterend", widget);
      }
    } else if (settingsButton) {
      if (settingsButton.previousElementSibling !== widget) {
        rightControls.insertBefore(widget, settingsButton);
      }
    } else {
      if (widget.parentElement !== rightControls || widget.nextElementSibling) {
        rightControls.append(widget);
      }
    }

    updateWidget(getCurrentRate());
  };

  const handleRateChange = () => {
    const video = getVideo();

    if (!video) {
      return;
    }

    const changedRate = normalizePlaybackRate(video.playbackRate);
    const changed = Math.abs(preferredRate - changedRate) > EPSILON;

    preferredRate = changedRate;
    updateWidget(changedRate);
    savePreferredRate(changedRate);

    if (changed) {
      showSpeedToast(changedRate);
    }
  };

  const enforcePreferredRate = () => {
    applyRate(preferredRate, { persist: false });
  };

  const watchVideo = () => {
    const video = getVideo();

    if (!video || video === activeVideo) {
      return;
    }

    if (activeVideo) {
      activeVideo.removeEventListener("ratechange", handleRateChange);
      activeVideo.removeEventListener("loadedmetadata", enforcePreferredRate);
      activeVideo.removeEventListener("canplay", enforcePreferredRate);
      activeVideo.removeEventListener("play", enforcePreferredRate);
    }

    activeVideo = video;
    activeVideo.addEventListener("ratechange", handleRateChange);
    activeVideo.addEventListener("loadedmetadata", enforcePreferredRate);
    activeVideo.addEventListener("canplay", enforcePreferredRate);
    activeVideo.addEventListener("play", enforcePreferredRate);

    enforcePreferredRate();
  };

  const refresh = () => {
    placeWidget();
    watchVideo();
  };

  const isEditableElement = (element) => {
    if (!(element instanceof Element)) {
      return false;
    }

    const textInputSelector = [
      "input",
      "textarea",
      "select",
      "[role='textbox']",
      "[role='searchbox']"
    ].join(",");

    return element.isContentEditable
      || element.matches(textInputSelector)
      || Boolean(element.closest(textInputSelector));
  };

  const isTypingContext = (event) => {
    if (isEditableElement(document.activeElement)) {
      return true;
    }

    return event.composedPath().some(isEditableElement);
  };

  const getShortcutDirection = (event) => {
    if (!event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) {
      return 0;
    }

    if (event.code === "Period" || event.key === ">") {
      return 1;
    }

    if (event.code === "Comma" || event.key === "<") {
      return -1;
    }

    return 0;
  };

  const handleKeyboardShortcut = (event) => {
    const direction = getShortcutDirection(event);

    if (!direction || isTypingContext(event) || !getVideo()) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    moveRate(direction, { notify: true });
  };

  const scheduleRefresh = () => {
    if (mutationTimer) {
      return;
    }

    mutationTimer = window.setTimeout(() => {
      mutationTimer = 0;
      refresh();
    }, 250);
  };

  const start = async () => {
    preferredRate = await readStoredRate();
    refresh();

    window.addEventListener("keydown", handleKeyboardShortcut, true);
    document.addEventListener("yt-navigate-finish", scheduleRefresh);
    document.addEventListener("yt-player-updated", scheduleRefresh);

    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  };

  start();
})();
