import React from 'react';
import { Book, Check } from 'lucide-react';
import { Reservation } from '../types';

interface BookingListProps {
  reservations: Reservation[];
  inGameMinutes: number;
  formatTime: (minutes: number) => string;
  toggleArrived: (id: string) => void;
}

export const BookingList: React.FC<BookingListProps> = ({
  reservations,
  inGameMinutes,
  formatTime,
  toggleArrived,
}) => {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h2 className="font-serif italic text-2xl flex items-center gap-2">
          <Book size={24} />
          The Booking List
        </h2>
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
          Tonight's Reservations
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border border-[#141414] rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#141414] text-[#E4E3E0] text-[10px] uppercase tracking-wider font-bold">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Name</th>
              <th className="p-3">Size</th>
              <th className="p-3 text-center">Arrived</th>
            </tr>
          </thead>
          <tbody className="font-mono text-sm">
            {reservations.map((res) => {
              const isCurrentTime = Math.abs(inGameMinutes - res.time) <= 30;
              return (
                <tr 
                  key={res.id} 
                  className={`border-b border-[#141414]/10 transition-colors hover:bg-[#141414]/5 ${
                    isCurrentTime ? 'bg-emerald-50' : ''
                  } ${res.arrived ? 'opacity-40' : ''}`}
                >
                  <td className="p-3 font-bold">{formatTime(res.time)}</td>
                  <td className="p-3">{res.firstName} {res.lastName}</td>
                  <td className="p-3">{res.partySize}</td>
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => toggleArrived(res.id)}
                      className={`w-6 h-6 border-2 border-[#141414] rounded flex items-center justify-center transition-colors ${
                        res.arrived ? 'bg-[#141414] text-white' : 'bg-white'
                      }`}
                    >
                      {res.arrived && <Check size={14} />}
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
