import React from 'react';
import { FloorplanGrid } from './FloorplanGrid';
import { BookingList } from './BookingList';
import { ActivityLog } from './ActivityLog';
import { GameState } from '../types';

type Tab = 'floor' | 'bookings' | 'log';

interface RightPanelProps {
  gameState: GameState;
  inGameMinutes: number;
  formatTime: (m: number) => string;
  toggleArrived: (id: string) => void;
  logs: string[];
}

export const RightPanel: React.FC<RightPanelProps> = ({
  gameState,
  inGameMinutes,
  formatTime,
  toggleArrived,
  logs,
}) => {
  const [activeTab, setActiveTab] = React.useState<Tab>('floor');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'floor', label: 'Floor' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'log', label: 'Log' },
  ];

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-[#141414]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab.id
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'bg-[#E4E3E0] text-[#141414] hover:bg-[#141414]/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'floor' && <FloorplanGrid />}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 h-full overflow-hidden flex flex-col gap-6">
            <BookingList
              reservations={gameState.reservations}
              inGameMinutes={inGameMinutes}
              formatTime={formatTime}
              toggleArrived={toggleArrived}
            />
          </div>
        )}
        {activeTab === 'log' && (
          <div className="p-4 h-full overflow-hidden">
            <ActivityLog logs={logs} />
          </div>
        )}
      </div>
    </div>
  );
};
