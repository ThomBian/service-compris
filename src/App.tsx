import React from 'react';
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
      <ScenePanel view={view} onSeatParty={handleSeatParty} />
      <BottomPanel view={view} />
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
