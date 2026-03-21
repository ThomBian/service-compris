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
  const [showBookings, setShowBookings] = React.useState(false);
  const is2xl = useMediaQuery('(min-width: 1536px)');

  const toggleLogs = () => {
    setShowLogs(v => !v);
    setShowBookings(false);
  };
  const toggleBookings = () => {
    setShowBookings(v => !v);
    setShowLogs(false);
  };

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
        toggleLogs={toggleLogs}
        showBookings={showBookings}
        toggleBookings={toggleBookings}
        is2xl={is2xl}
      />

      <main className="grid grid-cols-1 md:grid-cols-[45%_55%] 2xl:grid-cols-12 gap-0 h-[calc(100vh-65px)] relative">
        {/* Left Column: Podium & Queue — always visible */}
        <div className="2xl:col-span-4 flex flex-col border-r border-[#141414] overflow-hidden">
          <div className="flex-1 overflow-hidden min-h-0">
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
          <div className="h-20 border-t border-[#141414] bg-stone-50 p-3 overflow-hidden shrink-0">
            <QueuePreview queue={gameState.queue} />
          </div>
        </div>

        {/* Right side: FloorplanGrid always visible at md:.
            At 2xl: splits into FloorplanGrid + BookingList columns.
            JS-conditional to avoid two FloorplanGrid instances in the DOM. */}
        {is2xl ? (
          <>
            <div className="col-span-5 flex flex-col border-r border-[#141414] overflow-hidden bg-[#E4E3E0]">
              <FloorplanGrid />
            </div>
            <div className="col-span-3 bg-white p-6 flex flex-col gap-6 overflow-hidden">
              <BookingList
                reservations={gameState.reservations}
                inGameMinutes={gameState.inGameMinutes}
                formatTime={formatTime}
                toggleArrived={toggleReservationArrived}
              />
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-col overflow-hidden bg-[#E4E3E0]">
            <FloorplanGrid />
          </div>
        )}

        {/* Bookings overlay — slides in from right */}
        <AnimatePresence>
          {showBookings && (
            <motion.div
              key="bookings-overlay"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 right-0 w-[28rem] bg-white border-l border-[#141414] shadow-2xl z-30 flex flex-col"
            >
              <div className="p-4 border-b border-[#141414] flex items-center justify-between bg-[#141414] text-[#E4E3E0]">
                <h3 className="font-serif italic text-lg">Reservations</h3>
                <button
                  onClick={() => setShowBookings(false)}
                  className="hover:opacity-70 transition-opacity text-xs font-bold"
                >
                  CLOSE
                </button>
              </div>
              <div className="flex-1 overflow-hidden p-4 flex flex-col gap-6">
                <BookingList
                  reservations={gameState.reservations}
                  inGameMinutes={gameState.inGameMinutes}
                  formatTime={formatTime}
                  toggleArrived={toggleReservationArrived}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Activity Log overlay — slides in from right */}
        <AnimatePresence>
          {showLogs && (
            <motion.div
              key="logs-overlay"
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
