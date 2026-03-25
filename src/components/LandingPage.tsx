import React from "react";

interface LandingPageProps {
  difficulty: number;
  onDifficultyChange: (d: number) => void;
  onStartGame: () => void;
  onShowHelp: () => void;
}

const DIFFICULTIES = [
  { value: 0, label: "Chill" },
  { value: 1, label: "Normal" },
  { value: 2, label: "Busy" },
  { value: 3, label: "Hell" },
] as const;

export const LandingPage: React.FC<LandingPageProps> = ({
  difficulty,
  onDifficultyChange,
  onStartGame,
  onShowHelp,
}) => {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#141414]/50">
            The Maitre D' Simulator
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[0.15em] sm:text-5xl">
            Service Compris
          </h1>
        </div>

        <p className="max-w-sm text-center text-sm leading-relaxed text-[#141414]/60">
          You are the Maitre D' at a ruthless restaurant. Manage the door, spot
          the liars, survive the shift.
        </p>

        <div className="flex items-center gap-1 rounded-lg border border-[#141414]/10 bg-white/50 p-1">
          {DIFFICULTIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onDifficultyChange(value)}
              className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                difficulty === value
                  ? "bg-[#141414] text-[#E4E3E0]"
                  : "hover:bg-[#141414]/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onStartGame}
          className="rounded-xl border-2 border-[#141414] bg-[#141414] px-10 py-3 text-lg font-extrabold uppercase tracking-[0.2em] text-[#E4E3E0] shadow-[4px_4px_0_0_rgba(20,20,20,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_rgba(20,20,20,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          New Game
        </button>

        <button
          type="button"
          onClick={onShowHelp}
          className="cursor-pointer text-xs font-bold uppercase tracking-wide text-[#141414]/40 transition-colors hover:text-[#141414]/70"
        >
          How to Play
        </button>
      </div>
    </div>
  );
};
