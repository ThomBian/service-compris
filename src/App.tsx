import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pause, Play } from 'lucide-react';
import { formatTime } from './utils';
import { GameProvider, useGame } from './context/GameContext';
import { PhysicalState, CellState } from './types';
import { SALARY_COST, ELECTRICITY_COST, FOOD_COST_PER_COVER, DOORS_CLOSE_TIME } from './constants';
import { TopBar } from './components/TopBar';
import { ScenePanel } from './components/ScenePanel';
import { BottomPanel } from './components/BottomPanel';
import { ToastContainer } from './components/ToastContainer';
import { AudioMuteButton } from './components/AudioMuteButton';
import { LandingPage } from './components/LandingPage';
import { IntroSequence } from './components/intro/IntroSequence';
import { INTRO_AVATARS } from './components/intro/introAvatars';
import { CorkboardScreen } from './components/CorkboardScreen';
import { TourOverlay } from './components/TourOverlay';
import { useTour, TOUR_SEEN_KEY } from './hooks/useTour';
import { TOUR_STEPS, TOUR_STEP_INDEX_SEAT_PARTY } from './tour/tourSteps';
import { useCampaign } from './hooks/useCampaign';
import { useGameAmbience } from './hooks/useGameAmbience';
import type { LedgerData } from './types/campaign';
import type { VisualTraits } from './types';

type GamePhase = 'LANDING' | 'INTRO' | 'CORKBOARD' | 'PLAYING';

interface GameContentProps {
  initialDifficulty: number;
  persist?: { cash: number; rating: number; morale: number; nightNumber: number };
  onShiftEnd: (ledger: LedgerData, lossReason: 'MORALE' | 'VIP' | 'BANNED' | null) => void;
  isTourActive: boolean;
  currentStep: number;
  onTourNext: () => void;
  onTourSkip: () => void;
  startTour: () => void;
  playerIdentity: { name: string; traits: VisualTraits } | null;
}

function GameContent({
  initialDifficulty,
  persist,
  onShiftEnd,
  isTourActive,
  currentStep,
  onTourNext,
  onTourSkip,
  startTour,
  playerIdentity,
}: GameContentProps) {
  const { t } = useTranslation('ui');
  const { gameState, seatParty, setTimeMultiplier, resetGame } = useGame();
  const [view, setView] = React.useState<'desk' | 'floorplan'>('desk');

  const isOvertime = gameState.inGameMinutes >= DOORS_CLOSE_TIME;
  const hasOccupiedCells = gameState.grid.flat().some(c => c.state === CellState.OCCUPIED);
  const summaryBlockedByDesk =
    gameState.currentClient?.physicalState === PhysicalState.SEATING;
  const shiftEnded =
    gameState.gameOver ||
    (isOvertime && !hasOccupiedCells && !summaryBlockedByDesk);

  useGameAmbience({
    shiftEnded,
    timeMultiplier: gameState.timeMultiplier,
    isTourActive,
  });

  React.useEffect(() => {
    resetGame(initialDifficulty, persist);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** First time per install: start tour when the first guest reaches the desk (not at shift start). */
  const tourAutoStartedRef = React.useRef(false);
  React.useEffect(() => {
    try {
      if (localStorage.getItem(TOUR_SEEN_KEY)) return;
    } catch {
      return;
    }
    if (isTourActive || tourAutoStartedRef.current) return;
    if (gameState.currentClient?.physicalState !== PhysicalState.AT_DESK) return;
    tourAutoStartedRef.current = true;
    startTour();
  }, [
    gameState.currentClient?.physicalState,
    gameState.currentClient?.id,
    isTourActive,
    startTour,
  ]);

  // Freeze clock during tour; unfreeze when tour ends
  const tourWasActiveRef = React.useRef(false);
  React.useEffect(() => {
    if (isTourActive) {
      tourWasActiveRef.current = true;
      setTimeMultiplier(0);
    } else if (tourWasActiveRef.current) {
      tourWasActiveRef.current = false;
      setTimeMultiplier(gameState.difficulty === 3 ? 3 : 1);
    }
  }, [isTourActive, setTimeMultiplier, gameState.difficulty]);

  // Switch view to match the current tour step
  React.useEffect(() => {
    if (!isTourActive) return;
    setView(TOUR_STEPS[currentStep].view);
  }, [isTourActive, currentStep, setView]);

  React.useEffect(() => {
    if (isTourActive) return;
    if (isOvertime && !shiftEnded) {
      setView('floorplan');
      return;
    }
    if (view === 'floorplan' && gameState.currentClient?.physicalState !== PhysicalState.SEATING) {
      setView('desk');
    }
  }, [view, gameState.currentClient?.physicalState, isOvertime, shiftEnded, isTourActive]);

  // Fire onShiftEnd exactly once when shift ends
  const shiftEndFiredRef = React.useRef(false);
  React.useEffect(() => {
    if (!shiftEnded || shiftEndFiredRef.current) return;
    shiftEndFiredRef.current = true;

    const foodCost = gameState.coversSeated * FOOD_COST_PER_COVER;
    const bill = SALARY_COST + ELECTRICITY_COST + foodCost;
    const cashAfter = Math.max(0, gameState.cash - bill);

    const ledger: LedgerData = {
      cash: cashAfter,
      netProfit: cashAfter - (persist?.cash ?? 0),
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
    setView('floorplan');
  };

  return (
    <div className="h-screen relative bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      {/* Scene + bottom panel fill full viewport height */}
      <div className={`absolute inset-0 flex flex-col overflow-hidden ${view === 'floorplan' ? 'pt-14' : ''}`}>
        <ScenePanel
          view={view}
          onSeatParty={handleSeatParty}
          tourSeatPartySpotlight={
            isTourActive && currentStep === TOUR_STEP_INDEX_SEAT_PARTY
          }
          playerIdentity={playerIdentity}
        />
        <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">
          <BottomPanel view={view} isOvertime={isOvertime} playerIdentity={playerIdentity} />
          {gameState.timeMultiplier === 0 && !shiftEnded && !isTourActive && (
            <button
              type="button"
              className="absolute inset-0 z-10 flex cursor-pointer items-start justify-center border-0 bg-[#141414]/12 px-4 pt-4 pb-0 transition-colors hover:bg-[#141414]/18 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141414] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E4E3E0] sm:pt-5"
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
            </button>
          )}
        </div>
      </div>
      {/* TopBar floats on top of scene */}
      <div className="absolute top-0 inset-x-0 z-30">
        <TopBar
          inGameMinutes={gameState.inGameMinutes}
          rating={gameState.rating}
          cash={gameState.cash}
          morale={gameState.morale}
          timeMultiplier={gameState.timeMultiplier}
          setTimeMultiplier={setTimeMultiplier}
          formatTime={formatTime}
          difficulty={gameState.difficulty}
          onTourClick={startTour}
          nightNumber={gameState.nightNumber}
          isOvertime={isOvertime}
          activeRules={gameState.activeRules}
          playerIdentity={playerIdentity}
        />
      </div>
      {isTourActive && (
        <TourOverlay
          step={currentStep}
          onNext={onTourNext}
          onSkip={onTourSkip}
        />
      )}
      <ToastContainer />
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
  const tour = useTour(TOUR_STEPS.length);

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
    setPhase('LANDING');
  }, [campaign]);

  const handleStartFromLanding = React.useCallback(() => {
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
        >
          <GameContent
            initialDifficulty={difficulty}
            persist={persist}
            onShiftEnd={handleShiftEnd}
            isTourActive={tour.isTourActive}
            currentStep={tour.currentStep}
            onTourNext={tour.nextStep}
            onTourSkip={tour.skipTour}
            startTour={tour.startTour}
            playerIdentity={playerIdentity}
          />
        </GameProvider>
      )}
    </>
  );
}
