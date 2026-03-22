import React from 'react';
import { Clipboard as ClipboardIcon } from 'lucide-react';

const TABS = ['Menu', 'VIPs', 'Banned'] as const;

export const Clipboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<typeof TABS[number]>('Menu');

  return (
    <div className="flex flex-col gap-1 h-full">
      <div className="flex items-center gap-2">
        <ClipboardIcon size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Clipboard</span>
      </div>
      <div className="flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'bg-[#141414]/10 hover:bg-[#141414]/20'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 border border-[#141414]/20 rounded-lg p-2 text-[10px] opacity-40 italic">
        {activeTab} — coming soon
      </div>
    </div>
  );
};
