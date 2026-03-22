import React from 'react';
import { Clipboard as ClipboardIcon } from 'lucide-react';

const TABS = ['Menu', 'VIPs', 'Banned'] as const;

export const Clipboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<typeof TABS[number]>('Menu');

  return (
    <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <ClipboardIcon size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Clipboard</span>
      </div>
      <div className="flex gap-1 shrink-0">
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
      <div className="flex-1 p-2 text-[10px] opacity-40 italic overflow-hidden">
        {activeTab} — coming soon
      </div>
    </div>
  );
};
