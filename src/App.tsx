import React from 'react';
import { Pause, Play } from 'lucide-react';
import { formatTime } from './utils';
import { GameProvider, useGame } from './context/GameContext';
import { PhysicalState } from './types';
import { TopBar } from './components/TopBar';
import { ScenePanel } from './components/ScenePanel';
import { BottomPanel } from './components/BottomPanel';
import { ToastContainer } from './components/ToastContainer';

function GameContent() {
  const { gameState, seatParty, setTimeMultiplier } = useGame();
  const [view, setView] = React.useState<'desk' | 'floorplan'>('desk');

  React.useEffect(() => {
    if (view === 'floorplan' && gameState.currentClient?.physicalState !== PhysicalState.SEATING) {
      setView('desk');
    }
  }, [view, gameState.currentClient?.physicalState]);

  const handleSeatParty = () => {
    seatParty();
    setView('floorplan');
  };

  return (
    <div className="h-screen flex flex-col bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      <TopBar
        inGameMinutes={gameState.inGameMinutes}
        rating={gameState.rating}
        cash={gameState.cash}
        morale={gameState.morale}
        timeMultiplier={gameState.timeMultiplier}
        setTimeMultiplier={setTimeMultiplier}
        formatTime={formatTime}
      />
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">
        <ScenePanel view={view} onSeatParty={handleSeatParty} />
        <BottomPanel view={view} />
        {gameState.timeMultiplier === 0 && (
          <button
            type="button"
            className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center border-0 bg-[#141414]/50 p-0 backdrop-blur-[3px] transition-colors hover:bg-[#141414]/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141414] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E4E3E0]"
            onClick={() => setTimeMultiplier(1)}
            aria-label="Resume game at normal speed"
          >
            <span className="pointer-events-none flex max-w-[min(100%,20rem)] flex-col items-center gap-3 rounded-2xl border-2 border-[#141414] bg-[#E4E3E0] px-8 py-6 text-center shadow-[4px_4px_0_0_rgba(20,20,20,1)]">
              <span className="flex items-center gap-2 text-[#141414]">
                <Pause size={28} strokeWidth={2.5} className="shrink-0" aria-hidden />
                <span className="text-3xl font-bold uppercase tracking-[0.2em]">Paused</span>
              </span>
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#141414]/80">
                <Play size={16} className="shrink-0" aria-hidden />
                Click anywhere to resume
              </span>
            </span>
          </button>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
