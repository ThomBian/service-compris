import React from "react";
import { Book, Check } from "lucide-react";
import { useGame } from "../../context/GameContext";
import { formatTime } from "../../utils";
import { Reservation, ClientType, PhysicalState } from "../../types";

export const BookingLedger: React.FC = () => {
  const {
    gameState: { reservations, inGameMinutes, currentClient, nightNumber },
    toggleReservationArrived,
  } = useGame();

  const sortedReservations = reservations.sort(
    (a: Reservation, b: Reservation) => a.time - b.time,
  );

  // Both first AND last name must be known before highlighting a conflict.
  // This prevents false positives on first-name matches and requires the player
  // to ask for both name fields before the visual cue fires — by design.
  const highlight =
    nightNumber === 1 &&
    currentClient?.type === ClientType.LEGITIMATE &&
    currentClient?.physicalState === PhysicalState.AT_DESK;

  const conflictReservationId = (() => {
    if (!currentClient?.knownFirstName || !currentClient?.knownLastName)
      return null;
    const match = reservations.find(
      (r) =>
        r.partySeated &&
        r.firstName === currentClient.knownFirstName &&
        r.lastName === currentClient.knownLastName,
    );
    return match?.id ?? null;
  })();

  return (
    <div
      className="relative rounded-xl p-[2px] h-full flex flex-col shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]"
      style={{ background: highlight ? '#8b3a0a' : '#141414' }}
    >
      {highlight && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <div style={{ position: 'absolute', inset: '-100%', background: 'conic-gradient(#f0c040 0deg, #f0c040 90deg, #8b3a0a 120deg, #8b3a0a 360deg)', animation: 'borderSpin 0.6s linear infinite' }} />
        </div>
      )}
    <div className="relative flex-1 min-h-0 bg-white rounded-[10px] p-3 flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <Book size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">
          Booking Ledger
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
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
            {sortedReservations.map((res) => {
              const isCurrentTime = Math.abs(inGameMinutes - res.time) <= 30;
              const isConflict = conflictReservationId === res.id;
              return (
                <tr
                  key={res.id}
                  className={`border-b border-[#141414]/10 transition-colors hover:bg-[#141414]/5 ${
                    isCurrentTime && !isConflict ? "bg-emerald-50" : ""
                  } ${res.arrived && !isConflict ? "opacity-40" : ""} ${
                    isConflict
                      ? "bg-red-100 ring-2 ring-red-500 ring-inset"
                      : ""
                  }`}
                >
                  <td className="p-2 font-bold">{formatTime(res.time)}</td>
                  <td className="p-2">
                    {res.firstName} {res.lastName}
                    {isConflict && (
                      <span className="ml-1 text-red-600 font-bold text-[10px]">
                        ⚠ ALREADY IN
                      </span>
                    )}
                  </td>
                  <td className="p-2">{res.partySize}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => toggleReservationArrived(res.id)}
                      className={`w-5 h-5 border-2 border-[#141414] rounded flex items-center justify-center transition-colors ${
                        res.arrived ? "bg-[#141414] text-white" : "bg-white"
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
    </div>
  );
};
