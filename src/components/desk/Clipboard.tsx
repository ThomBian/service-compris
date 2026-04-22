import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard as ClipboardIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../context/GameContext";
import { PixelAvatar } from "../scene/PixelAvatar";
import { ActivityLog } from "../ActivityLog";
import { CHARACTER_ROSTER } from "../../logic/characterRoster";
import { BOSS_ROSTER } from "../../data/bossRoster";
import type { BossDefinition, CharacterDefinition, GameState } from "../../types";
import { PhysicalState } from "../../types";
import type { CampaignPath } from "../../types/campaign";
import { MAX_PATH_SCORE } from "../../constants";

type BossExpectation = "pending" | "looming" | "in_venue" | "seated";

function getBossExpectation(boss: BossDefinition, gameState: GameState): BossExpectation {
  if (gameState.seatedCharacterIds.includes(boss.id)) return "seated";
  const inVenue =
    gameState.queue.some(c => c.characterId === boss.id) ||
    gameState.currentClient?.characterId === boss.id;
  if (inVenue) return "in_venue";
  const walkKey = `char-walkin-${boss.id}`;
  if (gameState.spawnedReservationIds.includes(walkKey)) return "looming";
  if (boss.spawnCondition(gameState)) return "looming";
  return "pending";
}

function isBossOnClipboard(boss: BossDefinition, gameState: GameState): boolean {
  return getBossExpectation(boss, gameState) !== "pending";
}

const TABS = [
  "VIPs",
  "Banned",
  // "Factions",
  // "Menu" ,
  "Log",
] as const;

interface VipDossierEntryProps {
  char: CharacterDefinition;
  isSeated: boolean;
}

const VipDossierEntry: React.FC<VipDossierEntryProps> = ({
  char,
  isSeated,
}) => {
  const arrivalText =
    char.arrivalMO === "RESERVATION_ALIAS"
      ? `Books as "${char.aliasFirstName} ${char.aliasLastName}" · Party of ${char.expectedPartySize}`
      : char.arrivalMO === "WALK_IN" || char.arrivalMO === "BYPASS"
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
        <PixelAvatar traits={char.visualTraits} scale={1} />
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
    char.arrivalMO === "RESERVATION_ALIAS"
      ? `Books as "${char.aliasFirstName} ${char.aliasLastName}" · Party of ${char.expectedPartySize}`
      : char.arrivalMO === "WALK_IN" || char.arrivalMO === "BYPASS"
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
        <PixelAvatar traits={char.visualTraits} scale={1} />
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

function BossClipCard({
  boss,
  variant,
  gameState,
}: {
  boss: BossDefinition;
  variant: "vip" | "banned";
  gameState: GameState;
}) {
  const { t } = useTranslation("ui");
  const expectation = getBossExpectation(boss, gameState);
  const isSeated = expectation === "seated";

  const statusKey =
    expectation === "in_venue"
      ? "clipboard.bossStatusInHouse"
      : expectation === "looming"
        ? "clipboard.bossStatusLooming"
        : "clipboard.bossStatusPending";

  const outer =
    variant === "vip"
      ? isSeated
        ? "border-green-400 bg-green-50"
        : expectation === "looming" || expectation === "in_venue"
          ? "border-amber-400 bg-amber-50/90"
          : "border-[#e0d8cc] bg-[#fffdf8]"
      : isSeated
        ? "border-red-500 bg-red-50"
        : expectation === "looming" || expectation === "in_venue"
          ? "border-amber-500 bg-amber-50/85"
          : "bg-white/60 border-[#141414]/10";

  const vipBadge = isSeated ? (
    <div className="inline-flex items-center gap-1 rounded bg-green-100 border border-green-400 px-1 py-0.5 w-fit">
      <span className="text-[9px]">✓</span>
      <span className="text-[8px] text-green-700 font-semibold">{t("clipboard.seated")}</span>
    </div>
  ) : (
    <div className="inline-flex flex-wrap items-center gap-1">
      <div className="inline-flex items-center gap-1 rounded border border-[#141414]/20 bg-[#141414]/8 px-1 py-0.5 w-fit">
        <span className="text-[8px] font-bold uppercase tracking-wide text-[#141414]/80">
          {t("clipboard.bossBadge")}
        </span>
      </div>
      <div
        className={`inline-flex items-center gap-1 rounded border px-1 py-0.5 w-fit ${
          expectation === "pending"
            ? "border-[#141414]/15 bg-white/70 text-[#555]"
            : "border-amber-600/40 bg-amber-100/80 text-amber-950"
        }`}
      >
        <span className="text-[8px] font-semibold leading-tight">{t(statusKey)}</span>
      </div>
    </div>
  );

  const bannedBadge = isSeated ? (
    <div className="inline-flex items-center gap-1 rounded bg-red-100 border border-red-400 px-1 py-0.5 w-fit">
      <span className="text-[9px]">⚠️</span>
      <span className="text-[8px] text-red-700 font-semibold">{t("clipboard.slippedThrough")}</span>
    </div>
  ) : (
    <div className="inline-flex flex-wrap items-center gap-1">
      <div className="inline-flex items-center gap-1 rounded border border-[#141414]/20 bg-[#141414]/8 px-1 py-0.5 w-fit">
        <span className="text-[8px] font-bold uppercase tracking-wide text-[#141414]/80">
          {t("clipboard.bossBadge")}
        </span>
      </div>
      <div
        className={`inline-flex items-center gap-1 rounded border px-1 py-0.5 w-fit ${
          expectation === "pending"
            ? "border-[#141414]/15 bg-white/70 text-[#555]"
            : "border-amber-700/35 bg-amber-100/90 text-amber-950"
        }`}
      >
        <span className="text-[8px] font-semibold leading-tight">{t(statusKey)}</span>
      </div>
    </div>
  );

  return (
    <div className={`relative rounded-md border p-2 flex gap-2 items-start ${outer}`}>
      <div
        className="shrink-0 w-10 flex items-end justify-center"
        style={{ opacity: isSeated ? 0.6 : 1 }}
      >
        <PixelAvatar traits={boss.visualTraits} scale={1} />
      </div>
      <div className={`flex flex-col gap-1 flex-1 ${isSeated ? "opacity-70" : ""}`}>
        <div
          className={`text-[10px] font-bold ${
            isSeated ? (variant === "vip" ? "text-green-700" : "text-red-700") : "text-[#141414]"
          }`}
        >
          {boss.name}
        </div>
        <div className="text-[8px] text-[#666] leading-tight">{boss.clueText}</div>
        <div className="text-[8px] text-[#888] leading-tight">
          {t("clipboard.walkInNoRes", { n: boss.expectedPartySize })}
        </div>
        {variant === "vip" ? vipBadge : bannedBadge}
      </div>
      {isSeated && variant === "vip" && (
        <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-700">
          <span className="text-[9px] font-bold text-white">✓</span>
        </div>
      )}
      {isSeated && variant === "banned" && (
        <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600">
          <span className="text-[9px] font-bold text-white">!</span>
        </div>
      )}
    </div>
  );
}

const FACTION_DISPLAY: Array<{
  path: CampaignPath;
  name: string;
  icon: string;
  markerText: string;
  accentColor: string;
  borderColor: string;
  bgColor: string;
}> = [
  {
    path: "underworld",
    name: "The Syndicate",
    icon: "🤵",
    markerText:
      "Matching pinstripe suits. Walk-in, party of 4. No reservation.",
    accentColor: "text-yellow-700",
    borderColor: "border-yellow-400",
    bgColor: "bg-yellow-50",
  },
  {
    path: "michelin",
    name: "The Culinary Inquisition",
    icon: "🎩",
    markerText: "Hyper-formal wear. Crimson ascot. Parties of 1–2.",
    accentColor: "text-red-700",
    borderColor: "border-red-400",
    bgColor: "bg-red-50",
  },
  {
    path: "viral",
    name: "The Hype Train",
    icon: "📱",
    markerText: "Neon gear. Large groups. Zero patience.",
    accentColor: "text-blue-700",
    borderColor: "border-blue-400",
    bgColor: "bg-blue-50",
  },
];

function factionIntensity(score: number): 0 | 1 | 2 | 3 {
  if (score <= 0) return 0;
  if (score < MAX_PATH_SCORE * 0.33) return 1;
  if (score < MAX_PATH_SCORE * 0.66) return 2;
  return 3;
}

function intensityLabel(level: 0 | 1 | 2 | 3): string {
  switch (level) {
    case 0:
      return "QUIET ○○○";
    case 1:
      return "WEAK ●○○";
    case 2:
      return "ACTIVE ●●○";
    case 3:
      return "DOMINANT ●●●";
    default:
      return "QUIET ○○○";
  }
}

export const Clipboard: React.FC = () => {
  const { t } = useTranslation("ui");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("VIPs");
  const { gameState, pathScores } = useGame();
  const { revealedTools, currentClient } = gameState;
  const showVipTab = revealedTools.includes("CLIPBOARD_VIP");
  const showBannedTab = revealedTools.includes("CLIPBOARD_BANNED");

  const visibleTabs = React.useMemo(
    () =>
      TABS.filter((tab) => {
        if (tab === "VIPs") return showVipTab;
        if (tab === "Banned") return showBannedTab;
        return true;
      }),
    [showVipTab, showBannedTab],
  );

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

  useEffect(() => {
    if (visibleTabs.includes(activeTab)) return;
    setActiveTab(visibleTabs[0] ?? "Factions");
  }, [visibleTabs, activeTab]);

  const mergedVipDefs = useMemo(() => {
    const fromDaily = gameState.dailyCharacterIds
      .map((id) => CHARACTER_ROSTER.find((c) => c.id === id))
      .filter((c): c is CharacterDefinition => c !== undefined && c.role === "VIP");
    const ids = new Set(fromDaily.map((c) => c.id));
    const rosterBossVips = BOSS_ROSTER.filter(
      (b) => b.role === "VIP" && isBossOnClipboard(b, gameState),
    );
    return [...fromDaily, ...rosterBossVips.filter((b) => !ids.has(b.id))];
  }, [gameState]);

  const mergedBannedDefs = useMemo(() => {
    const fromDaily = gameState.dailyCharacterIds
      .map((id) => CHARACTER_ROSTER.find((c) => c.id === id))
      .filter((c): c is CharacterDefinition => c !== undefined && c.role === "BANNED");
    const ids = new Set(fromDaily.map((c) => c.id));
    const rosterBossBanned = BOSS_ROSTER.filter(
      (b) => b.role === "BANNED" && isBossOnClipboard(b, gameState),
    );
    return [...fromDaily, ...rosterBossBanned.filter((b) => !ids.has(b.id))];
  }, [gameState]);

  const clientAtDesk = currentClient?.physicalState === PhysicalState.AT_DESK;
  const isNight1 = gameState.nightNumber === 1;
  const highlightVip =
    isNight1 &&
    clientAtDesk &&
    mergedVipDefs.some((c) => c.id === currentClient?.characterId);
  const highlightBanned =
    isNight1 &&
    clientAtDesk &&
    mergedBannedDefs.some((c) => c.id === currentClient?.characterId);
  const highlightClipboard = highlightVip || highlightBanned;

  return (
    <div
      className="relative rounded-xl p-[2px] h-full flex flex-col shadow-[4px_4px_0_0_#141414]"
      style={{ background: highlightClipboard ? "#8b3a0a" : "#141414" }}
    >
      {highlightClipboard && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <div
            style={{
              position: "absolute",
              inset: "-100%",
              background:
                "conic-gradient(#f0c040 0deg, #f0c040 90deg, #8b3a0a 120deg, #8b3a0a 360deg)",
              animation: "borderSpin 0.6s linear infinite",
            }}
          />
        </div>
      )}
      <div className="relative flex-1 min-h-0 bg-white rounded-[10px] p-3 flex flex-col gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <ClipboardIcon size={12} />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">
            Clipboard
          </span>
        </div>
        <div className="flex gap-1 shrink-0">
          {visibleTabs.map((tab) => {
            const tabHighlighted =
              (tab === "VIPs" && highlightVip) ||
              (tab === "Banned" && highlightBanned);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative overflow-hidden px-2 py-0.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? "bg-[#141414] text-[#E4E3E0]"
                    : !tabHighlighted
                      ? "bg-[#141414]/10 hover:bg-[#141414]/20"
                      : ""
                }`}
                style={
                  tabHighlighted && activeTab !== tab
                    ? {
                        background:
                          "linear-gradient(90deg, #1a0800 0%, #1a0800 30%, rgba(240,192,64,0.8) 50%, #1a0800 70%, #1a0800 100%)",
                        backgroundSize: "200% 100%",
                        animation: "tabShimmer 1.5s ease-in-out infinite",
                        color: "#f0c040",
                      }
                    : undefined
                }
              >
                <span className="relative z-10">{tab}</span>
                {tab === "Log" && hasUnseenLogs && activeTab !== "Log" && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 z-10" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === "VIPs" ? (
            <div className="flex flex-col gap-2 p-1">
              {mergedVipDefs.length === 0 ? (
                <p className="p-1 text-[10px] italic opacity-40">{t("clipboard.noVips")}</p>
              ) : (
                mergedVipDefs.map((char) => {
                  const boss = BOSS_ROSTER.find((b) => b.id === char.id && b.role === "VIP");
                  if (boss) {
                    return (
                      <React.Fragment key={boss.id}>
                        <BossClipCard boss={boss} variant="vip" gameState={gameState} />
                      </React.Fragment>
                    );
                  }
                  return (
                    <VipDossierEntry
                      key={char.id}
                      char={char}
                      isSeated={gameState.seatedCharacterIds.includes(char.id)}
                    />
                  );
                })
              )}
            </div>
          ) : activeTab === "Factions" ? (
            <div className="flex flex-col gap-2 p-1">
              {FACTION_DISPLAY.map((faction) => {
                const score = pathScores?.[faction.path] ?? 0;
                const level = factionIntensity(score);
                const isActive = level >= 2;
                return (
                  <div
                    key={faction.path}
                    className={`rounded-md border p-2 transition-opacity ${
                      isActive
                        ? `${faction.borderColor} ${faction.bgColor}`
                        : "border-[#141414]/10 bg-white/60"
                    }`}
                    style={{ opacity: level === 0 ? 0.45 : 1 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#141414]">
                        {faction.icon} {faction.name}
                      </span>
                      <span
                        className={`text-[8px] font-bold uppercase tracking-wide ${isActive ? faction.accentColor : "text-[#999]"}`}
                      >
                        {intensityLabel(level)}
                      </span>
                    </div>
                    <p className="text-[8px] text-[#555] leading-tight">
                      <span className="font-semibold">Spot them:</span>{" "}
                      {faction.markerText}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : activeTab === "Log" ? (
            <ActivityLog logs={gameState.logs} />
          ) : activeTab === "Banned" ? (
            <div className="flex flex-col gap-2 p-1">
              {mergedBannedDefs.length === 0 ? (
                <p className="p-1 text-[10px] italic opacity-40">{t("clipboard.noBanned")}</p>
              ) : (
                mergedBannedDefs.map((char) => {
                  const boss = BOSS_ROSTER.find((b) => b.id === char.id && b.role === "BANNED");
                  if (boss) {
                    return (
                      <React.Fragment key={boss.id}>
                        <BossClipCard boss={boss} variant="banned" gameState={gameState} />
                      </React.Fragment>
                    );
                  }
                  return (
                    <BannedDossierEntry
                      key={char.id}
                      char={char}
                      isSeated={gameState.seatedCharacterIds.includes(char.id)}
                    />
                  );
                })
              )}
            </div>
          ) : (
            <div className="p-2 text-[10px] opacity-40 italic">
              {activeTab} — coming soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
