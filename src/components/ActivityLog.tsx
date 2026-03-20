import React from 'react';

interface ActivityLogProps {
  logs: string[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  return (
    <div className="h-full overflow-y-auto flex flex-col gap-2 font-mono text-xs">
      {logs.length === 0 && <p className="text-xs italic opacity-40">No activity yet.</p>}
      {logs.map((log, i) => (
        <div key={i} className="flex gap-2">
          <span className="opacity-30">[{i}]</span>
          <span>{log}</span>
        </div>
      ))}
    </div>
  );
};
