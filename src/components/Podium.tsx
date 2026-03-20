import React from 'react';
import { Users, MessageSquare, Search, Check, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client } from '../types';

interface PodiumProps {
  currentClient: Client | null;
  queueLength: number;
  askQuestion: (field: 'firstName' | 'lastName' | 'time') => void;
  callOutLie: (field: 'size' | 'time' | 'reservation') => void;
  handleDecision: (accepted: boolean) => void;
  waitInLine: () => void;
  seatParty: () => void;
  formatTime: (minutes: number) => string;
}

export const Podium: React.FC<PodiumProps> = ({
  currentClient,
  queueLength,
  askQuestion,
  callOutLie,
  handleDecision,
  waitInLine,
  seatParty,
  formatTime,
}) => {
  const [showLieMenu, setShowLieMenu] = React.useState(false);

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif italic text-2xl">The Podium</h2>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-50 font-bold">
          <Users size={14} />
          Queue: {queueLength}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {currentClient ? (
            <motion.div
              key={currentClient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white border border-[#141414] p-8 rounded-2xl shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] flex flex-col gap-6 relative overflow-hidden"
            >
              {/* Patience Bar */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
                <motion.div 
                  className={`h-full transition-all duration-500 ${
                    currentClient.patience > 50 ? 'bg-emerald-500' : 
                    currentClient.patience > 20 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${currentClient.patience}%` }}
                />
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Current Guest</span>
                  <h3 className="text-3xl font-bold mt-1">
                    {currentClient.knownFirstName || '???'} {currentClient.knownLastName || '???'}
                  </h3>
                  <div className="text-sm opacity-60 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="flex items-center gap-0.5 bg-[#141414]/5 px-2 py-1 rounded-lg">
                      {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
                        <span key={i} className="text-xs">👤</span>
                      ))}
                    </div>
                    {currentClient.knownTime !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="opacity-40">•</span>
                        <span>Booked for <span className="font-bold">{formatTime(currentClient.knownTime)}</span></span>
                      </div>
                    )}
                  </div>
                  {currentClient.isLate && (
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-1">
                      <AlertCircle size={12} />
                      LATE ARRIVAL
                    </div>
                  )}
                </div>
                {currentClient.isCaught && (
                  <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold border border-red-200 flex items-center gap-1">
                    <AlertCircle size={12} />
                    CAUGHT LIE
                  </div>
                )}
              </div>

              {/* Chat History */}
              <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto bg-[#f9f9f9] p-4 rounded-xl border border-[#141414] flex flex-col gap-3 font-mono text-xs custom-scrollbar">
                {currentClient.chatHistory.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.sender === 'maitre-d' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[8px] uppercase tracking-widest opacity-40 mb-1">
                      {msg.sender === 'maitre-d' ? 'Maitre D\'' : 'Guest'}
                    </span>
                    <div className={`px-3 py-2 rounded-lg max-w-[90%] border ${
                      msg.sender === 'maitre-d' 
                        ? 'bg-[#141414] text-white border-[#141414]' 
                        : 'bg-white text-[#141414] border-[#141414]/20'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => askQuestion('firstName')}
                  className="flex flex-col items-center gap-2 p-3 border border-[#141414] rounded-xl hover:bg-[#141414] hover:text-white transition-all group"
                >
                  <Search size={16} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-center">First Name</span>
                </button>
                <button 
                  onClick={() => askQuestion('lastName')}
                  className="flex flex-col items-center gap-2 p-3 border border-[#141414] rounded-xl hover:bg-[#141414] hover:text-white transition-all group"
                >
                  <Search size={16} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-center">Last Name</span>
                </button>
                <button 
                  onClick={() => askQuestion('time')}
                  className="flex flex-col items-center gap-2 p-3 border border-[#141414] rounded-xl hover:bg-[#141414] hover:text-white transition-all group"
                >
                  <Search size={16} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-center">Booking Time</span>
                </button>
                <button 
                  onClick={() => setShowLieMenu(!showLieMenu)}
                  className={`col-span-3 flex flex-col items-center gap-2 p-3 border-2 border-orange-600 rounded-xl transition-all group ${
                    showLieMenu ? 'bg-orange-600 text-white' : 'text-orange-600 hover:bg-orange-600 hover:text-white'
                  }`}
                >
                  <AlertCircle size={16} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-center">Call Out Lie</span>
                </button>
              </div>

              {/* Lie Menu */}
              <AnimatePresence>
                {showLieMenu && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-2 bg-orange-50 p-3 rounded-xl border border-orange-200 overflow-hidden"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-800">What are they lying about?</p>
                    <div className="flex gap-2">
                      <button onClick={() => { callOutLie('size'); setShowLieMenu(false); }} className="flex-1 text-[9px] font-bold uppercase p-2 bg-white border border-orange-300 rounded hover:bg-orange-600 hover:text-white transition-colors">Wrong Party Size</button>
                      <button onClick={() => { callOutLie('time'); setShowLieMenu(false); }} className="flex-1 text-[9px] font-bold uppercase p-2 bg-white border border-orange-300 rounded hover:bg-orange-600 hover:text-white transition-colors">Arriving Late</button>
                      <button onClick={() => { callOutLie('reservation'); setShowLieMenu(false); }} className="flex-1 text-[9px] font-bold uppercase p-2 bg-white border border-orange-300 rounded hover:bg-orange-600 hover:text-white transition-colors">No Reservation</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3 pt-4 border-t border-[#141414]/10">
                <div className="flex gap-3">
                  <button 
                    onClick={seatParty}
                    className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-[0px_4px_0px_0px_rgba(5,150,105,1)] active:translate-y-1 active:shadow-none"
                  >
                    <Check size={20} />
                    SEAT PARTY
                  </button>
                  <button 
                    onClick={waitInLine}
                    className="flex-1 bg-amber-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors shadow-[0px_4px_0px_0px_rgba(217,119,6,1)] active:translate-y-1 active:shadow-none"
                  >
                    <MessageSquare size={20} />
                    WAIT IN LINE
                  </button>
                </div>
                <button 
                  onClick={() => handleDecision(false)}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-[0px_4px_0px_0px_rgba(185,28,28,1)] active:translate-y-1 active:shadow-none"
                >
                  <X size={20} />
                  REFUSE ENTRY
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-[#141414] rounded-2xl">
              <Users size={48} />
              <p className="font-bold mt-4 uppercase tracking-widest">Waiting for next guest...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
