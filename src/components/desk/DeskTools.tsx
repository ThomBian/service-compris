import React from 'react';
import { useGame } from '../../context/GameContext';
import { BookingLedger } from './BookingLedger';
import { Clipboard } from './Clipboard';
import { PartyTicket } from './PartyTicket';
import { MiniGrid } from './MiniGrid';

export const DeskTools: React.FC = () => {
  const { gameState } = useGame();
  const { revealedTools } = gameState;

  const showLedger = revealedTools.includes('LEDGER');
  const showTicket = revealedTools.includes('PARTY_TICKET');
  const showClipboard =
    revealedTools.includes('CLIPBOARD_VIP') || revealedTools.includes('CLIPBOARD_BANNED');

  return (
    <div className="h-full bg-[#E4E3E0] grid grid-cols-[auto_1.5fr_1fr_1fr] gap-4 p-4 overflow-hidden">
      <MiniGrid />
      {showTicket ? <PartyTicket /> : <div className="min-h-0" aria-hidden />}
      {showLedger ? <BookingLedger /> : <div className="min-h-0" aria-hidden />}
      {showClipboard ? <Clipboard /> : <div className="min-h-0" aria-hidden />}
    </div>
  );
};
