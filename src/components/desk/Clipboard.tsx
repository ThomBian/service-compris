import React, { useEffect, useRef, useState } from "react";
import { Clipboard as ClipboardIcon } from "lucide-react";
import { useGame } from "../../context/GameContext";
import { ClientAvatar } from "../scene/ClientAvatar";
import { ActivityLog } from "../ActivityLog";
import { CHARACTER_ROSTER } from '../../logic/characterRoster';
import type { CharacterDefinition } from '../../types';

const TABS = [
  "VIPs",
  "Banned",
  // "Menu" ,
  "Log",
] as const;

interface VipDossierEntryProps {
  char: CharacterDefinition;
  isSeated: boolean;
}

const VipDossierEntry: React.FC<VipDossierEntryProps> = ({ char, isSeated }) => {
  const arrivalText =
    char.arrivalMO === 'RESERVATION_ALIAS'
      ? `Books as "${char.aliasFirstName} ${char.aliasLastName}" · Party of ${char.expectedPartySize}`
      : char.arrivalMO === 'WALK_IN' || char.arrivalMO === 'BYPASS'
        ? `Walk-in, no reservation · Party of ${char.expectedPartySize}`
        : `Late arrival · Party of ${char.expectedPartySize}`;

  const consequenceBadge = isSeated ? (
    <div className="inline-flex items-center gap-1 rounded bg-green-100 border border-green-400 px-1 py-0.5 w-fit">
      <span className="text-[9px]">✓</span>
      <span className="text-[8px] text-green-700 font-semibold">Seated</span>
    </div>
  ) : char.gameOver ? (
    <div className="inline-flex items-center gap-1 rounded bg-[#1a0a0a] border border-[#5a1010] px-1 py-0.5 w-fit">
      <span className="text-[9px]">☠️</span>
      <span className="text-[8px] text-[#ff6b6b] font-semibold">Game over</span>
    </div>
  ) : char.cashPenalty ? (
    <div className="inline-flex items-center gap-1 rounded bg-orange-50 border border-orange-300 px-1 py-0.5 w-fit">
      <span className="text-[9px]">💸</span>
      <span className="text-[8px] text-orange-700 font-semibold">
        Cash fine
      </span>
    </div>
  ) : (
    <div className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-300 px-1 py-0.5 w-fit">
      <span className="text-[9px]">⭐</span>
      <span className="text-[8px] text-amber-700 font-semibold">
        Rating loss
      </span>
    </div>
  );

  return (
    <div
      className={`relative rounded-md border p-2 flex gap-2 items-start ${
        isSeated
          ? "border-green-400 bg-green-50"
          : "border-[#e0d8cc] bg-[#fffdf8]"
      }`}
    >
      <div
        className="shrink-0 w-10 flex items-end justify-center"
        style={{ opacity: isSeated ? 0.6 : 1 }}
      >
        <div className="w-full [&_svg]:w-full [&_svg]:h-auto">
          <ClientAvatar traits={char.visualTraits} />
        </div>
      </div>
      <div
        className={`flex flex-col gap-1 flex-1 ${isSeated ? "opacity-70" : ""}`}
      >
        <div
          className={`text-[10px] font-bold ${isSeated ? "text-green-700" : "text-[#141414]"}`}
        >
          {char.name}
        </div>
        <div className="text-[8px] text-[#666] leading-tight">
          {arrivalText}
        </div>
        {consequenceBadge}
      </div>
      {isSeated && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-700 flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">✓</span>
        </div>
      )}
    </div>
  );
};

interface BannedDossierEntryProps {
  char: CharacterDefinition;
  isSeated: boolean;
}

const BannedDossierEntry: React.FC<BannedDossierEntryProps> = ({
  char,
  isSeated,
}) => {
  const arrivalText =
    char.arrivalMO === 'RESERVATION_ALIAS'
      ? `Books as "${char.aliasFirstName} ${char.aliasLastName}" · Party of ${char.expectedPartySize}`
      : char.arrivalMO === 'WALK_IN' || char.arrivalMO === 'BYPASS'
        ? `Walk-in, no reservation · Party of ${char.expectedPartySize}`
        : `Late arrival · Party of ${char.expectedPartySize}`;

  const consequenceBadge = isSeated ? (
    <div className="inline-flex items-center gap-1 rounded bg-red-100 border border-red-400 px-1 py-0.5 w-fit">
      <span className="text-[9px]">⚠️</span>
      <span className="text-[8px] text-red-700 font-semibold">
        Slipped through
      </span>
    </div>
  ) : char.gameOver ? (
    <div className="inline-flex items-center gap-1 rounded bg-[#1a0a0a] border border-[#5a1010] px-1 py-0.5 w-fit">
      <span className="text-[9px]">☠️</span>
      <span className="text-[8px] text-[#ff6b6b] font-semibold">Game over</span>
    </div>
  ) : char.cashPenalty ? (
    <div className="inline-flex items-center gap-1 rounded bg-orange-50 border border-orange-300 px-1 py-0.5 w-fit">
      <span className="text-[9px]">💸</span>
      <span className="text-[8px] text-orange-700 font-semibold">
        Cash fine
      </span>
    </div>
  ) : char.moralePenalty ? (
    <div className="inline-flex items-center gap-1 rounded bg-purple-50 border border-purple-300 px-1 py-0.5 w-fit">
      <span className="text-[9px]">😵</span>
      <span className="text-[8px] text-purple-700 font-semibold">
        Morale hit
      </span>
    </div>
  ) : (
    <div className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-300 px-1 py-0.5 w-fit">
      <span className="text-[9px]">⭐</span>
      <span className="text-[8px] text-amber-700 font-semibold">
        Rating loss
      </span>
    </div>
  );

  return (
    <div
      className={`relative rounded-md border p-2 flex gap-2 items-start ${
        isSeated
          ? "border-red-500 bg-red-50"
          : "bg-white/60 border-[#141414]/10"
      }`}
    >
      <div
        className="shrink-0 w-10 flex items-end justify-center"
        style={{ opacity: isSeated ? 0.6 : 1 }}
      >
        <div className="w-full [&_svg]:w-full [&_svg]:h-auto">
          <ClientAvatar traits={char.visualTraits} />
        </div>
      </div>
      <div
        className={`flex flex-col gap-1 flex-1 ${isSeated ? "opacity-70" : ""}`}
      >
        <div
          className={`text-[10px] font-bold ${isSeated ? "text-red-700" : "text-[#141414]"}`}
        >
          {char.name}
        </div>
        <div className="text-[8px] text-[#666] leading-tight">
          {arrivalText}
        </div>
        {consequenceBadge}
      </div>
    </div>
  );
};

export const Clipboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("VIPs");
  const { gameState } = useGame();

  const seenLogCountRef = useRef(gameState.logs.length);
  const [hasUnseenLogs, setHasUnseenLogs] = useState(false);

  useEffect(() => {
    if (activeTab === "Log") {
      seenLogCountRef.current = gameState.logs.length;
      setHasUnseenLogs(false);
    } else if (gameState.logs.length > seenLogCountRef.current) {
      setHasUnseenLogs(true);
    }
  }, [gameState.logs.length, activeTab]);

  const dailyVipDefs = gameState.dailyCharacterIds
    .map(id => CHARACTER_ROSTER.find(c => c.id === id))
    .filter((c): c is CharacterDefinition => c !== undefined && c.role === 'VIP');

  const dailyBannedDefs = gameState.dailyCharacterIds
    .map(id => CHARACTER_ROSTER.find(c => c.id === id))
    .filter((c): c is CharacterDefinition => c !== undefined && c.role === 'BANNED');

  return (
    <div data-tour="clipboard" className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <ClipboardIcon size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">
          Clipboard
        </span>
      </div>
      <div className="flex gap-1 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? "bg-[#141414] text-[#E4E3E0]"
                : "bg-[#141414]/10 hover:bg-[#141414]/20"
            }`}
          >
            {tab}
            {tab === "Log" && hasUnseenLogs && activeTab !== "Log" && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "VIPs" ? (
          <div className="flex flex-col gap-2 p-1">
            {dailyVipDefs.length === 0 ? (
              <p className="text-[10px] opacity-40 italic p-1">
                No VIPs expected tonight.
              </p>
            ) : (
              dailyVipDefs.map((char) => (
                <VipDossierEntry
                  key={char.id}
                  char={char}
                  isSeated={gameState.seatedCharacterIds.includes(char.id)}
                />
              ))
            )}
          </div>
        ) : activeTab === "Log" ? (
          <ActivityLog logs={gameState.logs} />
        ) : activeTab === "Banned" ? (
          <div className="flex flex-col gap-2 p-1">
            {dailyBannedDefs.length === 0 ? (
              <p className="text-[10px] opacity-40 italic p-1">
                No trouble expected tonight.
              </p>
            ) : (
              dailyBannedDefs.map((char) => (
                <BannedDossierEntry
                  key={char.id}
                  char={char}
                  isSeated={gameState.seatedCharacterIds.includes(char.id)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="p-2 text-[10px] opacity-40 italic">
            {activeTab} — coming soon
          </div>
        )}
      </div>
    </div>
  );
};
