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
      <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0_0_#141414] p-3 flex flex-col gap-2 h-full overflow-hidden">
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
    <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0_0_#141414] p-3 flex flex-col gap-2 h-full overflow-hidden relative">
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

      {/* Header: label + refuse button + caught badge */}
      <div className="flex items-center justify-between shrink-0 pt-0.5">
        <div className="flex items-center gap-1.5">
          <Users size={12} />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Party Ticket</span>
        </div>
        <div className="flex items-center gap-1.5">
          {currentClient.isCaught && (
            <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 flex items-center gap-1">
              <AlertCircle size={10} />
              CAUGHT
            </div>
          )}
          <button
            onClick={() => handleDecision()}
            className="bg-red-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-red-700 text-[10px] shadow-[2px_2px_0_0_#141414] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <X size={11} />
            REFUSE
          </button>
        </div>
      </div>

      {/* Ticket fields */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0">
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
          <div className="flex items-center justify-between px-1 pb-0.5 shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#141414]/40">Joined queue</span>
            <span className="text-[11px] font-bold font-mono tabular-nums text-[#141414]/70">{formatTime(currentClient.spawnTime)}</span>
          </div>
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

    </div>
  );
};
