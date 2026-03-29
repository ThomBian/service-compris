import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DeskScene } from './scene/DeskScene';
import { FloorplanScene } from './scene/FloorplanScene';

interface ScenePanelProps {
  view: 'desk' | 'floorplan';
  onSeatParty: () => void;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({ view, onSeatParty }) => {
  return (
    <div className="h-[50vh] shrink-0 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {view === 'desk' ? (
          <motion.div
            key="desk-scene"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DeskScene onSeatParty={onSeatParty} />
          </motion.div>
        ) : (
          <motion.div
            key="floorplan-scene"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FloorplanScene />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
