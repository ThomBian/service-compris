import type React from 'react';

export const INTRO_SERIF_FONT = 'Georgia, \'Times New Roman\', serif';

/** Shared “he’s talking to you” layout: face chip + name + dialogue column. */
export function MonsieurVSpeech({
  variant,
  speakerName,
  speakerRole,
  children,
}: {
  variant: 'parchment' | 'dark';
  speakerName: string;
  speakerRole: string;
  children: React.ReactNode;
}) {
  const parchment = variant === 'parchment';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
      <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-lg font-semibold ${
            parchment
              ? 'border-[#3d3428]/35 bg-[#3d3428] text-[#e8dcc8]'
              : 'border-[#c8a84b]/45 bg-transparent text-[#f5e6bc]'
          }`}
          style={{ fontFamily: INTRO_SERIF_FONT }}
          aria-hidden
        >
          V
        </div>
        <div className="min-w-0 pt-0.5">
          <p
            className={`text-base font-semibold leading-tight ${
              parchment ? 'text-[#2a241c]' : 'text-[#f5e6bc]'
            }`}
            style={{ fontFamily: INTRO_SERIF_FONT }}
          >
            {speakerName}
          </p>
          <p
            className={`mt-1 text-xs italic leading-snug ${
              parchment ? 'text-[#3d3428]/72' : 'text-[#e8e4dc]/55'
            }`}
            style={{ fontFamily: INTRO_SERIF_FONT }}
          >
            {speakerRole}
          </p>
        </div>
      </div>
      <div
        className={`relative rounded-r-lg rounded-bl-lg border-l-[3px] py-1 pl-4 ${
          parchment
            ? 'border-[#7b1c2e]/60 bg-[#c9b896]/40'
            : 'border-[#c8a84b]/50'
        }`}
      >
        <div
          className={`whitespace-pre-wrap text-[0.9375rem] leading-[1.65] ${
            parchment ? 'text-[#2a241c]' : 'text-[#e8e4dc]/93'
          }`}
          style={{ fontFamily: INTRO_SERIF_FONT }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Full-width of parent + dark scrim so serif copy stays legible on bright scene art. */
export function MonsieurVDialogueBlock({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`w-full rounded-xl border border-black/25 bg-black/50 px-4 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}
