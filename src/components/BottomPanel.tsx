import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DeskTools } from './desk/DeskTools';
import { FloorplanGrid } from './floorplan/FloorplanGrid';

interface BottomPanelProps {
  view: 'desk' | 'floorplan';
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ view }) => {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'desk' ? (
          <motion.div
            key="desk-tools"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DeskTools />
          </motion.div>
        ) : (
          <motion.div
            key="floorplan-grid"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FloorplanGrid />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
