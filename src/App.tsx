import React from 'react';
import { Pause, Play } from 'lucide-react';
import { formatTime } from './utils';
import { GameProvider, useGame } from './context/GameContext';
import { PhysicalState, CellState, GameOverReason, type VisualTraits } from './types';
import { SALARY_COST, ELECTRICITY_COST, FOOD_COST_PER_COVER, DOORS_CLOSE_TIME } from './constants';
import { TopBar } from './components/TopBar';
import { ScenePanel } from './components/ScenePanel';
import { BottomPanel } from './components/BottomPanel';
import { ToastContainer } from './components/ToastContainer';
import { HowToPlay } from './components/HowToPlay';
import { LandingPage } from './components/LandingPage';
import { EndOfNightSummary } from './components/EndOfNightSummary';

type SummaryLoseReason =
  | 'none'
  | 'bankruptcy'
  | 'morale'
  | 'vip'
  | 'banned';

/** How the night ended for the summary screen (bankruptcy can happen without gameOver). */
function summaryLoseReason(
  gameOver: boolean,
  reason: GameOverReason,
  morale: number,
  cashAfter: number,
): SummaryLoseReason {
  if (!gameOver) {
    return cashAfter < 0 ? 'bankruptcy' : 'none';
  }
  if (reason === 'MORALE') return 'morale';
  if (reason === 'VIP') return 'vip';
  if (reason === 'BANNED') return 'banned';
  // Legacy / defensive: game ended but reason not set — infer from state
  return morale <= 0 ? 'morale' : 'vip';
}

interface GameContentProps {
  initialDifficulty: number;
  onShowHelp: () => void;
  onTryAgain: () => void;
}

function GameContent({ initialDifficulty, onShowHelp, onTryAgain }: GameContentProps) {
  const { gameState, seatParty, setTimeMultiplier, resetGame } = useGame();
  const [view, setView] = React.useState<'desk' | 'floorplan'>('desk');

  const isOvertime = gameState.inGameMinutes >= DOORS_CLOSE_TIME;
  const hasOccupiedCells = gameState.grid.flat().some(c => c.state === CellState.OCCUPIED);
  const showSummary = gameState.gameOver || (isOvertime && !hasOccupiedCells);

  const [nightStartStats, setNightStartStats] = React.useState({
    cash: gameState.cash, rating: gameState.rating, morale: gameState.morale,
  });

  React.useEffect(() => {
    setNightStartStats({ cash: gameState.cash, rating: gameState.rating, morale: gameState.morale });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.nightNumber]);

  React.useEffect(() => {
    resetGame(initialDifficulty);
  }, []);

  React.useEffect(() => {
    if (isOvertime && !showSummary) {
      setView('floorplan');
      return;
    }
    if (view === 'floorplan' && gameState.currentClient?.physicalState !== PhysicalState.SEATING) {
      setView('desk');
    }
  }, [view, gameState.currentClient?.physicalState, isOvertime, showSummary]);

  const handleSeatParty = () => {
    seatParty();
    setView('floorplan');
  };

  const handleDifficultyChange = (d: number) => {
    resetGame(d);
  };

  const overtimeMinutes = Math.max(0, gameState.inGameMinutes - DOORS_CLOSE_TIME);
  const bill = (SALARY_COST + ELECTRICITY_COST) + gameState.coversSeated * FOOD_COST_PER_COVER;
  const cashAfter = gameState.cash - bill;

  const loseReason = summaryLoseReason(
    gameState.gameOver,
    gameState.gameOverReason,
    gameState.morale,
    cashAfter,
  );

  let loseCharacterName: string | undefined;
  let loseCharacterTraits: VisualTraits | undefined;
  if (loseReason === 'vip' && gameState.gameOverVipId) {
    const vip = gameState.dailyVips.find((v) => v.id === gameState.gameOverVipId);
    if (vip) {
      loseCharacterName = vip.name;
      loseCharacterTraits = vip.visualTraits;
    }
  } else if (loseReason === 'banned' && gameState.gameOverBannedId) {
    const banned = gameState.dailyBanned.find((b) => b.id === gameState.gameOverBannedId);
    if (banned) {
      loseCharacterName = banned.name;
      loseCharacterTraits = banned.visualTraits;
    }
  }

  const summaryData = {
    nightNumber: gameState.nightNumber,
    shiftRevenue: gameState.shiftRevenue,
    coversSeated: gameState.coversSeated,
    overtimeMinutes,
    cashBefore: nightStartStats.cash,
    ratingBefore: nightStartStats.rating,
    moraleBefore: nightStartStats.morale,
    cashAfter: Math.max(0, cashAfter),
    ratingAfter: Math.max(1.0, gameState.rating),
    moraleAfter: gameState.morale,
    loseReason,
    ...(loseCharacterName && loseCharacterTraits
      ? { loseCharacterName, loseCharacterTraits }
      : {}),
  };

  const handleNextShift = () => {
    const persist = {
      cash: Math.max(0, cashAfter),
      rating: Math.max(1.0, gameState.rating),
      morale: Math.max(0, gameState.morale),
      nightNumber: gameState.nightNumber + 1,
    };
    resetGame(gameState.difficulty, persist);
    setNightStartStats({ cash: persist.cash, rating: persist.rating, morale: persist.morale });
  };

  const handleTryAgain = () => {
    onTryAgain();
  };

  return (
    <div className="h-screen flex flex-col bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      {!showSummary && (
        <TopBar
          inGameMinutes={gameState.inGameMinutes}
          rating={gameState.rating}
          cash={gameState.cash}
          morale={gameState.morale}
          timeMultiplier={gameState.timeMultiplier}
          setTimeMultiplier={setTimeMultiplier}
          formatTime={formatTime}
          difficulty={gameState.difficulty}
          onDifficultyChange={handleDifficultyChange}
          onHelpClick={onShowHelp}
          nightNumber={gameState.nightNumber}
          isOvertime={isOvertime && !showSummary}
        />
      )}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">
        <ScenePanel view={view} onSeatParty={handleSeatParty} />
        <BottomPanel view={view} isOvertime={isOvertime && !showSummary} />
        {gameState.timeMultiplier === 0 && !showSummary && (
          <button
            type="button"
            className="absolute inset-0 z-10 flex cursor-pointer items-start justify-center border-0 bg-[#141414]/12 px-4 pt-4 pb-0 transition-colors hover:bg-[#141414]/18 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141414] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E4E3E0] sm:pt-5"
            onClick={() => setTimeMultiplier(gameState.difficulty === 3 ? 3 : 1)}
            aria-label={
              gameState.difficulty === 3
                ? 'Resume game at 3× speed'
                : 'Resume game at normal speed'
            }
          >
            <span className="pointer-events-none flex max-w-[min(100%,20rem)] flex-col items-center gap-2 rounded-2xl border-2 border-[#141414] bg-[#E4E3E0] px-6 py-4 text-center shadow-[4px_4px_0_0_rgba(20,20,20,1)]">
              <span className="flex items-center gap-2 text-[#141414]">
                <Pause size={24} strokeWidth={2.5} className="shrink-0" aria-hidden />
                <span className="text-2xl font-bold uppercase tracking-[0.2em] sm:text-3xl">Paused</span>
              </span>
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#141414]/80 sm:text-sm">
                <Play size={16} className="shrink-0" aria-hidden />
                Click anywhere to resume
              </span>
            </span>
          </button>
        )}
        {showSummary && (
          <EndOfNightSummary
            data={summaryData}
            onNextShift={handleNextShift}
            onTryAgain={handleTryAgain}
          />
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  const [gameStarted, setGameStarted] = React.useState(false);
  const [difficulty, setDifficulty] = React.useState(1);
  const [showHelp, setShowHelp] = React.useState(false);

  const handleCloseHelp = () => {
    setShowHelp(false);
    localStorage.setItem('service-compris-help-seen', 'true');
  };

  return (
    <>
      {gameStarted ? (
        <GameProvider>
          <GameContent
            initialDifficulty={difficulty}
            onShowHelp={() => setShowHelp(true)}
            onTryAgain={() => setGameStarted(false)}
          />
        </GameProvider>
      ) : (
        <LandingPage
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          onStartGame={() => setGameStarted(true)}
          onShowHelp={() => setShowHelp(true)}
        />
      )}
      {showHelp && <HowToPlay onClose={handleCloseHelp} />}
    </>
  );
}
