import React from 'react';
import { BookingLedger } from './BookingLedger';
import { Clipboard } from './Clipboard';
import { PartyTicket } from './PartyTicket';
import { MiniGrid } from './MiniGrid';

export const DeskTools: React.FC = () => {
  return (
    <div className="h-full bg-[#E4E3E0] grid grid-cols-[1fr_1fr_1.5fr_auto] gap-4 p-4 overflow-hidden">
      <BookingLedger />
      <Clipboard />
      <PartyTicket />
      <MiniGrid />
    </div>
  );
};
