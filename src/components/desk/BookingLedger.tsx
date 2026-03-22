import React from 'react';
import { Book, Check } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { formatTime } from '../../utils';

export const BookingLedger: React.FC = () => {
  const { gameState: { reservations, inGameMinutes }, toggleReservationArrived } = useGame();

  return (
    <div className="flex flex-col gap-2 h-full">
      <h3 className="font-serif italic text-lg flex items-center gap-2">
        <Book size={18} />
        Booking Ledger
      </h3>
      <div className="flex-1 overflow-y-auto border border-[#141414] rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#141414] text-[#E4E3E0] text-[10px] uppercase tracking-wider font-bold">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">Name</th>
              <th className="p-2">Size</th>
              <th className="p-2 text-center">In</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {reservations.map((res) => {
              const isCurrentTime = Math.abs(inGameMinutes - res.time) <= 30;
              return (
                <tr
                  key={res.id}
                  className={`border-b border-[#141414]/10 transition-colors hover:bg-[#141414]/5 ${
                    isCurrentTime ? 'bg-emerald-50' : ''
                  } ${res.arrived ? 'opacity-40' : ''}`}
                >
                  <td className="p-2 font-bold">{formatTime(res.time)}</td>
                  <td className="p-2">{res.firstName} {res.lastName}</td>
                  <td className="p-2">{res.partySize}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => toggleReservationArrived(res.id)}
                      className={`w-5 h-5 border-2 border-[#141414] rounded flex items-center justify-center transition-colors ${
                        res.arrived ? 'bg-[#141414] text-white' : 'bg-white'
                      }`}
                    >
                      {res.arrived && <Check size={12} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
