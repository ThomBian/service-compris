import React from "react";
import { Users, AlertCircle, X } from "lucide-react";
import { motion } from "motion/react";
import { useGame } from "../../context/GameContext";
import { formatTime } from "../../utils";
import { TicketField } from "./TicketField";

export const PartyTicket: React.FC = () => {
  const {
    gameState: { currentClient },
    askQuestion,
    callOutLie,
    handleDecision,
  } = useGame();

  if (!currentClient) {
    return (
      <div data-tour="party-ticket" className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <Users size={12} />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Party Ticket</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-[#141414] rounded-lg">
          <Users size={32} />
          <p className="font-bold mt-2 uppercase tracking-widest text-xs">
            Awaiting next guest...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="party-ticket" className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden relative">
      {/* Patience bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
        <motion.div
          className={`h-full transition-all duration-500 ${
            currentClient.patience > 50
              ? "bg-emerald-500"
              : currentClient.patience > 20
                ? "bg-orange-500"
                : "bg-red-500"
          }`}
          style={{ width: `${currentClient.patience}%` }}
        />
      </div>

      {/* Header: label + caught badge */}
      <div className="flex items-center justify-between shrink-0 pt-0.5">
        <div className="flex items-center gap-1.5">
          <Users size={12} />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Party Ticket</span>
        </div>
        {currentClient.isCaught && (
          <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 flex items-center gap-1">
            <AlertCircle size={10} />
            CAUGHT
          </div>
        )}
      </div>

      {/* System stamp: when they hit the queue (compare vs ledger reservation times). */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-[#141414]/25 bg-[#141414]/4 px-2 py-1.5 shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#141414]/45">
          Joined queue
        </span>
        <span className="text-[13px] font-bold font-mono tabular-nums text-[#141414]">
          {formatTime(currentClient.spawnTime)}
        </span>
      </div>

      {/* Ticket fields */}
      <div className="flex flex-col gap-2 flex-1">
        <TicketField
          label="First Name"
          accuseLabel="No Reservation"
          value={currentClient.knownFirstName}
          onAsk={() => askQuestion('firstName')}
          onAccuse={() => callOutLie('reservation')}
        />
        <TicketField
          label="Last Name"
          accuseLabel="No Reservation"
          value={currentClient.knownLastName}
          onAsk={() => askQuestion('lastName')}
          onAccuse={() => callOutLie('reservation')}
        />
        <div className="flex flex-col gap-0.5">
          <TicketField
            label="Arrival Time"
            accuseLabel="Too Late"
            value={currentClient.knownTime !== undefined ? formatTime(currentClient.knownTime) : undefined}
            onAsk={() => askQuestion('time')}
            onAccuse={() => callOutLie('time')}
          />
          {currentClient.knownTime !== undefined && currentClient.isLate && (
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-1 px-2">
              <AlertCircle size={10} />
              LATE ARRIVAL
            </div>
          )}
        </div>
      </div>

      {/* Refuse button */}
      <div className="pt-2 border-t border-[#141414]/10">
        <button
          onClick={() => handleDecision()}
          className="w-full bg-red-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-red-700 transition-colors text-xs shadow-[0px_3px_0px_0px_rgba(185,28,28,1)] active:translate-y-px active:shadow-none"
        >
          <X size={14} />
          REFUSE
        </button>
      </div>
    </div>
  );
};
