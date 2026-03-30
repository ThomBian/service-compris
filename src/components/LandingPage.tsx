import React from "react";
import { useTranslation } from "react-i18next";

interface LandingPageProps {
  onStartGame: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  const { t, i18n } = useTranslation(["ui", "common"]);

  const setLang = (lng: string) => {
    void i18n.changeLanguage(lng);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-1 rounded-xl border border-[#141414]/10 bg-white/50 p-1">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              i18n.language.startsWith("en")
                ? "bg-[#141414] text-[#E4E3E0]"
                : "hover:bg-[#141414]/10"
            }`}
          >
            {t("common:language.en")}
          </button>
          <button
            type="button"
            onClick={() => setLang("fr")}
            className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              i18n.language.startsWith("fr")
                ? "bg-[#141414] text-[#E4E3E0]"
                : "hover:bg-[#141414]/10"
            }`}
          >
            {t("common:language.fr")}
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#141414]/50">
            {t("ui:landing.tagline")}
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[0.15em] sm:text-5xl">
            {t("common:appTitle")}
          </h1>
        </div>

        <p className="max-w-sm text-center text-sm leading-relaxed text-[#141414]/60">
          {t("ui:landing.blurb")}
        </p>

        <button
          type="button"
          onClick={onStartGame}
          className="rounded-xl border-2 border-[#141414] bg-[#141414] px-10 py-3 text-lg font-extrabold uppercase tracking-[0.2em] text-[#E4E3E0] shadow-[4px_4px_0_0_#141414] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#141414] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          {t("ui:landing.newGame")}
        </button>
      </div>
    </div>
  );
};
