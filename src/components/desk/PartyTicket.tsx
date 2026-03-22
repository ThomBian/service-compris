import React from "react";
import { Users, MessageSquare, Search, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../../context/GameContext";
import { formatTime } from "../../utils";

export const PartyTicket: React.FC = () => {
  const {
    gameState: { currentClient },
    askQuestion,
    callOutLie,
    handleDecision,
    waitInLine,
  } = useGame();
  const [showLieMenu, setShowLieMenu] = React.useState(false);

  if (!currentClient) {
    return (
      <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden">
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
    <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden relative">
      {/* Patience Bar */}
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

      {/* Shared header */}
      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
        <Users size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Party Ticket</span>
      </div>

      {/* Guest header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold">
            {currentClient.knownFirstName || "???"}{" "}
            {currentClient.knownLastName || "???"}
          </h3>
          <div className="text-xs opacity-60 mt-0.5 flex flex-wrap items-center gap-x-2">
            {currentClient.knownTime !== undefined && (
              <span className="opacity-40">
                Booked: {formatTime(currentClient.knownTime)}
              </span>
            )}
          </div>
          {currentClient.isLate && (
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-1">
              <AlertCircle size={10} />
              LATE ARRIVAL
            </div>
          )}
        </div>
        {currentClient.isCaught && (
          <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 flex items-center gap-1">
            <AlertCircle size={10} />
            CAUGHT
          </div>
        )}
      </div>

      {/* Question buttons */}
      <div className="grid grid-cols-3 gap-2">
        {(["firstName", "lastName", "time"] as const).map((field) => (
          <button
            key={field}
            onClick={() => askQuestion(field)}
            className="flex flex-col items-center gap-1 p-2 border border-[#141414] rounded-xl hover:bg-[#141414] hover:text-white transition-all group"
          >
            <Search
              size={14}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-[8px] font-bold uppercase tracking-wider text-center">
              {field === "firstName"
                ? "First Name"
                : field === "lastName"
                  ? "Last Name"
                  : "Booking Time"}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowLieMenu(!showLieMenu)}
          className={`col-span-3 flex items-center justify-center gap-2 p-2 border-2 border-orange-600 rounded-xl transition-all group ${
            showLieMenu
              ? "bg-orange-600 text-white"
              : "text-orange-600 hover:bg-orange-600 hover:text-white"
          }`}
        >
          <AlertCircle
            size={14}
            className="group-hover:scale-110 transition-transform"
          />
          <span className="text-[9px] font-bold uppercase tracking-wider">
            Call Out Lie
          </span>
        </button>
      </div>

      {/* Lie menu */}
      <AnimatePresence>
        {showLieMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2 bg-orange-50 p-3 rounded-xl border border-orange-200 overflow-hidden"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-800">
              What are they lying about?
            </p>
            <div className="flex gap-2">
              {(["size", "time", "reservation"] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => {
                    callOutLie(field);
                    setShowLieMenu(false);
                  }}
                  className="flex-1 text-[9px] font-bold uppercase p-2 bg-white border border-orange-300 rounded hover:bg-orange-600 hover:text-white transition-colors"
                >
                  {field === "size"
                    ? "Party Size"
                    : field === "time"
                      ? "Arriving Late"
                      : "No Reservation"}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision buttons */}
      <div className="flex gap-2 pt-2 border-t border-[#141414]/10">
        <button
          onClick={waitInLine}
          className="flex-1 bg-amber-500 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-amber-600 transition-colors text-xs shadow-[0px_3px_0px_0px_rgba(217,119,6,1)] active:translate-y-px active:shadow-none"
        >
          <MessageSquare size={14} />
          WAIT IN LINE
        </button>
        <button
          onClick={() => handleDecision()}
          className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-red-700 transition-colors text-xs shadow-[0px_3px_0px_0px_rgba(185,28,28,1)] active:translate-y-px active:shadow-none"
        >
          <X size={14} />
          REFUSE
        </button>
      </div>
    </div>
  );
};
