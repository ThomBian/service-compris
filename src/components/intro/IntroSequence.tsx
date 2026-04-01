import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Star,
} from 'lucide-react';
import { Howler } from 'howler';
import {
  INTRO_EXIT_AMBIENCE_MS,
  blockShiftAmbienceUntil,
} from '@/src/audio/ambienceShiftGate';
import { createIntroSounds, type IntroSounds } from '@/src/audio/introAudio';
import { playDialogueTypewriterClick } from '@/src/audio/gameSfx';
import { useTypewriter } from '@/src/hooks/useTypewriter';
import { useIntroScreen0Enter, useIntroScreen1Enter } from '@/src/hooks/useIntroEnterKeys';
import { INTRO_AVATARS } from '@/src/components/intro/introAvatars';
import {
  DIFFICULTY_VALUES,
  INTRO_CHAR_DELAY_MS,
  INTRO_JITTER_MS,
  INTRO_SEEN_KEY,
  readIntroSeen,
  SCREEN0_KEYS,
} from '@/src/components/intro/introConstants';
import {
  MonsieurVDialogueBlock,
  MonsieurVSpeech,
} from '@/src/components/intro/MonsieurVDialogue';
import { PixelAvatar } from '@/src/components/scene/PixelAvatar';
import { StreetSceneBackground } from '@/src/components/scene/StreetSceneBackground';
import { START_TIME } from '@/src/constants';
import { Z_INDEX } from '@/src/zIndex';
import { formatTime } from '@/src/utils';

export { INTRO_SEEN_KEY };

export interface IntroSequenceProps {
  onComplete: (
    difficulty: number,
    playerName: string,
    avatarIndex: number,
  ) => void;
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
  const [screen1SkipDialogue, setScreen1SkipDialogue] = useState(false);
  const [screen1PaperworkUnlocked, setScreen1PaperworkUnlocked] =
    useState(false);
  const [screen1CardExiting, setScreen1CardExiting] = useState(false);
  const introScreenRef = useRef(screen);
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
      s.clipboardThud.stop();
      s.doorOpen.stop();
    };
  }, []);

  const screen0Text = t(SCREEN0_KEYS[screen0Para]);
  const {
    displayed: screen0Displayed,
    done: screen0LineDone,
    skipToEnd: skipScreen0Line,
  } = useTypewriter(
    screen0Text,
    INTRO_CHAR_DELAY_MS,
    playDialogueTypewriterClick,
    INTRO_JITTER_MS,
  );

  const screen1LineText =
    screen === 1 && !screen1SkipDialogue ? t("screen1.monsieurV") : "";
  const {
    displayed: screen1MvDisplayed,
    done: screen1MvDone,
    skipToEnd: skipScreen1Mv,
  } = useTypewriter(
    screen1LineText,
    INTRO_CHAR_DELAY_MS,
    playDialogueTypewriterClick,
    INTRO_JITTER_MS,
  );

  const screen1ShowPaperwork =
    screen === 1 && (screen1SkipDialogue || screen1PaperworkUnlocked);

  useEffect(() => {
    if (screen === 1 && introScreenRef.current !== 1 && !screen1SkipDialogue) {
      setScreen1PaperworkUnlocked(false);
    }
    introScreenRef.current = screen;
  }, [screen, screen1SkipDialogue]);

  const startAmbience = useCallback(() => {
    if (audioStartedRef.current) return;
    const s = ensureSounds();
    audioStartedRef.current = true;
    void Howler.ctx?.resume?.();
    s.rainLoop.play();
    s.jazzLoop.volume(0);
    s.jazzLoop.play();
    s.jazzLoop.fade(0, 0.2, 2000);
  }, [ensureSounds]);

  useIntroScreen0Enter({
    active: screen === 0,
    screen0LineDone,
    screen0Para,
    setScreen0Para,
    setScreen,
    skipScreen0Line,
    startAmbience,
    lastParaIndex: SCREEN0_KEYS.length - 1,
  });

  useIntroScreen1Enter({
    active: screen === 1,
    screen1ShowPaperwork,
    screen1MvDone,
    skipScreen1Mv,
    setScreen1PaperworkUnlocked,
    startAmbience,
  });

  const resolvedName = playerNameInput.trim() || t("screen1.namePlaceholder");

  /** Returning players only on screen 0: jump to paperwork (skip M. V. line). No skip on screen 1+ (must sign, then no skip after). */
  const skipToSignContract = useCallback(() => {
    setScreen1SkipDialogue(true);
    setScreen1CardExiting(false);
    setScreen(1);
  }, []);

  const finishIntro = useCallback(() => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {
      /* ignore */
    }
    const s = soundsRef.current;
    if (s) {
      void Howler.ctx?.resume?.();
      blockShiftAmbienceUntil(Date.now() + INTRO_EXIT_AMBIENCE_MS);
      s.doorOpen.play();
      s.rainLoop.fade(0.4, 0, 1500);
      s.jazzLoop.fade(0.2, 0, 1500);
      window.setTimeout(() => {
        s.rainLoop.stop();
        s.jazzLoop.stop();
      }, INTRO_EXIT_AMBIENCE_MS);
    }
    onComplete(difficulty, resolvedName, avatarIndex);
  }, [avatarIndex, difficulty, onComplete, resolvedName]);

  const chrome = (
    <>
      <div
        className="pointer-events-auto absolute left-4 top-4"
        style={{ zIndex: Z_INDEX.introChrome }}
      >
        <LanguageToggle />
      </div>
      {showSkip && screen === 0 && (
        <div
          className="pointer-events-auto absolute right-4 top-4"
          style={{ zIndex: Z_INDEX.introChrome }}
        >
          <button
            type="button"
            onClick={skipToSignContract}
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
        className="fixed inset-0 bg-black select-none outline-none"
        style={{ zIndex: Z_INDEX.introBackdrop }}
        tabIndex={-1}
        onPointerDown={() => {
          /* Click/touch unlocks audio in Chrome/Safari; Enter alone often does not. */
          startAmbience();
        }}
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
          {!screen0LineDone && (
            <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-[#e8e4dc]/50">
              {t("pressEnterToFinishLine")}
            </p>
          )}
          {screen0LineDone && (
            <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-[#e8e4dc]/60">
              {t("pressEnterToContinue")}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (screen === 1) {
    return (
      <div
        className="fixed inset-0 flex flex-col bg-[#0a0806]"
        style={{ zIndex: Z_INDEX.introBackdrop }}
      >
        {chrome}
        <style>{`
          @keyframes intro-lamp-flicker {
            0%, 100% { opacity: 0.55; }
            40% { opacity: 0.85; }
            55% { opacity: 0.45; }
            70% { opacity: 0.75; }
          }
          @keyframes intro-paperwork-reveal {
            from { opacity: 0; transform: translateY(0.5rem); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div className="relative min-h-[45vh] flex-1 overflow-hidden">
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-20 h-24 w-40 -translate-x-1/2 rounded-b-[40%] bg-amber-400/25 blur-xl"
            style={{
              animation: "intro-lamp-flicker 2.8s ease-in-out infinite",
            }}
          />
          <div className="absolute inset-0 z-0 bg-black/65" />
          <div className="relative z-10 h-full min-h-[280px]">
            <StreetSceneBackground>
              <div className="flex h-full min-h-[320px] flex-col items-center overflow-y-auto px-4 py-8 pb-12">
                {!screen1ShowPaperwork && (
                  <div className="flex min-h-[min(70vh,520px)] w-full max-w-md flex-col items-center justify-center gap-8">
                    <MonsieurVDialogueBlock>
                      <MonsieurVSpeech
                        variant="dark"
                        speakerName={t("monsieurVUi.name")}
                        speakerRole={t("monsieurVUi.role")}
                      >
                        {screen1MvDisplayed}
                        {!screen1MvDone && screen1LineText && (
                          <span className="animate-pulse">▍</span>
                        )}
                      </MonsieurVSpeech>
                    </MonsieurVDialogueBlock>
                    {!screen1MvDone && screen1LineText && (
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e8e4dc]/50">
                        {t("pressEnterToFinishLine")}
                      </p>
                    )}
                    {screen1MvDone &&
                      !screen1SkipDialogue &&
                      !screen1PaperworkUnlocked && (
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e8e4dc]/60">
                          {t("pressEnterToContinue")}
                        </p>
                      )}
                  </div>
                )}
                {screen1ShowPaperwork && (
                  <div
                    className="mt-4 flex w-full max-w-xl flex-col items-center gap-4"
                    style={{
                      animation:
                        "intro-paperwork-reveal 0.5s ease-out forwards",
                    }}
                  >
                    <div
                      className={`w-full rounded-lg border-2 p-4 shadow-lg transition-all duration-300 ease-in md:p-6 ${
                        screen1CardExiting
                          ? "pointer-events-none scale-95 opacity-0"
                          : "opacity-100"
                      }`}
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
                              onClick={() => setAvatarIndex((i) => (i + 4) % 5)}
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
                              onClick={() => setAvatarIndex((i) => (i + 1) % 5)}
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
                      disabled={screen1CardExiting}
                      onClick={() => {
                        setScreen1CardExiting(true);
                        window.setTimeout(() => setScreen(2), 320);
                      }}
                      className={`group w-full py-3 font-mono text-sm font-bold uppercase tracking-[0.25em] text-[#f5f0e4] transition-all duration-300 active:translate-y-0.5 ${
                        screen1CardExiting
                          ? "pointer-events-none opacity-0"
                          : "opacity-100"
                      }`}
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
                )}
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
      introCharDelayMs={INTRO_CHAR_DELAY_MS}
      introJitterMs={INTRO_JITTER_MS}
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
  introCharDelayMs: number;
  introJitterMs: number;
}

const IntroScreens23: React.FC<IntroScreens23Props> = ({
  chrome,
  screen,
  setScreen,
  resolvedName,
  ensureSounds,
  startAmbience,
  finishIntro,
  introCharDelayMs,
  introJitterMs,
}) => {
  const { t } = useTranslation("intro");

  const [s2ClipboardIn, setS2ClipboardIn] = useState(false);
  const [s2Dialogue, setS2Dialogue] = useState(false);
  const [s2Block, setS2Block] = useState(0);

  const [s3Panned, setS3Panned] = useState(false);
  const [s3BootStep, setS3BootStep] = useState(0);
  const s3ClockInConsumedRef = useRef(false);

  useEffect(() => {
    if (screen !== 2) return;
    startAmbience();
    setS2ClipboardIn(false);
    setS2Dialogue(false);
    const t0 = window.setTimeout(() => setS2ClipboardIn(true), 60);
    const t1 = window.setTimeout(() => {
      ensureSounds().clipboardThud.play();
      setS2Dialogue(true);
    }, 60 + 400);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [screen, ensureSounds, startAmbience]);

  const s2Texts = [
    t("screen2.p1", { name: resolvedName }),
    t("screen2.p2"),
    t("screen2.p3"),
  ];
  const s2Current = s2Dialogue ? s2Texts[s2Block] : "";
  const {
    displayed: s2Displayed,
    done: s2LineDone,
    skipToEnd: skipS2Line,
  } = useTypewriter(
    s2Current,
    introCharDelayMs,
    playDialogueTypewriterClick,
    introJitterMs,
  );

  useEffect(() => {
    if (screen !== 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (!s2Dialogue) return;
      e.preventDefault();
      if (!s2LineDone) {
        skipS2Line();
        return;
      }
      if (s2Block < 2) {
        setS2Block((b) => b + 1);
      } else {
        setScreen(3);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, s2Dialogue, s2LineDone, s2Block, skipS2Line, setScreen]);

  useEffect(() => {
    if (screen !== 3) return;
    startAmbience();
    s3ClockInConsumedRef.current = false;
    setS3Panned(false);
    setS3BootStep(0);
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
  const {
    displayed: s3Displayed,
    done: s3TypeDone,
    skipToEnd: skipS3Line,
  } = useTypewriter(
    screen3LineText,
    introCharDelayMs,
    playDialogueTypewriterClick,
    introJitterMs,
  );

  const triggerClockIn = useCallback(() => {
    if (s3ClockInConsumedRef.current) return;
    s3ClockInConsumedRef.current = true;
    finishIntro();
  }, [finishIntro]);

  useEffect(() => {
    if (screen !== 3) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (s3BootStep < 4) return;
      e.preventDefault();
      if (!s3TypeDone) {
        skipS3Line();
        return;
      }
      triggerClockIn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, s3BootStep, s3TypeDone, skipS3Line, triggerClockIn]);

  if (screen === 2) {
    return (
      <div
        className="fixed inset-0 flex flex-col bg-[#0a0806]"
        style={{ zIndex: Z_INDEX.introBackdrop }}
      >
        {chrome}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-black/65" />
          <div className="relative z-10 h-full min-h-[320px]">
            <StreetSceneBackground>
              <div className="relative flex h-full min-h-[400px] flex-col items-center justify-center px-4 py-10">
                <div
                  className={`absolute left-1/2 top-1/2 z-20 w-full max-w-lg -translate-x-1/2 transition-transform duration-[400ms] ease-out ${
                    s2ClipboardIn ? "translate-y-[-50%]" : "translate-y-[-170%]"
                  }`}
                  style={{
                    transitionTimingFunction: s2ClipboardIn
                      ? "cubic-bezier(0.34, 1.45, 0.64, 1)"
                      : "ease-in",
                  }}
                >
                  <div
                    className="mx-auto w-full max-w-lg overflow-hidden rounded-lg border-4 border-[#5c4a32] bg-transparent shadow-xl"
                    style={{ boxShadow: "inset 0 0 0 2px #a89878" }}
                  >
                    {s2Dialogue && (
                      <MonsieurVDialogueBlock className="min-h-[5rem] rounded-none border-0 shadow-none">
                        <MonsieurVSpeech
                          variant="dark"
                          speakerName={t("monsieurVUi.name")}
                          speakerRole={t("monsieurVUi.role")}
                        >
                          {s2Displayed}
                          {!s2LineDone && s2Current && (
                            <span className="animate-pulse">▍</span>
                          )}
                        </MonsieurVSpeech>
                      </MonsieurVDialogueBlock>
                    )}
                  </div>
                </div>
                {s2Dialogue && !s2LineDone && (
                  <p className="absolute bottom-16 font-mono text-xs uppercase tracking-[0.2em] text-[#e8e4dc]/50">
                    {t("pressEnterToFinishLine")}
                  </p>
                )}
                {s2Dialogue && s2LineDone && (
                  <p className="absolute bottom-16 font-mono text-xs uppercase tracking-[0.2em] text-[#e8e4dc]/60">
                    {t("pressEnterToContinue")}
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
      <div
        className="fixed inset-0 flex flex-col bg-black"
        style={{ zIndex: Z_INDEX.introBackdrop }}
      >
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
              <div className="flex w-full max-w-md flex-col items-stretch gap-4">
                <MonsieurVDialogueBlock>
                  <MonsieurVSpeech
                    variant="dark"
                    speakerName={t("monsieurVUi.name")}
                    speakerRole={t("monsieurVUi.role")}
                  >
                    {s3Displayed}
                    {!s3TypeDone && <span className="animate-pulse">▍</span>}
                  </MonsieurVSpeech>
                </MonsieurVDialogueBlock>
                {!s3TypeDone && (
                  <p className="text-center font-mono text-xs uppercase tracking-[0.2em] text-[#e8e4dc]/50">
                    {t("pressEnterToFinishLine")}
                  </p>
                )}
                {s3TypeDone && (
                  <button
                    type="button"
                    onClick={triggerClockIn}
                    className="w-full border-2 border-[#c8a84b] bg-black/60 py-4 font-mono text-sm font-bold uppercase tracking-[0.3em] text-[#f5e6bc] shadow-[0_0_24px_rgba(200,168,75,0.35)] animate-pulse"
                  >
                    {t("screen3.clockIn")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
