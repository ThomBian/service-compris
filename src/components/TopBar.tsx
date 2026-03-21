import React from 'react';
import { Clock, Star, DollarSign, Play, Pause, FastForward, Heart } from 'lucide-react';

interface TopBarProps {
  inGameMinutes: number;
  rating: number;
  cash: number;
  morale: number;
  timeMultiplier: number;
  setTimeMultiplier: (m: number) => void;
  formatTime: (minutes: number) => string;
  showLogs: boolean;
  toggleLogs: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  inGameMinutes,
  rating,
  cash,
  morale,
  timeMultiplier,
  setTimeMultiplier,
  formatTime,
  showLogs,
  toggleLogs,
}) => {
  return (
    <header className="border-b border-[#141414] p-4 flex items-center justify-between sticky top-0 bg-[#E4E3E0] z-20">
      <div className="flex items-center gap-4 md:gap-8">
        <div className="flex items-center gap-2">
          <Clock size={20} />
          <span className="font-mono text-base md:text-xl font-bold">{formatTime(inGameMinutes)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Star size={20} className="text-yellow-600 fill-yellow-600" />
          <span className="font-mono text-base md:text-xl font-bold">{rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Heart size={20} className="text-red-500 fill-red-500" />
          <span className="font-mono text-base md:text-xl font-bold">{morale}%</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-emerald-700" />
          <span className="font-mono text-base md:text-xl font-bold">{cash}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleLogs}
          className={`hidden lg:block px-4 py-2 rounded-lg border border-[#141414] text-xs font-bold transition-all ${
            showLogs
              ? 'bg-[#141414] text-[#E4E3E0]'
              : 'bg-white hover:bg-[#141414]/5'
          }`}
        >
          {showLogs ? 'HIDE LOGS' : 'SHOW LOGS'}
        </button>

        <div className="flex items-center gap-2 bg-white/50 p-1 rounded-lg border border-[#141414]/10">
          {[0, 1, 2, 3].map(m => (
            <button
              key={m}
              onClick={() => setTimeMultiplier(m)}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                timeMultiplier === m 
                  ? 'bg-[#141414] text-[#E4E3E0]' 
                  : 'hover:bg-[#141414]/10'
              }`}
            >
              {m === 0 ? <Pause size={14} /> : m === 1 ? <Play size={14} /> : m === 2 ? <FastForward size={14} /> : '3x'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
