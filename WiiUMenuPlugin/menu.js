/* Wii U menu renderer injected into Steam's Big Picture page.
   Runs as plain JS — no React, no external files except the bundled font. */
(() => {
  const PAGE_SIZE = 15;
  const COLS = 5;
  const ROWS = 3;
  const VERSION = "1.3.0";

  const CSS = String.raw`
@font-face {
  font-family: "WiiU Rounded";
  src: url("/themes_custom/WiiUMenu/fonts/Nunito-Cyrillic.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}
@font-face {
  font-family: "WiiU Rounded";
  src: url("/themes_custom/WiiUMenu/fonts/Nunito-Latin.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
    U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212,
    U+2215, U+FEFF, U+FFFD;
}

body.wiiu-menu-open #popup_target,
body.wiiu-menu-open #root {
  visibility: hidden !important;
}

.wiiu-root {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2147483000;
  overflow: hidden;
  color: #3f4d5a;
  font-family: "WiiU Rounded", "Nunito", "Segoe UI", system-ui, sans-serif;
  background:
    radial-gradient(1200px 680px at 12% -10%, #ffffff 0%, rgba(255, 255, 255, 0) 62%),
    radial-gradient(900px 520px at 105% 108%, rgba(53, 200, 240, 0.24) 0%, rgba(53, 200, 240, 0) 62%),
    radial-gradient(700px 420px at 50% 115%, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0) 70%),
    linear-gradient(180deg, #f4f9fc 0%, #e7f0f6 54%, #d6e5ee 100%);
  user-select: none;
  cursor: default;
  --wiiu-accent: #00a2e8;
  --wiiu-accent-soft: #35c8f0;
  --wiiu-deep: #0079c1;
  --wiiu-ink: #3f4d5a;
  --wiiu-top: clamp(54px, 11.5vh, 92px);
  --wiiu-foot: clamp(92px, 17.5vh, 158px);
  --wiiu-tile: clamp(86px, 20vh, 196px);
  --wiiu-gap: clamp(7px, 2.1vh, 22px);
}

.wiiu-root *,
.wiiu-root *::before,
.wiiu-root *::after { box-sizing: border-box; }

.wiiu-root::before {
  content: "";
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  pointer-events: none;
  opacity: 0.5;
  background-image:
    repeating-linear-gradient(90deg, rgba(255,255,255,.42) 0 1px, transparent 1px 132px),
    repeating-linear-gradient(0deg, rgba(255,255,255,.42) 0 1px, transparent 1px 132px);
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,.7), transparent 82%);
  mask-image: linear-gradient(180deg, rgba(0,0,0,.7), transparent 82%);
}

.wiiu-root::after {
  content: "";
  position: absolute;
  top: -180px;
  left: -140px;
  width: 620px;
  height: 620px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle, rgba(255,255,255,.72) 0%, rgba(255,255,255,0) 68%);
}

.wiiu-top {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: var(--wiiu-top);
  display: flex;
  align-items: center;
  padding: 0 clamp(18px, 4vw, 34px);
  z-index: 5;
  pointer-events: none;
}

.wiiu-brand {
  display: flex;
  align-items: center;
  gap: clamp(6px, 1.2vh, 10px);
  font-size: clamp(18px, 3.1vh, 25px);
  font-weight: 800;
  color: #8b98a2;
  text-shadow: 0 1px 0 rgba(255,255,255,.9);
}

.wiiu-brand-mark {
  width: clamp(28px, 4.8vh, 38px);
  height: clamp(28px, 4.8vh, 38px);
  border-radius: clamp(8px, 1.5vh, 12px);
  display: grid;
  place-items: center;
  background: linear-gradient(165deg, #ffffff, #e4eef5);
  border: 1px solid rgba(255,255,255,.95);
  box-shadow: 0 4px 10px rgba(70,110,140,.18), inset 0 1px 0 #fff;
  color: var(--wiiu-accent);
  font-size: clamp(16px, 2.9vh, 23px);
  font-weight: 900;
}

.wiiu-title-pill {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: 52vw;
  padding: clamp(6px, 1.2vh, 10px) clamp(12px, 2.6vw, 26px) clamp(7px, 1.35vh, 11px);
  border-radius: 999px;
  border: 1px solid rgba(210,228,238,.95);
  background: rgba(255,255,255,.92);
  box-shadow: 0 8px 20px rgba(70,110,140,.16), inset 0 1px 0 #fff;
  font-size: clamp(11px, 1.9vh, 15px);
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.wiiu-page-counter {
  margin-left: auto;
  padding: clamp(4px, 0.9vh, 7px) clamp(8px, 1.8vw, 14px);
  border-radius: 999px;
  background: rgba(255,255,255,.5);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9);
  font-size: clamp(10px, 1.6vh, 13px);
  font-weight: 800;
  letter-spacing: .08em;
  color: rgba(63,77,90,.55);
}

.wiiu-stage {
  position: absolute;
  top: var(--wiiu-top);
  right: 0;
  bottom: var(--wiiu-foot);
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.wiiu-grid {
  display: grid;
  grid-template-columns: repeat(5, var(--wiiu-tile));
  grid-auto-rows: var(--wiiu-tile);
  gap: var(--wiiu-gap);
  outline: none;
  animation: wiiu-page-in .22s cubic-bezier(.2,.8,.2,1);
}

@keyframes wiiu-page-in {
  from { opacity: 0; transform: translateX(16px) scale(.992); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

.wiiu-tile {
  position: relative;
  width: var(--wiiu-tile);
  height: var(--wiiu-tile);
  padding: clamp(3px, 0.7vh, 6px);
  border: 1px solid rgba(255,255,255,.95);
  border-radius: clamp(12px, 2.6vh, 22px);
  background: linear-gradient(165deg, #ffffff 0%, #e7f0f6 100%);
  box-shadow:
    0 10px 20px rgba(70,110,140,.18),
    0 2px 4px rgba(70,110,140,.1),
    inset 0 1px 0 #fff,
    inset 0 -1px 0 rgba(160,185,200,.28);
  overflow: hidden;
  outline: none;
  transition: transform .16s ease, box-shadow .16s ease;
  cursor: pointer;
}

.wiiu-tile img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: calc(clamp(12px, 2.6vh, 22px) - 5px);
  pointer-events: none;
}

.wiiu-tile-fallback {
  width: 100%;
  height: 100%;
  border-radius: calc(clamp(12px, 2.6vh, 22px) - 5px);
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 20%, rgba(255,255,255,.95), rgba(255,255,255,0) 55%),
    linear-gradient(160deg, #bfe6f6 0%, #7fc9e4 100%);
  color: rgba(255,255,255,.95);
  font-size: clamp(22px, 4.6vh, 34px);
  font-weight: 900;
  letter-spacing: .04em;
  text-shadow: 0 2px 6px rgba(0,90,130,.28);
  pointer-events: none;
}

.wiiu-tile::after {
  content: "";
  position: absolute;
  top: clamp(3px, 0.7vh, 6px); right: clamp(3px, 0.7vh, 6px);
  bottom: clamp(3px, 0.7vh, 6px); left: clamp(3px, 0.7vh, 6px);
  border-radius: calc(clamp(12px, 2.6vh, 22px) - 5px);
  pointer-events: none;
  background: linear-gradient(160deg, rgba(255,255,255,.48) 0%, rgba(255,255,255,.12) 24%, rgba(255,255,255,0) 44%);
}

.wiiu-tile.gpfocus,
.wiiu-tile:hover {
  transform: translateY(-6px) scale(1.045);
  box-shadow:
    0 0 0 3px var(--wiiu-accent),
    0 0 0 10px rgba(53,200,240,.24),
    0 20px 34px rgba(70,110,140,.3),
    inset 0 1px 0 #fff;
  z-index: 4;
}

.wiiu-tile.wiiu-placeholder {
  pointer-events: none;
  background: linear-gradient(165deg, rgba(255,255,255,.4), rgba(214,228,237,.26));
  border-color: rgba(255,255,255,.5);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
}
.wiiu-tile.wiiu-placeholder::after { display: none; }

.wiiu-tile-name {
  position: absolute;
  left: clamp(5px, 1.2vh, 10px); right: clamp(5px, 1.2vh, 10px); bottom: clamp(5px, 1.1vh, 9px);
  z-index: 3;
  padding: clamp(3px, 0.8vh, 6px) clamp(5px, 0.9vw, 8px);
  border-radius: 9px;
  background: linear-gradient(180deg, rgba(20,32,42,0) 0%, rgba(20,32,42,.72) 100%);
  color: #fff;
  font-size: clamp(8px, 1.35vh, 11px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: .02em;
  text-align: left;
  opacity: 0;
  transform: translateY(3px);
  transition: opacity .15s ease, transform .15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wiiu-tile.gpfocus .wiiu-tile-name,
.wiiu-tile:hover .wiiu-tile-name { opacity: 1; transform: translateY(0); }

.wiiu-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: clamp(36px, 6.2vh, 52px);
  height: clamp(52px, 9vh, 76px);
  border: 1px solid rgba(255,255,255,.9);
  border-radius: clamp(11px, 2.2vh, 17px);
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.55);
  box-shadow: 0 8px 18px rgba(70,110,140,.16), inset 0 1px 0 #fff;
  color: var(--wiiu-deep);
  font-size: clamp(20px, 3.6vh, 30px);
  font-weight: 800;
  cursor: pointer;
  outline: none;
  transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
}
.wiiu-arrow.left { left: clamp(12px, 3.5vw, 30px); }
.wiiu-arrow.right { right: clamp(12px, 3.5vw, 30px); }
.wiiu-arrow:hover,
.wiiu-arrow.gpfocus {
  background: #fff;
  transform: translateY(-50%) scale(1.06);
  box-shadow: 0 0 0 3px var(--wiiu-accent), 0 0 0 9px rgba(53,200,240,.22), 0 12px 24px rgba(70,110,140,.22);
}

.wiiu-footer {
  position: absolute;
  right: 0; bottom: 0; left: 0;
  height: var(--wiiu-foot);
  display: flex;
  align-items: center;
  padding: clamp(14px, 3.4vh, 26px) clamp(18px, 4.4vw, 38px) 0;
  z-index: 6;
  background: linear-gradient(180deg, #ffffff 0%, #f1f8fb 100%);
  box-shadow: 0 -12px 32px rgba(70,110,140,.18), inset 0 2px 0 var(--wiiu-accent-soft);
}

.wiiu-footer-left { display: flex; align-items: center; gap: clamp(8px, 1.8vh, 16px); min-width: clamp(140px, 18vw, 230px); }

.wiiu-logo {
  padding: clamp(2px, 0.5vh, 4px) clamp(7px, 1.5vw, 14px) clamp(3px, 0.6vh, 5px);
  border: 2px solid rgba(210,226,236,.95);
  border-radius: clamp(8px, 1.6vh, 13px);
  background: #fff;
  box-shadow: 0 3px 8px rgba(70,110,140,.16), inset 0 1px 0 #fff;
  color: #8b98a2;
  font-size: clamp(16px, 2.9vh, 23px);
  font-weight: 800;
  line-height: 1.2;
}

.wiiu-dots { display: flex; align-items: center; gap: clamp(3px, 0.7vh, 6px); }
.wiiu-dot { width: clamp(5px, 1vh, 8px); height: clamp(5px, 1vh, 8px); border-radius: 50%; background: rgba(63,77,90,.18); transition: background .2s ease, transform .2s ease; }
.wiiu-dot.active { background: var(--wiiu-accent); transform: scale(1.25); }

.wiiu-clock {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}
.wiiu-clock-time { font-size: clamp(26px, 5.5vh, 52px); font-weight: 700; line-height: 1.02; letter-spacing: .01em; font-variant-numeric: tabular-nums; color: var(--wiiu-ink); }
.wiiu-clock-date { margin-top: clamp(1px, 0.5vh, 4px); font-size: clamp(11px, 2vh, 16px); font-weight: 700; letter-spacing: .01em; color: rgba(63,77,90,.55); }

.wiiu-status {
  margin-top: clamp(2px, 0.6vh, 5px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 1.4vw, 14px);
  min-height: clamp(11px, 2.1vh, 15px);
  color: rgba(63,77,90,.7);
  font-size: clamp(9px, 1.5vh, 12px);
  font-weight: 800;
  letter-spacing: .03em;
}

.wiiu-battery { display: flex; align-items: center; gap: 4px; }
.wiiu-battery-shell {
  position: relative;
  width: clamp(20px, 3.2vh, 28px);
  height: clamp(9px, 1.6vh, 12px);
  border: 1.5px solid currentColor;
  border-radius: 3px;
  padding: 1px;
  box-sizing: border-box;
}
.wiiu-battery-shell::after {
  content: "";
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 40%;
  border-radius: 0 1px 1px 0;
  background: currentColor;
}
.wiiu-battery-fill {
  display: block;
  height: 100%;
  width: 0%;
  border-radius: 1px;
  background: currentColor;
  transition: width .35s ease, background-color .35s ease;
}
.wiiu-battery.charging .wiiu-battery-fill { background: var(--wiiu-accent); }
.wiiu-battery.low .wiiu-battery-fill { background: #f0a23c; }
.wiiu-battery.critical .wiiu-battery-fill { background: #e35d5d; }

.wiiu-wifi {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: clamp(10px, 1.8vh, 14px);
  transition: opacity .2s ease;
}
.wiiu-wifi i {
  display: block;
  width: clamp(2px, 0.5vh, 3px);
  border-radius: 1px;
  background: rgba(63,77,90,.2);
  transition: background-color .2s ease;
}
.wiiu-wifi i:nth-child(1) { height: 28%; }
.wiiu-wifi i:nth-child(2) { height: 48%; }
.wiiu-wifi i:nth-child(3) { height: 72%; }
.wiiu-wifi i:nth-child(4) { height: 100%; }
.wiiu-wifi i.on { background: var(--wiiu-accent); }

.wiiu-volume {
  margin-top: clamp(1px, 0.4vh, 3px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: rgba(63,77,90,.55);
  transition: color .2s ease;
}
.wiiu-volume svg {
  width: clamp(10px, 1.8vh, 14px);
  height: clamp(10px, 1.8vh, 14px);
  flex: none;
}
.wiiu-volume-track {
  width: clamp(70px, 12vh, 110px);
  height: clamp(4px, 0.9vh, 6px);
  border-radius: 999px;
  background: rgba(63,77,90,.14);
  overflow: hidden;
}
.wiiu-volume-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--wiiu-accent-soft), var(--wiiu-accent));
  transition: width .2s ease, background .2s ease;
}
.wiiu-volume.muted { color: rgba(63,77,90,.28); }
.wiiu-volume.muted .wiiu-volume-fill { background: rgba(63,77,90,.28); }

.wiiu-footer-right { margin-left: auto; display: flex; align-items: center; gap: clamp(8px, 1.6vw, 14px); }

.wiiu-hint {
  font-size: clamp(7px, 1.3vh, 11px);
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: rgba(63,77,90,.42);
  text-align: right;
  line-height: 1.4;
}

.wiiu-mail, .wiiu-desktop {
  width: clamp(36px, 6.4vh, 54px);
  height: clamp(36px, 6.4vh, 54px);
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 2px solid rgba(53,200,240,.55);
  background: linear-gradient(180deg, #ffffff 0%, #e9f3f8 100%);
  box-shadow: 0 4px 12px rgba(70,110,140,.18), inset 0 1px 0 #fff;
  color: var(--wiiu-ink);
  cursor: pointer;
  outline: none;
}
.wiiu-mail svg, .wiiu-desktop svg { width: 48%; height: 48%; }
.wiiu-mail:hover, .wiiu-mail.gpfocus,
.wiiu-desktop:hover, .wiiu-desktop.gpfocus {
  box-shadow: 0 0 0 3px var(--wiiu-accent), 0 0 0 8px rgba(53,200,240,.2), 0 6px 16px rgba(70,110,140,.22);
}

.wiiu-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  padding: 30px;
}
.wiiu-state-title { font-size: clamp(18px, 3.2vh, 24px); font-weight: 800; color: var(--wiiu-ink); }
.wiiu-state-text { font-size: clamp(11px, 2vh, 14px); font-weight: 600; color: rgba(63,77,90,.55); max-width: 420px; line-height: 1.45; }
.wiiu-spinner {
  width: clamp(30px, 5.5vh, 46px); height: clamp(30px, 5.5vh, 46px);
  border-radius: 50%;
  border: 4px solid rgba(0,162,232,.18);
  border-top-color: var(--wiiu-accent);
  animation: wiiu-spin .9s linear infinite;
}
@keyframes wiiu-spin { to { transform: rotate(360deg); } }
`;

  const state = {
    apps: [],
    page: 0,
    selected: 0,
    sounds: true,
    visible: false,
    closed: false,
    status: {
      battery: { level: 0, charging: false },
      wifi: { level: 0, connected: false },
      volume: { volume: 0, muted: false },
    },
  };

  let root = null;
  let grid = null;
  let titlePill = null;
  let pageCounter = null;
  let dotsEl = null;
  let clockTime = null;
  let clockDate = null;
  let batteryEl = null;
  let batteryFill = null;
  let batteryPct = null;
  let wifiEl = null;
  let volumeEl = null;
  let volumeFill = null;
  let clockTimer = null;
  let heldTimer = null;
  let inputRegistration = null;
  let keyHandler = null;
  const heldCodes = new Set();
  const heldButtons = new Set();
  const DIR_CODES = {
    4: "up",
    5: "right",
    6: "down",
    7: "left",
    20: "up",
    21: "down",
    22: "left",
    23: "right",
  };
  const NAV_REPEAT = 220;
  const HOLD_DELAY = 600;
  const RELEASE_DEBOUNCE = 250;
  let heldDirection = null;
  let heldDirectionSince = 0;
  let lastNavAt = 0;
  let lastReleaseAt = 0;
  let lastReleaseDirection = null;
  let lastPageAt = 0;

  /* ------------------------------------------------------------- sounds */
  let audioCtx = null;
  let mouseActive = false;
  function getAudio() {
    try {
      if (!audioCtx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        audioCtx = new Ctor();
      }
      if (audioCtx.state === "suspended") void audioCtx.resume();
      return audioCtx;
    } catch (e) {
      return null;
    }
  }
  function tone(freq, at, duration, gain, type, to) {
    const audio = getAudio();
    if (!audio) return;
    try {
      const start = audio.currentTime + at;
      const osc = audio.createOscillator();
      const amp = audio.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, start);
      if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + duration);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(amp);
      amp.connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch (e) {}
  }
  function pluck(freq, at, duration, gain) {
    // marimba-like body: fundamental + soft octave
    tone(freq, at, duration, gain, "sine", freq * 0.996);
    tone(freq * 2, at, duration * 0.5, gain * 0.3, "triangle");
  }

  function noiseSweep(at, duration, gain, fromFreq, toFreq) {
    const audio = getAudio();
    if (!audio) return;
    try {
      const length = Math.max(1, Math.floor(audio.sampleRate * duration));
      const buffer = audio.createBuffer(1, length, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
      }
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const filter = audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 0.9;
      const start = audio.currentTime + at;
      filter.frequency.setValueAtTime(fromFreq, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, toFreq), start + duration);
      const amp = audio.createGain();
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter);
      filter.connect(amp);
      amp.connect(audio.destination);
      source.start(start);
      source.stop(start + duration + 0.02);
    } catch (e) {}
  }

  function sound(name) {
    if (!state.sounds) return;
    switch (name) {
      case "move":
        // soft channel tick: tiny click + short marimba note
        tone(2000, 0, .012, .007, "triangle", 1600);
        pluck(880, 0, .045, .02);
        break;
      case "select":
        // two-note confirmation (D5 -> A5)
        pluck(587.33, 0, .1, .028);
        pluck(880, .055, .14, .026);
        break;
      case "back":
        // descending G4 -> D4
        pluck(392, 0, .1, .028);
        pluck(293.66, .06, .13, .022);
        break;
      case "page":
        // airy page swipe with a small high confirmation
        noiseSweep(0, .16, .014, 700, 1800);
        pluck(659.25, .02, .05, .012);
        break;
      case "open":
        // rising C5-E5-G5
        pluck(523.25, 0, .09, .024);
        pluck(659.25, .06, .1, .022);
        pluck(783.99, .12, .14, .02);
        break;
      case "launch": {
        // five-step launch flourish
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          pluck(freq, i * .065, i === notes.length - 1 ? .28 : .12, i === notes.length - 1 ? .032 : .024);
        });
        pluck(261.63, .2, .3, .012);
        break;
      }
    }
  }

  /* ------------------------------------------------------------- helpers */
  function pages() {
    return Math.max(1, Math.ceil(state.apps.length / PAGE_SIZE));
  }
  function currentPageApps() {
    return state.apps.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
  }
  function currentApp() {
    return currentPageApps()[state.selected] || null;
  }
  function initials(name) {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0] ? w[0].toUpperCase() : "")
      .join("");
  }

  function injectStyle() {
    let style = document.getElementById("wiiu-menu-css");
    if (!style) {
      style = document.createElement("style");
      style.id = "wiiu-menu-css";
      document.head.appendChild(style);
    }
    style.textContent = CSS;
  }

  function buildRoot() {
    const el = document.createElement("div");
    el.id = "wiiu-menu-root";
    el.className = "wiiu-root";
    el.innerHTML = `
      <div class="wiiu-top">
        <div class="wiiu-brand"><span class="wiiu-brand-mark">U</span>Wii U</div>
        <div class="wiiu-title-pill">Wii U</div>
        <div class="wiiu-page-counter">1 / 1</div>
      </div>
      <div class="wiiu-stage">
        <div class="wiiu-arrow left" role="button" aria-label="Предыдущая страница">‹</div>
        <div class="wiiu-grid"></div>
        <div class="wiiu-arrow right" role="button" aria-label="Следующая страница">›</div>
      </div>
      <div class="wiiu-footer">
        <div class="wiiu-footer-left">
          <div class="wiiu-logo">Wii U</div>
          <div class="wiiu-dots"></div>
        </div>
        <div class="wiiu-clock">
          <div class="wiiu-clock-time">--:--</div>
          <div class="wiiu-clock-date"></div>
          <div class="wiiu-status">
            <div class="wiiu-battery" aria-label="Батарея">
              <span class="wiiu-battery-shell"><span class="wiiu-battery-fill"></span></span>
              <span class="wiiu-battery-pct">--%</span>
            </div>
            <div class="wiiu-wifi" aria-label="Wi-Fi">
              <i></i><i></i><i></i><i></i>
            </div>
          </div>
          <div class="wiiu-volume" aria-label="Громкость">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z"></path>
              <path d="M16.5 8.5a5 5 0 0 1 0 7"></path>
              <path d="M19 6a8.5 8.5 0 0 1 0 12"></path>
            </svg>
            <div class="wiiu-volume-track"><div class="wiiu-volume-fill"></div></div>
          </div>
        </div>
        <div class="wiiu-footer-right">
          <div class="wiiu-hint">A — запуск · B — Steam<br>L1 / R1 — страницы</div>
          <div class="wiiu-desktop" role="button" aria-label="Рабочий стол">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2.5" y="4" width="19" height="13" rx="2"></rect>
              <path d="M8 21h8"></path>
              <path d="M12 17v4"></path>
            </svg>
          </div>
          <div class="wiiu-mail" role="button" aria-label="Меню Steam">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2.5"></rect>
              <path d="M3.5 7l8.5 6.5L20.5 7"></path>
            </svg>
          </div>
        </div>
      </div>`;
    return el;
  }

  function updateClock() {
    if (!clockTime || !clockDate) return;
    const now = new Date();
    clockTime.textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const day = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    const weekday = now.toLocaleDateString("ru-RU", { weekday: "long" });
    clockDate.textContent = `${day}, ${weekday}`;
  }

  function renderStatus() {
    const battery = state.status.battery || {};
    const level = Math.max(0, Math.min(100, Number(battery.level) || 0));
    if (batteryFill) batteryFill.style.width = `${level}%`;
    if (batteryPct) batteryPct.textContent = `${level}%${battery.charging ? " ⚡" : ""}`;
    if (batteryEl) {
      batteryEl.classList.toggle("charging", !!battery.charging);
      batteryEl.classList.toggle("low", level <= 20 && !battery.charging);
      batteryEl.classList.toggle("critical", level <= 10 && !battery.charging);
    }

    const wifi = state.status.wifi || {};
    const bars = Math.max(0, Math.min(4, Number(wifi.level) || 0));
    if (wifiEl) {
      Array.from(wifiEl.querySelectorAll("i")).forEach((bar, index) => {
        bar.classList.toggle("on", index < bars);
      });
      wifiEl.style.opacity = wifi.connected === false ? "0.45" : "1";
    }

    const volume = state.status.volume || {};
    const volumeValue = Math.max(0, Math.min(100, Number(volume.volume) || 0));
    if (volumeFill) volumeFill.style.width = `${volume.muted ? 0 : volumeValue}%`;
    if (volumeEl) volumeEl.classList.toggle("muted", !!volume.muted);
  }

  function setStatus(status) {
    if (!status || typeof status !== "object") return;
    state.status = {
      battery: { ...(state.status.battery || {}), ...(status.battery || {}) },
      wifi: { ...(state.status.wifi || {}), ...(status.wifi || {}) },
      volume: { ...(state.status.volume || {}), ...(status.volume || {}) },
    };
    renderStatus();
  }

  function updateFocus() {
    const list = currentPageApps();
    if (state.selected >= list.length) state.selected = Math.max(0, list.length - 1);
    const tiles = grid ? Array.from(grid.querySelectorAll(".wiiu-tile:not(.wiiu-placeholder)")) : [];
    tiles.forEach((tile, i) => tile.classList.toggle("gpfocus", i === state.selected));
    const app = list[state.selected];
    if (titlePill) titlePill.textContent = app ? app.name : "Wii U";
    if (pageCounter) pageCounter.textContent = `${state.page + 1} / ${pages()}`;
    if (dotsEl) {
      const count = Math.min(pages(), 9);
      dotsEl.innerHTML = "";
      for (let i = 0; i < count; i++) {
        const dot = document.createElement("span");
        dot.className = "wiiu-dot" + (i === state.page ? " active" : "");
        dotsEl.appendChild(dot);
      }
    }
  }

  function render() {
    if (!grid) return;
    const totalPages = pages();
    if (state.page >= totalPages) state.page = totalPages - 1;
    if (state.page < 0) state.page = 0;

    const list = currentPageApps();
    if (state.selected >= list.length) state.selected = Math.max(0, list.length - 1);

    grid.innerHTML = "";
    grid.style.animation = "none";
    void grid.offsetWidth;
    grid.style.animation = "";

    list.forEach((app, index) => {
      const tile = document.createElement("div");
      tile.className = "wiiu-tile";
      tile.dataset.appid = String(app.appid);
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", app.name);

      const name = document.createElement("span");
      name.className = "wiiu-tile-name";
      name.textContent = app.name;

      let stage = 0;
      const images = Array.isArray(app.images) && app.images.length
        ? app.images.slice()
        : [app.header, app.art].filter(Boolean);
      if (images.length) {
        const img = document.createElement("img");
        img.alt = "";
        img.draggable = false;
        img.loading = "lazy";
        img.src = images[0];
        img.onerror = () => {
          stage += 1;
          if (stage < images.length) {
            img.src = images[stage];
            return;
          }
          img.style.display = "none";
          if (!tile.querySelector(".wiiu-tile-fallback")) {
            const fb = document.createElement("div");
            fb.className = "wiiu-tile-fallback";
            fb.textContent = initials(app.name) || "W";
            tile.insertBefore(fb, name);
          }
        };
        tile.appendChild(img);
      } else {
        const fb = document.createElement("div");
        fb.className = "wiiu-tile-fallback";
        fb.textContent = initials(app.name) || "W";
        tile.appendChild(fb);
      }

      tile.appendChild(name);

      tile.addEventListener("mouseenter", () => {
        if (mouseActive) select(index, false);
      });
      tile.addEventListener("click", () => {
        select(index, false);
        launchSelected();
      });
      grid.appendChild(tile);
    });

    for (let i = list.length; i < PAGE_SIZE; i++) {
      const ph = document.createElement("div");
      ph.className = "wiiu-tile wiiu-placeholder";
      grid.appendChild(ph);
    }

    const arrows = root ? root.querySelectorAll(".wiiu-arrow") : [];
    arrows.forEach((a) => {
      a.style.display = totalPages > 1 ? "grid" : "none";
    });

    updateFocus();
  }

  function select(index, playSound = true) {
    const list = currentPageApps();
    if (!list.length) return;
    const next = Math.max(0, Math.min(list.length - 1, index));
    if (next === state.selected && playSound) return;
    const changed = next !== state.selected;
    state.selected = next;
    updateFocus();
    if (changed && playSound) sound("move");
  }

  function move(dx, dy) {
    const list = currentPageApps();
    if (!list.length) return;
    const row = Math.floor(state.selected / COLS);
    const col = state.selected % COLS;
    let nextRow = Math.max(0, Math.min(ROWS - 1, row + dy));
    let nextCol = Math.max(0, Math.min(COLS - 1, col + dx));
    let next = nextRow * COLS + nextCol;
    if (next >= list.length) next = list.length - 1;
    select(next, true);
  }

  function goPage(delta) {
    const total = pages();
    if (total <= 1) return;
    sound("page");
    state.page = (state.page + delta + total) % total;
    state.selected = 0;
    render();
  }

  function launchSelected() {
    const app = currentApp();
    if (!app) return;
    sound("launch");
    if (titlePill) titlePill.textContent = `Запуск: ${app.name}`;
    window.__WIIU_ACTION__ = { type: "launch", appid: app.appid, ts: Date.now() };
  }

  function openSteamMenu() {
    sound("select");
    window.__WIIU_ACTION__ = { type: "steam_menu", ts: Date.now() };
  }

  function switchDesktop() {
    sound("select");
    window.__WIIU_ACTION__ = { type: "desktop", ts: Date.now() };
  }

  /* ------------------------------------------------------------- input */
  function directionFromHeld() {
    if (heldCodes.has(4) || heldCodes.has(20)) return "up";
    if (heldCodes.has(5) || heldCodes.has(23)) return "right";
    if (heldCodes.has(6) || heldCodes.has(21)) return "down";
    if (heldCodes.has(7) || heldCodes.has(22)) return "left";
    return null;
  }

  function moveDirection(direction) {
    if (direction === "up") move(0, -1);
    else if (direction === "right") move(1, 0);
    else if (direction === "down") move(0, 1);
    else if (direction === "left") move(-1, 0);
  }

  /* Keyboard / explicit one-shot movement. */
  function tryMove(direction) {
    const now = performance.now();
    if (now - lastNavAt < NAV_REPEAT) return false;
    lastNavAt = now;
    moveDirection(direction);
    return true;
  }

  /* Controller press: one move per physical press, with a debounce against
     the storm of press/release messages a stick flick can produce. */
  function pressDirection(direction) {
    const now = performance.now();
    const debounced =
      direction === lastReleaseDirection &&
      now - lastReleaseAt < RELEASE_DEBOUNCE;
    if (heldDirection !== direction) {
      heldDirection = direction;
      heldDirectionSince = now;
      if (!debounced && now - lastNavAt >= 100) {
        lastNavAt = now;
        moveDirection(direction);
      }
    }
  }

  function releaseDirection() {
    const previous = heldDirection;
    const next = directionFromHeld();
    if (next === heldDirection) return;
    heldDirection = next;
    heldDirectionSince = performance.now();
    if (!next && previous) {
      lastReleaseDirection = previous;
      lastReleaseAt = performance.now();
    }
  }

  function tryPage(delta) {
    const now = performance.now();
    if (now - lastPageAt < 260) return false;
    lastPageAt = now;
    goPage(delta);
    return true;
  }

  function tickHeld() {
    if (!heldDirection) return;
    const now = performance.now();
    if (now - heldDirectionSince < HOLD_DELAY) return;
    if (now - lastNavAt < NAV_REPEAT) return;
    lastNavAt = now;
    moveDirection(heldDirection);
  }

  function buttonDown(button) {
    if (window.__WIIU_INTERACTIVE__ === false) return;
    if (heldButtons.has(button)) return;
    heldButtons.add(button);

    const direction = DIR_CODES[button];
    if (direction) {
      heldCodes.add(button);
      pressDirection(direction);
      return;
    }

    switch (button) {
      case 0: launchSelected(); break;
      case 1: close(); break;
      case 30: tryPage(-1); break;
      case 31: tryPage(1); break;
    }
  }

  function buttonUp(button) {
    heldButtons.delete(button);
    if (DIR_CODES[button]) {
      heldCodes.delete(button);
      releaseDirection();
    }
  }

  function registerInput() {
    heldDirection = null;
    heldDirectionSince = 0;
    lastNavAt = 0;
    lastReleaseDirection = null;
    lastReleaseAt = 0;
    try {
      if (window.SteamClient && window.SteamClient.Input && window.SteamClient.Input.RegisterForControllerInputMessages) {
        inputRegistration = window.SteamClient.Input.RegisterForControllerInputMessages((events, maybeButton, maybePressed) => {
          if (Array.isArray(events)) {
            for (const event of events) {
              if (!event) continue;
              const button = Number(event.nA);
              const pressed = !!event.bS;
              if (Number.isFinite(button)) {
                if (pressed) buttonDown(button);
                else buttonUp(button);
              }
            }
          } else if (typeof maybeButton === "number") {
            if (maybePressed) buttonDown(maybeButton);
            else buttonUp(maybeButton);
          }
        });
      }
    } catch (e) {}

    heldTimer = window.setInterval(tickHeld, 50);

    keyHandler = (event) => {
      if (window.__WIIU_INTERACTIVE__ === false) return;
      const key = event.key;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "Escape", "PageUp", "PageDown"].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
      }
      switch (key) {
        case "ArrowLeft": tryMove("left"); break;
        case "ArrowRight": tryMove("right"); break;
        case "ArrowUp": tryMove("up"); break;
        case "ArrowDown": tryMove("down"); break;
        case "Enter": launchSelected(); break;
        case "Escape": close(); break;
        case "PageUp": tryPage(-1); break;
        case "PageDown": tryPage(1); break;
      }
    };
    window.addEventListener("keydown", keyHandler, true);
  }

  function unregisterInput() {
    try { if (inputRegistration && inputRegistration.unregister) inputRegistration.unregister(); } catch (e) {}
    inputRegistration = null;
    if (heldTimer) window.clearInterval(heldTimer);
    heldTimer = null;
    if (keyHandler) window.removeEventListener("keydown", keyHandler, true);
    keyHandler = null;
    heldButtons.clear();
    heldCodes.clear();
  }

  /* ------------------------------------------------------------- mount */
  function mount(apps, options) {
    try {
      if (root) unmount();
      state.apps = Array.isArray(apps) ? apps : [];
      state.page = 0;
      state.selected = 0;
      state.sounds = !options || options.sounds !== false;
      state.closed = false;
      state.visible = true;

      injectStyle();
      root = buildRoot();
      document.body.appendChild(root);
      document.body.classList.add("wiiu-menu-open");

      grid = root.querySelector(".wiiu-grid");
      titlePill = root.querySelector(".wiiu-title-pill");
      pageCounter = root.querySelector(".wiiu-page-counter");
      dotsEl = root.querySelector(".wiiu-dots");
      clockTime = root.querySelector(".wiiu-clock-time");
      clockDate = root.querySelector(".wiiu-clock-date");
      batteryEl = root.querySelector(".wiiu-battery");
      batteryFill = root.querySelector(".wiiu-battery-fill");
      batteryPct = root.querySelector(".wiiu-battery-pct");
      wifiEl = root.querySelector(".wiiu-wifi");
      volumeEl = root.querySelector(".wiiu-volume");
      volumeFill = root.querySelector(".wiiu-volume-fill");
      mouseActive = false;
      root.addEventListener("pointermove", () => {
        mouseActive = true;
      });

      root.querySelector(".wiiu-arrow.left").addEventListener("click", () => tryPage(-1));
      root.querySelector(".wiiu-arrow.right").addEventListener("click", () => tryPage(1));
      root.querySelector(".wiiu-mail").addEventListener("click", openSteamMenu);
      root.querySelector(".wiiu-desktop").addEventListener("click", switchDesktop);

      updateClock();
      clockTimer = window.setInterval(updateClock, 1000);
      renderStatus();

      render();
      registerInput();
      sound("open");
      return true;
    } catch (e) {
      try { if (root) root.remove(); } catch (err) {}
      root = null;
      document.body.classList.remove("wiiu-menu-open");
      state.visible = false;
      return false;
    }
  }

  function unmount() {
    try {
      unregisterInput();
      if (clockTimer) window.clearInterval(clockTimer);
      clockTimer = null;
      if (root) root.remove();
      root = null;
      grid = null;
      document.body.classList.remove("wiiu-menu-open");
      state.visible = false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function close() {
    sound("back");
    state.closed = true;
    unmount();
  }

  function setApps(apps) {
    state.apps = Array.isArray(apps) ? apps : [];
    if (state.visible) {
      if (state.page >= pages()) state.page = Math.max(0, pages() - 1);
      if (state.selected >= currentPageApps().length) state.selected = 0;
      render();
    }
  }

  function setSounds(value) {
    state.sounds = value !== false;
  }

  function getState() {
    return {
      version: VERSION,
      visible: state.visible,
      closed: state.closed,
      page: state.page,
      pages: pages(),
      apps: state.apps.length,
    };
  }

  window.__WIIU_MENU__ = {
    version: VERSION,
    mount,
    unmount,
    close,
    setApps,
    setSounds,
    getState,
    setStatus,
    get visible() { return state.visible; },
    get closed() { return state.closed; },
    set closed(value) { state.closed = !!value; },
  };

  window.__WIIU_DEBUG_BUTTON__ = (button, pressed) => {
    if (pressed) buttonDown(Number(button));
    else buttonUp(Number(button));
  };

  return true;
})();
