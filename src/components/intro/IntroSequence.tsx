import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Clock, DollarSign, Star } from "lucide-react";
import { createIntroSounds, type IntroSounds } from "@/src/audio/introAudio";
import { useTypewriter } from "@/src/hooks/useTypewriter";
import { INTRO_AVATARS } from "@/src/components/intro/introAvatars";
import { PixelAvatar } from "@/src/components/scene/PixelAvatar";
import { StreetSceneBackground } from "@/src/components/scene/StreetSceneBackground";
import { START_TIME } from "@/src/constants";
import { formatTime } from "@/src/utils";

export const INTRO_SEEN_KEY = "service-compris-intro-seen";

const SCREEN0_KEYS = [
  "screen0.p1",
  "screen0.p2",
  "screen0.p3",
  "screen0.p4",
  "screen0.p5",
] as const;

const DIFFICULTY_VALUES = [0, 1, 2, 3] as const;

export interface IntroSequenceProps {
  onComplete: (difficulty: number, playerName: string, avatarIndex: number) => void;
}

function readIntroSeen(): boolean {
  try {
    return !!localStorage.getItem(INTRO_SEEN_KEY);
  } catch {
    return false;
  }
}

function LanguageToggle() {
  const { t, i18n } = useTranslation(["common"]);
  const setLang = (lng: string) => {
    void i18n.changeLanguage(lng);
  };
  return (
    <div className="flex gap-1 rounded-xl border border-white/15 bg-black/40 p-1 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wide ${
          i18n.language.startsWith("en")
            ? "bg-[#e8e4dc] text-[#141414]"
            : "text-[#e8e4dc]/70 hover:bg-white/10"
        }`}
      >
        {t("common:language.en")}
      </button>
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wide ${
          i18n.language.startsWith("fr")
            ? "bg-[#e8e4dc] text-[#141414]"
            : "text-[#e8e4dc]/70 hover:bg-white/10"
        }`}
      >
        {t("common:language.fr")}
      </button>
    </div>
  );
}

export const IntroSequence: React.FC<IntroSequenceProps> = ({ onComplete }) => {
  const { t } = useTranslation("intro");
  const { t: tCommon } = useTranslation("common");

  const [screen, setScreen] = useState(0);
  const [playerNameInput, setPlayerNameInput] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [difficulty, setDifficulty] = useState(1);

  const [screen0Para, setScreen0Para] = useState(0);
  const [screen0ShowContinue, setScreen0ShowContinue] = useState(false);
  const audioStartedRef = useRef(false);
  const soundsRef = useRef<IntroSounds | null>(null);

  const [showSkip] = useState(readIntroSeen);

  const ensureSounds = useCallback(() => {
    if (!soundsRef.current) {
      soundsRef.current = createIntroSounds();
    }
    return soundsRef.current;
  }, []);

  useEffect(() => {
    return () => {
      const s = soundsRef.current;
      if (!s) return;
      s.rainLoop.stop();
      s.jazzLoop.stop();
    };
  }, []);

  const playTypeChar = useCallback(() => {
    soundsRef.current?.typewriterClick.play();
  }, []);

  const screen0Text = t(SCREEN0_KEYS[screen0Para]);
  const { displayed: screen0Displayed, done: screen0LineDone } = useTypewriter(
    screen0Text,
    40,
    playTypeChar,
  );

  useEffect(() => {
    if (screen !== 0 || !screen0LineDone) return;
    if (screen0Para < SCREEN0_KEYS.length - 1) {
      setScreen0Para((p) => p + 1);
    } else {
      setScreen0ShowContinue(true);
    }
  }, [screen, screen0LineDone, screen0Para]);

  const startAmbience = useCallback(() => {
    if (audioStartedRef.current) return;
    const s = ensureSounds();
    audioStartedRef.current = true;
    s.rainLoop.play();
    s.jazzLoop.volume(0);
    s.jazzLoop.play();
    s.jazzLoop.fade(0, 0.2, 2000);
  }, [ensureSounds]);

  const handleScreen0PointerDown = useCallback(() => {
    startAmbience();
    if (screen0ShowContinue) {
      setScreen(1);
    }
  }, [screen0ShowContinue, startAmbience]);

  const resolvedName =
    playerNameInput.trim() || t("screen1.namePlaceholder");

  const skip = useCallback(() => {
    onComplete(difficulty, resolvedName, avatarIndex);
  }, [avatarIndex, difficulty, onComplete, resolvedName]);

  const finishIntro = useCallback(() => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "true");
    } catch {
      /* ignore */
    }
    const s = soundsRef.current;
    if (s) {
      s.doorOpen.play();
      s.rainLoop.fade(0.4, 0, 1500);
      s.jazzLoop.fade(0.2, 0, 1500);
      window.setTimeout(() => {
        s.rainLoop.stop();
        s.jazzLoop.stop();
      }, 1600);
    }
    onComplete(difficulty, resolvedName, avatarIndex);
  }, [avatarIndex, difficulty, onComplete, resolvedName]);

  const chrome = (
    <>
      <div className="pointer-events-auto absolute left-4 top-4 z-50">
        <LanguageToggle />
      </div>
      {showSkip && (
        <div className="pointer-events-auto absolute right-4 top-4 z-50">
          <button
            type="button"
            onClick={skip}
            className="rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[#e8e4dc]/80 backdrop-blur-sm hover:bg-black/70"
          >
            {t("skip")}
          </button>
        </div>
      )}
    </>
  );

  if (screen === 0) {
    return (
      <div
        className="fixed inset-0 z-[100] cursor-pointer bg-black select-none"
        onPointerDown={handleScreen0PointerDown}
        role="presentation"
      >
        {chrome}
        <div className="flex h-full flex-col items-center justify-center px-6 pb-24 pt-16">
          <p className="max-w-[600px] whitespace-pre-wrap text-center font-mono text-sm leading-relaxed text-[#e8e4dc]/90 md:text-base">
            {screen0Displayed}
            {!screen0LineDone && (
              <span className="ml-0.5 inline-block w-2 animate-pulse">▍</span>
            )}
          </p>
          {screen0ShowContinue && (
            <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-[#e8e4dc]/50 motion-safe:animate-pulse">
              {t("screen0.clickToContinue")}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (screen === 1) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a0806]">
        {chrome}
        <style>{`
          @keyframes intro-lamp-flicker {
            0%, 100% { opacity: 0.55; }
            40% { opacity: 0.85; }
            55% { opacity: 0.45; }
            70% { opacity: 0.75; }
          }
        `}</style>
        <div className="relative min-h-[45vh] flex-1 overflow-hidden">
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-20 h-24 w-40 -translate-x-1/2 rounded-b-[40%] bg-amber-400/25 blur-xl"
            style={{ animation: "intro-lamp-flicker 2.8s ease-in-out infinite" }}
          />
          <div className="absolute inset-0 z-0 bg-black/65" />
          <div className="relative z-10 h-full min-h-[280px]">
            <StreetSceneBackground>
              <div className="flex h-full flex-col items-center justify-start gap-4 overflow-y-auto px-4 py-8 pb-12">
                <div className="max-w-lg text-center">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#e8e4dc]/50">
                    Monsieur V.
                  </p>
                  <p className="mt-1 text-sm italic leading-relaxed text-[#e8e4dc]/90">
                    {t("screen1.monsieurV")}
                  </p>
                </div>
                <div
                  className="w-full max-w-xl rounded-lg border-2 p-4 shadow-lg md:p-6"
                  style={{
                    backgroundColor: "#f5f0e4",
                    borderColor: "#c8a84b",
                  }}
                >
                  <p className="border-b border-[#c8a84b]/40 pb-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#3d3428]">
                    {t("screen1.cardHeader")}
                  </p>
                  <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-stretch">
                    <div className="flex flex-col items-center gap-2 md:w-[140px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Previous avatar"
                          className="rounded border border-[#3d3428]/30 p-1 text-[#3d3428] hover:bg-black/5"
                          onClick={() =>
                            setAvatarIndex((i) => (i + 4) % 5)
                          }
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <div className="h-[72px] w-[72px] overflow-hidden rounded border border-[#3d3428]/20 bg-[#ebe6dc]">
                          <PixelAvatar
                            traits={INTRO_AVATARS[avatarIndex]}
                            scale={3}
                          />
                        </div>
                        <button
                          type="button"
                          aria-label="Next avatar"
                          className="rounded border border-[#3d3428]/30 p-1 text-[#3d3428] hover:bg-black/5"
                          onClick={() =>
                            setAvatarIndex((i) => (i + 1) % 5)
                          }
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                      <span className="font-mono text-[10px] text-[#3d3428]/70">
                        {avatarIndex + 1} / 5
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-3 font-mono text-xs text-[#3d3428]">
                      <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {t("screen1.nameLabel")}
                        </span>
                        <input
                          type="text"
                          maxLength={24}
                          value={playerNameInput}
                          onChange={(e) => setPlayerNameInput(e.target.value)}
                          placeholder={t("screen1.namePlaceholder")}
                          className="mt-1 w-full border-b border-[#3d3428]/25 bg-transparent py-1 text-sm outline-none placeholder:text-[#3d3428]/35"
                        />
                      </label>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {t("screen1.difficultyLabel")}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {DIFFICULTY_VALUES.map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setDifficulty(value)}
                              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                difficulty === value
                                  ? "bg-[#3d3428] text-[#f5f0e4]"
                                  : "bg-black/5 hover:bg-black/10"
                              }`}
                            >
                              {tCommon(`difficulty.${value}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {t("screen1.positionLabel")}
                        </span>
                        <p className="mt-1 text-sm">{t("screen1.position")}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScreen(2)}
                  className="group mt-2 w-full max-w-xl py-3 font-mono text-sm font-bold uppercase tracking-[0.25em] text-[#f5f0e4] transition-transform active:translate-y-0.5"
                  style={{
                    backgroundColor: "#7b1c2e",
                    boxShadow: "0 4px 0 0 #3d0f18",
                  }}
                >
                  <span className="transition-transform group-active:scale-y-95 inline-block">
                    {t("screen1.signContract")}
                  </span>
                </button>
              </div>
            </StreetSceneBackground>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IntroScreens23
      chrome={chrome}
      screen={screen}
      setScreen={setScreen}
      resolvedName={resolvedName}
      ensureSounds={ensureSounds}
      startAmbience={startAmbience}
      finishIntro={finishIntro}
      playTypeChar={playTypeChar}
    />
  );
};

interface IntroScreens23Props {
  chrome: React.ReactNode;
  screen: number;
  setScreen: (n: number) => void;
  resolvedName: string;
  ensureSounds: () => IntroSounds;
  startAmbience: () => void;
  finishIntro: () => void;
  playTypeChar: () => void;
}

const IntroScreens23: React.FC<IntroScreens23Props> = ({
  chrome,
  screen,
  setScreen,
  resolvedName,
  ensureSounds,
  startAmbience,
  finishIntro,
  playTypeChar,
}) => {
  const { t } = useTranslation("intro");

  const [s2CardOut, setS2CardOut] = useState(false);
  const [s2ClipboardIn, setS2ClipboardIn] = useState(false);
  const [s2Dialogue, setS2Dialogue] = useState(false);
  const [s2Block, setS2Block] = useState(0);
  const [s2ShowContinue, setS2ShowContinue] = useState(false);

  const [s3Panned, setS3Panned] = useState(false);
  const [s3BootStep, setS3BootStep] = useState(0);
  const [s3LineDone, setS3LineDone] = useState(false);

  useEffect(() => {
    if (screen !== 2) return;
    startAmbience();
    const t0 = window.setTimeout(() => setS2CardOut(true), 80);
    const t1 = window.setTimeout(() => setS2ClipboardIn(true), 380);
    const t2 = window.setTimeout(() => {
      ensureSounds().clipboardThud.play();
      setS2Dialogue(true);
    }, 820);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [screen, ensureSounds, startAmbience]);

  const s2Texts = [
    t("screen2.p1", { name: resolvedName }),
    t("screen2.p2"),
    t("screen2.p3"),
  ];
  const s2Current = s2Dialogue ? s2Texts[s2Block] : "";
  const { displayed: s2Displayed, done: s2LineDone } = useTypewriter(
    s2Current,
    40,
    playTypeChar,
  );

  useEffect(() => {
    if (!s2Dialogue || !s2LineDone) return;
    if (s2Block < 2) {
      const id = window.setTimeout(() => setS2Block((b) => b + 1), 600);
      return () => window.clearTimeout(id);
    }
    setS2ShowContinue(true);
  }, [s2Dialogue, s2LineDone, s2Block]);

  useEffect(() => {
    if (screen !== 3) return;
    startAmbience();
    setS3Panned(false);
    setS3BootStep(0);
    setS3LineDone(false);
    const rafId = window.requestAnimationFrame(() => {
      setS3Panned(true);
    });
    const t1 = window.setTimeout(() => setS3BootStep(1), 1200);
    const t2 = window.setTimeout(() => setS3BootStep(2), 1520);
    const t3 = window.setTimeout(() => setS3BootStep(3), 1840);
    const t4 = window.setTimeout(() => setS3BootStep(4), 2160);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [screen, startAmbience]);

  const screen3LineText = s3BootStep >= 4 ? t("screen3.monsieurV") : "";
  const { displayed: s3Displayed, done: s3TypeDone } = useTypewriter(
    screen3LineText,
    40,
    playTypeChar,
  );

  useEffect(() => {
    if (
      s3BootStep >= 4 &&
      screen3LineText.length > 0 &&
      s3TypeDone
    ) {
      setS3LineDone(true);
    }
  }, [s3BootStep, s3TypeDone, screen3LineText.length]);

  if (screen === 2) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col bg-[#0a0806]"
        onPointerDown={() => {
          if (s2ShowContinue) setScreen(3);
        }}
        role="presentation"
      >
        {chrome}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-black/65" />
          <div className="relative z-10 h-full min-h-[320px]">
            <StreetSceneBackground>
              <div className="relative flex h-full min-h-[400px] flex-col items-center justify-center px-4 py-10">
                <div
                  className={`absolute left-1/2 top-1/2 z-10 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-in ${
                    s2CardOut ? "-translate-x-[110%]" : "translate-x-0"
                  }`}
                >
                  <div
                    className="rounded-lg border-2 p-6 shadow-xl"
                    style={{
                      backgroundColor: "#f5f0e4",
                      borderColor: "#c8a84b",
                    }}
                  >
                    <p className="text-center font-mono text-[10px] text-[#3d3428]/60">
                      …
                    </p>
                  </div>
                </div>
                <div
                  className={`absolute left-1/2 top-1/2 z-20 w-full max-w-lg -translate-x-1/2 transition-transform duration-[400ms] ease-out ${
                    s2ClipboardIn
                      ? "translate-y-[-50%]"
                      : "translate-y-[-170%]"
                  }`}
                  style={{
                    transitionTimingFunction: s2ClipboardIn
                      ? "cubic-bezier(0.34, 1.45, 0.64, 1)"
                      : "ease-in",
                  }}
                >
                  <div
                    className="mx-auto rounded border-4 border-[#5c4a32] bg-[#d4c4a8] p-6 shadow-xl"
                    style={{ boxShadow: "inset 0 0 0 2px #a89878" }}
                  >
                    {s2Dialogue && (
                      <p className="min-h-[4rem] whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#2a241c]">
                        {s2Displayed}
                        {!s2LineDone && s2Current && (
                          <span className="animate-pulse">▍</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                {s2ShowContinue && (
                  <p className="absolute bottom-16 font-mono text-xs uppercase tracking-[0.2em] text-[#e8e4dc]/50">
                    {t("screen0.clickToContinue")}
                  </p>
                )}
              </div>
            </StreetSceneBackground>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 3) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black">
        {chrome}
        <style>{`
          @keyframes intro-flicker {
            0% { opacity: 0; }
            15% { opacity: 1; }
            30% { opacity: 0.2; }
            45% { opacity: 1; }
            60% { opacity: 0.4; }
            100% { opacity: 1; }
          }
          .intro-flicker-once {
            animation: intro-flicker 0.55s ease-out forwards;
          }
        `}</style>
        <div className="relative flex-1 overflow-hidden">
          <div
            className={`absolute inset-0 z-0 transition-transform duration-[1200ms] ease-in-out ${
              s3Panned ? "-translate-y-[14%]" : "translate-y-0"
            }`}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div className="h-full min-h-[400px]">
              <StreetSceneBackground>
                <div className="h-40" />
              </StreetSceneBackground>
            </div>
          </div>
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 font-mono text-[#e8e4dc]">
              {s3BootStep >= 1 && (
                <div className="intro-flicker-once flex items-center gap-2">
                  <Clock size={22} />
                  <span className="text-xl font-bold">
                    {formatTime(START_TIME)}
                  </span>
                </div>
              )}
              {s3BootStep >= 2 && (
                <div className="intro-flicker-once flex items-center gap-2">
                  <Star size={22} className="text-yellow-500" />
                  <span className="text-xl font-bold">{(5.0).toFixed(1)}</span>
                </div>
              )}
              {s3BootStep >= 3 && (
                <div className="intro-flicker-once flex items-center gap-2">
                  <DollarSign size={22} className="text-emerald-400" />
                  <span className="text-xl font-bold">0</span>
                </div>
              )}
            </div>
            {s3BootStep >= 4 && (
              <p className="max-w-md text-center font-mono text-sm text-[#e8e4dc]/90">
                {s3Displayed}
                {!s3TypeDone && (
                  <span className="animate-pulse">▍</span>
                )}
              </p>
            )}
            {s3LineDone && (
              <button
                type="button"
                onClick={finishIntro}
                className="w-full max-w-md border-2 border-[#c8a84b] bg-black/60 py-4 font-mono text-sm font-bold uppercase tracking-[0.3em] text-[#f5e6bc] shadow-[0_0_24px_rgba(200,168,75,0.35)] animate-pulse"
              >
                {t("screen3.clockIn")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
