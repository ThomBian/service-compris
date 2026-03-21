import React from 'react';
import { Users } from 'lucide-react';
import { Client } from '../types';

interface QueuePreviewProps {
  queue: Client[];
}

export const QueuePreview: React.FC<QueuePreviewProps> = ({ queue }) => {
  return (
    <div className="overflow-x-auto custom-scrollbar pb-2">
      <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Waiting Outside</h3>
      <div className="flex gap-2 min-w-max">
        {queue.length === 0 && <p className="text-xs italic opacity-40">The street is empty.</p>}
        {queue.map((c) => (
          <div 
            key={c.id} 
            className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-[#141414] flex items-center justify-center bg-[#E4E3E0] relative group"
          >
            <Users size={16} />
            <div 
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-[#141414]" 
              style={{ height: `${c.patience}%`, opacity: c.patience / 100 }} 
            />
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#141414] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-30">
              Patience: {Math.round(c.patience)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
