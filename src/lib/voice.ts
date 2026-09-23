"use client";

let cachedVoice: SpeechSynthesisVoice | null = null;
let ready = false;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const priority = [
    (v: SpeechSynthesisVoice) => /en-NG/i.test(v.lang),
    (v: SpeechSynthesisVoice) => /en-GB/i.test(v.lang),
    (v: SpeechSynthesisVoice) => /en-ZA/i.test(v.lang),
    (v: SpeechSynthesisVoice) => /english.*(uk|british)/i.test(v.name),
    (v: SpeechSynthesisVoice) => /^en/i.test(v.lang),
  ];
  for (const pred of priority) {
    const v = voices.find(pred);
    if (v) return v;
  }
  return voices[0] ?? null;
}

function ensureReady() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (ready) return;
  ready = true;
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = pickVoice(); };
  cachedVoice = pickVoice();
}

export function speak(text: string, opts: { muted?: boolean; interrupt?: boolean } = {}) {
  if (opts.muted) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  ensureReady();
  if (opts.interrupt) window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.volume = 1.0;
  if (cachedVoice) utter.voice = cachedVoice;
  window.speechSynthesis.speak(utter);
}

export function cancelSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function describeManeuver(step: {
  maneuver: { type: string; modifier?: string };
  name?: string;
}) {
  const t = step.maneuver.type;
  const m = step.maneuver.modifier;
  const road = step.name && step.name.length > 0 ? ` onto ${step.name}` : "";
  if (t === "arrive") return "You have arrived at your destination.";
  if (t === "depart") return `Head ${m ?? "straight"}${road}.`;
  if (t === "roundabout" || t === "rotary") return `At the roundabout, take the exit${road}.`;
  if (t === "merge") return `Merge${road}.`;
  if (t === "fork") return `Keep ${m ?? "ahead"}${road}.`;
  if (t === "on ramp") return `Take the ramp${road}.`;
  if (t === "off ramp") return `Take the exit${road}.`;
  if (t === "end of road") return `At the end of the road, turn ${m ?? "left"}${road}.`;
  if (t === "continue") return `Continue ${m ?? "straight"}${road}.`;
  if (t === "turn") return `Turn ${m ?? "right"}${road}.`;
  return `Continue${road}.`;
}
