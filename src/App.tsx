import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Pause, Play } from 'lucide-react';
import { formatTime } from './utils';
import { GameProvider, useGame } from './context/GameContext';
import { PhysicalState, CellState } from './types';
import { SALARY_COST, ELECTRICITY_COST, FOOD_COST_PER_COVER, DOORS_CLOSE_TIME } from './constants';
import { getRule } from './logic/nightRules';
import { TopBar } from './components/TopBar';
import { ScenePanel } from './components/ScenePanel';
import { BottomPanel } from './components/BottomPanel';
import { ToastContainer } from './components/ToastContainer';
import { AudioMuteButton } from './components/AudioMuteButton';
import { LandingPage } from './components/LandingPage';
import { IntroSequence } from './components/intro/IntroSequence';
import { INTRO_AVATARS } from './components/intro/introAvatars';
import { CorkboardScreen } from './components/CorkboardScreen';
import { MrVDialogue } from './components/MrVDialogue';
import { useCampaign } from './hooks/useCampaign';
import { useGameAmbience } from './hooks/useGameAmbience';
import { getSharedAmbienceSounds } from './audio/introAudio';
import type { LedgerData } from './types/campaign';
import type { MiniGameId, VisualTraits } from './types';
import { Z_INDEX } from './zIndex';
import { BossEncounterOverlay } from './components/boss/BossEncounterOverlay';
import { DEV_MINI_GAME_ORDER } from './data/bossRoster';

/** Dev + VITE_DEV_START_NIGHT>=2: "New game" skips intro and night 1 onboarding. Build-time in Vite. */
const DEV_START_NIGHT: number = (() => {
  if (!import.meta.env.DEV) return 0;
  const raw = import.meta.env.VITE_DEV_START_NIGHT;
  if (raw === undefined || raw === '') return 0;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 2 ? n : 0;
})();

type GamePhase = 'LANDING' | 'INTRO' | 'CORKBOARD' | 'PLAYING';

interface GameContentProps {
  initialDifficulty: number;
  persist?: { cash: number; rating: number; morale: number; nightNumber: number };
  onShiftEnd: (ledger: LedgerData, lossReason: 'MORALE' | 'VIP' | 'BANNED' | null) => void;
  playerIdentity: { name: string; traits: VisualTraits } | null;
  activeDialogue: string[] | null;
  onDialogueDismiss: () => void;
}

function GameContent({
  initialDifficulty,
  persist,
  onShiftEnd,
  playerIdentity,
  activeDialogue,
  onDialogueDismiss,
}: GameContentProps) {
  const { t } = useTranslation('ui');
  const { gameState, seatParty, setTimeMultiplier, resetGame, devStartBossEncounter } = useGame();
  const [view, setView] = React.useState<'desk' | 'floorplan'>('desk');

  const closeTime = getRule<number>(gameState.activeRules, 'SHIFT_END_TIME', DOORS_CLOSE_TIME);
  const isOvertime = gameState.inGameMinutes >= closeTime;
  const hasOccupiedCells = gameState.grid.flat().some(c => c.state === CellState.OCCUPIED);
  const summaryBlockedByDesk =
    gameState.currentClient?.physicalState === PhysicalState.SEATING;

  // Night-end-by-dialogue: track when the closing dialogue is dismissed
  const [closingDialogueAcknowledged, setClosingDialogueAcknowledged] = React.useState(false);
  const prevActiveDialogueRef = React.useRef(activeDialogue);
  React.useEffect(() => {
    const wasActive = prevActiveDialogueRef.current !== null;
    prevActiveDialogueRef.current = activeDialogue;
    if (gameState.nightEndPending && wasActive && activeDialogue === null) {
      setClosingDialogueAcknowledged(true);
    }
  }, [activeDialogue, gameState.nightEndPending]);

  const shiftEnded =
    gameState.gameOver ||
    (!gameState.nightEndPending && isOvertime && !hasOccupiedCells && !summaryBlockedByDesk) ||
    (closingDialogueAcknowledged && !hasOccupiedCells && !summaryBlockedByDesk);

  useGameAmbience({
    shiftEnded,
    timeMultiplier: gameState.timeMultiplier,
  });

  React.useEffect(() => {
    resetGame(initialDifficulty, persist);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const devMiniGameParamConsumed = React.useRef(false);
  React.useEffect(() => {
    if (!import.meta.env.DEV || !devStartBossEncounter) return;
    if (devMiniGameParamConsumed.current) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('devMiniGame');
    if (!raw) return;
    const normalized = raw.trim().toUpperCase();
    if (!(DEV_MINI_GAME_ORDER as readonly string[]).includes(normalized)) return;
    devMiniGameParamConsumed.current = true;
    devStartBossEncounter(normalized as MiniGameId);
    params.delete('devMiniGame');
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', next);
  }, [devStartBossEncounter]);

  React.useEffect(() => {
    if (!import.meta.env.DEV || !devStartBossEncounter) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey || !e.altKey) return;
      if (e.key < '1' || e.key > '4') return;
      const idx = Number(e.key) - 1;
      const miniGame = DEV_MINI_GAME_ORDER[idx];
      if (!miniGame) return;
      e.preventDefault();
      devStartBossEncounter(miniGame);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [devStartBossEncounter]);

  React.useEffect(() => {
    if (isOvertime && !shiftEnded) {
      setView('floorplan');
      return;
    }
    if (view === 'floorplan' && gameState.currentClient?.physicalState !== PhysicalState.SEATING) {
      setView('desk');
    }
  }, [view, gameState.currentClient?.physicalState, isOvertime, shiftEnded]);

  // After boss encounter clears with SEAT WIN, currentClient is in SEATING state → show floorplan
  React.useEffect(() => {
    if (
      !gameState.activeBossEncounter &&
      gameState.currentClient?.physicalState === PhysicalState.SEATING
    ) {
      setView('floorplan');
    }
  }, [gameState.activeBossEncounter, gameState.currentClient?.physicalState]);

  // Fire onShiftEnd exactly once when shift ends
  const shiftEndFiredRef = React.useRef(false);
  React.useEffect(() => {
    if (!shiftEnded || shiftEndFiredRef.current) return;
    shiftEndFiredRef.current = true;

    const foodCost = gameState.coversSeated * FOOD_COST_PER_COVER;
    const bill = SALARY_COST + ELECTRICITY_COST + foodCost;
    // Base cash calculation on tracked shiftRevenue (not gameState.cash which can drift
    // from untracked character bonuses). Cash on hand = previous night's cash + this
    // night's revenue - operating costs.
    const startingCash = persist?.cash ?? 0;
    const netProfit = gameState.shiftRevenue - bill;
    const cashAfter = Math.max(0, startingCash + netProfit);

    const ledger: LedgerData = {
      cash: cashAfter,
      netProfit,
      rating: Math.max(1.0, gameState.rating),
      morale: Math.max(0, gameState.morale),
      coversSeated: gameState.coversSeated,
      shiftRevenue: gameState.shiftRevenue,
      salaryCost: SALARY_COST,
      electricityCost: ELECTRICITY_COST,
      foodCost,
      logs: gameState.logs,
    };

    // Determine loss reason — COVERS_TARGET means win (target reached), not loss
    let lossReason: 'MORALE' | 'VIP' | 'BANNED' | null = null;
    if (gameState.gameOver && gameState.gameOverReason !== 'COVERS_TARGET') {
      const r = gameState.gameOverReason;
      if (r === 'MORALE' || r === 'VIP' || r === 'BANNED') lossReason = r;
    }

    onShiftEnd(ledger, lossReason);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftEnded]);

  const handleSeatParty = () => {
    seatParty();
  };

  const showDeskBottomBar =
    view === 'floorplan' || gameState.revealedTools.length > 0;

  return (
    <div className="h-screen relative bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      {/* Scene + bottom panel fill full viewport height */}
      <div className={`absolute inset-0 flex flex-col overflow-hidden ${view === 'floorplan' ? 'pt-14' : ''}`}>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScenePanel
            view={view}
            onSeatParty={handleSeatParty}
            playerIdentity={playerIdentity}
            expandDeskScene={view === 'desk' && !showDeskBottomBar}
          />
          {showDeskBottomBar && (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <BottomPanel view={view} isOvertime={isOvertime} playerIdentity={playerIdentity} />
            </div>
          )}
        </div>
      </div>
      {gameState.timeMultiplier === 0 &&
        !gameState.activeBossEncounter &&
        !shiftEnded &&
        typeof document !== 'undefined'
        ? createPortal(
            <button
              type="button"
              className="fixed inset-0 flex cursor-pointer items-start justify-center border-0 bg-[#141414]/12 px-4 pt-24 pb-0 transition-colors hover:bg-[#141414]/18 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141414] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E4E3E0] sm:pt-28"
              style={{ zIndex: Z_INDEX.pauseOverlay }}
              onClick={() => setTimeMultiplier(gameState.difficulty === 3 ? 3 : 1)}
              aria-label={
                gameState.difficulty === 3
                  ? t('app.resume3xAria')
                  : t('app.resumeNormalAria')
              }
            >
              <span className="pointer-events-none flex max-w-[min(100%,20rem)] flex-col items-center gap-2 rounded-xl border-2 border-[#141414] bg-[#E4E3E0] px-6 py-4 text-center shadow-[4px_4px_0_0_#141414]">
                <span className="flex items-center gap-2 text-[#141414]">
                  <Pause size={24} strokeWidth={2.5} className="shrink-0" aria-hidden />
                  <span className="text-2xl font-bold uppercase tracking-[0.2em] sm:text-3xl">{t('app.paused')}</span>
                </span>
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#141414]/80 sm:text-sm">
                  <Play size={16} className="shrink-0" aria-hidden />
                  {t('app.resumeHint')}
                </span>
              </span>
            </button>,
            document.body,
          )
        : null}
      {/* TopBar floats above pause overlay so speed controls stay usable */}
      <div className="absolute top-0 inset-x-0" style={{ zIndex: Z_INDEX.gameHeader }}>
        <TopBar
          inGameMinutes={gameState.inGameMinutes}
          rating={gameState.rating}
          cash={gameState.cash}
          morale={gameState.morale}
          timeMultiplier={gameState.timeMultiplier}
          setTimeMultiplier={setTimeMultiplier}
          formatTime={formatTime}
          difficulty={gameState.difficulty}
          nightNumber={gameState.nightNumber}
          isOvertime={isOvertime}
          activeRules={gameState.activeRules}
        />
      </div>
      <ToastContainer />
      {activeDialogue && (
        <MrVDialogue lines={activeDialogue} onDismiss={onDialogueDismiss} />
      )}
      <BossEncounterOverlay />
    </div>
  );
}

export default function App() {
  const { t } = useTranslation('common');
  React.useEffect(() => { document.title = t('appTitle'); }, [t]);
  const [phase, setPhase] = React.useState<GamePhase>('LANDING');
  const [difficulty, setDifficulty] = React.useState(1);
  const [playerName, setPlayerName] = React.useState('');
  const [playerAvatarIndex, setPlayerAvatarIndex] = React.useState(0);

  const playerIdentity = React.useMemo((): {
    name: string;
    traits: VisualTraits;
  } | null => {
    if (!playerName.trim()) return null;
    const traits = INTRO_AVATARS[playerAvatarIndex] ?? INTRO_AVATARS[0];
    return { name: playerName, traits };
  }, [playerName, playerAvatarIndex]);
  const [persist, setPersist] = React.useState<{ cash: number; rating: number; morale: number; nightNumber: number } | undefined>(undefined);
  const campaign = useCampaign();

  const [dialogueQueue, setDialogueQueue] = React.useState<string[][]>([]);
  const [activeDialogue, setActiveDialogue] = React.useState<string[] | null>(null);

  const onShowDialogue = React.useCallback((lines: string[]) => {
    setDialogueQueue(prev => [...prev, lines]);
  }, []);

  const onDialogueDismiss = React.useCallback(() => {
    setActiveDialogue(null);
  }, []);

  React.useEffect(() => {
    if (activeDialogue !== null) return;
    if (dialogueQueue.length === 0) return;
    const [next, ...rest] = dialogueQueue;
    setActiveDialogue(next ?? null);
    setDialogueQueue(rest);
  }, [activeDialogue, dialogueQueue]);

  React.useEffect(() => {
    setDialogueQueue([]);
    setActiveDialogue(null);
  }, [phase]);

  const handleShiftEnd = React.useCallback((ledger: LedgerData, lossReason: 'MORALE' | 'VIP' | 'BANNED' | null) => {
    if (lossReason) {
      campaign.fireCorkboard(lossReason, ledger);
    } else {
      const nextNightNumber = campaign.campaignState.nightNumber + 1;
      campaign.advanceNight(ledger);
      setPersist({
        cash: ledger.cash,
        rating: ledger.rating,
        morale: ledger.morale,
        nightNumber: nextNightNumber,
      });
    }
    setPhase('CORKBOARD');
  }, [campaign]);

  const handleOpenRestaurant = React.useCallback(() => {
    setPhase('PLAYING');
  }, []);

  const handleLeave = React.useCallback(() => {
    campaign.resetCampaign();
    setPersist(undefined);
    setPlayerName('');
    setPlayerAvatarIndex(0);
    const s = getSharedAmbienceSounds();
    s.rainLoop.stop();
    s.jazzLoop.stop();
    setPhase('LANDING');
  }, [campaign]);

  const handleStartFromLanding = React.useCallback(() => {
    if (DEV_START_NIGHT >= 2) {
      campaign.setDevCampaignNight(DEV_START_NIGHT);
      setPersist({
        cash: 0,
        rating: 5,
        morale: 100,
        nightNumber: DEV_START_NIGHT,
      });
      setDifficulty(1);
      setPlayerName('');
      setPlayerAvatarIndex(0);
      setPhase('PLAYING');
      return;
    }
    campaign.resetCampaign();
    setPersist(undefined);
    setPhase('INTRO');
  }, [campaign]);

  const handleIntroComplete = React.useCallback(
    (d: number, name: string, avatar: number) => {
      campaign.resetCampaign();
      setPersist(undefined);
      setDifficulty(d);
      setPlayerName(name);
      setPlayerAvatarIndex(avatar);
      setPhase('PLAYING');
    },
    [campaign],
  );

  // DEV ONLY — Shift+C jumps to corkboard with mock data; Shift+F jumps to fired screen
  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    const DEV_LEDGER: LedgerData = {
      cash: 1240, netProfit: 340, rating: 4.2, morale: 72,
      coversSeated: 18, shiftRevenue: 1440, salaryCost: 800,
      electricityCost: 200, foodCost: 100,
      logs: [
        'Party of 2 seated (reservation).',
        'Walk-in refused — no tables available.',
        'Scammer caught and removed.',
        'VIP Marcel Dupont seated.',
        'Last call — table cleared early.',
        'Party of 4 seated.',
        'Reservation no-show marked.',
        'Rush hour — 3 parties in queue.',
      ],
    };
    const handler = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      if (e.key === 'C') {
        campaign.advanceNight(DEV_LEDGER);
        setPhase('CORKBOARD');
      }
      if (e.key === 'F') {
        campaign.fireCorkboard('MORALE', DEV_LEDGER);
        setPhase('CORKBOARD');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [campaign]);

  return (
    <>
      <AudioMuteButton />
      {phase === 'LANDING' && (
        <LandingPage onStartGame={handleStartFromLanding} />
      )}
      {phase === 'INTRO' && (
        <IntroSequence onComplete={handleIntroComplete} />
      )}
      {phase === 'CORKBOARD' && campaign.campaignState.lastNightLedger && (
        <CorkboardScreen
          variant={campaign.campaignState.lossReason ? 'fired' : 'next_night'}
          nightNumber={campaign.campaignState.nightNumber}
          activePath={campaign.activePath}
          ledger={campaign.campaignState.lastNightLedger}
          firedReason={campaign.campaignState.lossReason ?? undefined}
          onOpenRestaurant={handleOpenRestaurant}
          onLeave={handleLeave}
        />
      )}
      {phase === 'PLAYING' && (
        <GameProvider
          incrementPathScore={campaign.incrementPathScore}
          pathScores={campaign.campaignState.pathScores}
          nightConfig={campaign.activeNightConfig}
          onShowDialogue={onShowDialogue}
        >
          <GameContent
            initialDifficulty={difficulty}
            persist={persist}
            onShiftEnd={handleShiftEnd}
            playerIdentity={playerIdentity}
            activeDialogue={activeDialogue}
            onDialogueDismiss={onDialogueDismiss}
          />
        </GameProvider>
      )}
    </>
  );
}
