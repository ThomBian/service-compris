import React from "react";

interface HowToPlayProps {
  onClose: () => void;
}

const panels = [
  {
    title: "Your Shift",
    body: "You are the Maître D'. Manage the door from 19:30 to 23:30. Maximize cash and keep your star rating high.",
  },
  {
    title: "The Queue",
    body: "Customers arrive and wait. Their patience drains — if you're too slow, they storm out and your rating drops.",
  },
  {
    title: "The Desk",
    body: "Click empty ticket fields to ask questions (blue). Click filled fields or the party group to call out lies (orange). Use the red REFUSE button or the door icon to seat.",
  },
  {
    title: "The Floorplan",
    body: "Select grid cells to assign tables. Fit the whole party, or crop them smaller for a penalty. Tables free up after the meal.",
  },
] as const;

export const HowToPlay: React.FC<HowToPlayProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#141414]/80">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border-2 border-[#141414] bg-[#E4E3E0] px-8 py-6 shadow-[4px_4px_0_0_rgba(20,20,20,1)]">
        <h2 className="text-center text-2xl font-bold uppercase tracking-[0.2em] text-[#141414]">
          How to Play
        </h2>

        <div className="flex flex-col gap-4">
          {panels.map((p) => (
            <section key={p.title}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#141414]">
                {p.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#141414]/80">
                {p.body}
              </p>
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-emerald-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
