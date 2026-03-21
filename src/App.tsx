import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatTime } from './utils';
import { GameProvider, useGame } from './context/GameContext';

// Components
import { TopBar } from './components/TopBar';
import { Podium } from './components/Podium';
import { BookingList } from './components/BookingList';
import { ActivityLog } from './components/ActivityLog';
import { QueuePreview } from './components/QueuePreview';
import { FloorplanGrid } from './components/FloorplanGrid';
import { RightPanel } from './components/RightPanel';
import { useMediaQuery } from './hooks/useMediaQuery';

function GameContent() {
  const {
    gameState,
    askQuestion,
    callOutLie,
    handleDecision,
    waitInLine,
    seatParty,
    toggleReservationArrived,
    setTimeMultiplier
  } = useGame();

  const [showLogs, setShowLogs] = React.useState(false);
  const isLg = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      <TopBar
        inGameMinutes={gameState.inGameMinutes}
        rating={gameState.rating}
        cash={gameState.cash}
        morale={gameState.morale}
        timeMultiplier={gameState.timeMultiplier}
        setTimeMultiplier={setTimeMultiplier}
        formatTime={formatTime}
        showLogs={showLogs}
        toggleLogs={() => setShowLogs(!showLogs)}
      />

      <main className="grid grid-cols-1 md:grid-cols-[45%_55%] lg:grid-cols-12 gap-0 h-[calc(100vh-65px)] relative">
        {/* Left Column: Podium & Queue — visible at all breakpoints */}
        <div className="lg:col-span-4 flex flex-col border-r border-[#141414] overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Podium
              currentClient={gameState.currentClient}
              queueLength={gameState.queue.length}
              askQuestion={askQuestion}
              callOutLie={callOutLie}
              handleDecision={handleDecision}
              waitInLine={waitInLine}
              seatParty={seatParty}
              formatTime={formatTime}
            />
          </div>
          <div className="h-40 border-t border-[#141414] bg-stone-50 p-6 overflow-hidden shrink-0">
            <QueuePreview queue={gameState.queue} />
          </div>
        </div>

        {/* RightPanel — tablet only (md, not lg) */}
        <div className="hidden md:flex lg:hidden flex-col overflow-hidden">
          <RightPanel
            gameState={gameState}
            inGameMinutes={gameState.inGameMinutes}
            formatTime={formatTime}
            toggleArrived={toggleReservationArrived}
            logs={gameState.logs}
          />
        </div>

        {/* Middle Column: Floorplan — desktop only */}
        <div className="hidden lg:flex lg:col-span-5 flex-col border-r border-[#141414] overflow-hidden bg-[#E4E3E0]">
          <FloorplanGrid />
        </div>

        {/* Right Column: Booking List — desktop only */}
        <div className="hidden lg:flex lg:col-span-3 bg-white p-6 flex-col gap-6 overflow-hidden">
          <BookingList
            reservations={gameState.reservations}
            inGameMinutes={gameState.inGameMinutes}
            formatTime={formatTime}
            toggleArrived={toggleReservationArrived}
          />
        </div>

        {/* Activity Log Overlay — desktop only, gated with isLg to avoid AnimatePresence conflict */}
        {isLg && (
          <AnimatePresence>
            {showLogs && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 right-0 w-80 bg-stone-100 border-l border-[#141414] shadow-2xl z-30 flex flex-col"
              >
                <div className="p-4 border-b border-[#141414] flex items-center justify-between bg-[#141414] text-[#E4E3E0]">
                  <h3 className="font-serif italic text-lg">Activity Log</h3>
                  <button
                    onClick={() => setShowLogs(false)}
                    className="hover:opacity-70 transition-opacity text-xs font-bold"
                  >
                    CLOSE
                  </button>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                  <ActivityLog logs={gameState.logs} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
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
