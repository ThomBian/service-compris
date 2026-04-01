import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DeskScene } from './scene/DeskScene';
import type { VisualTraits } from '../types';

interface ScenePanelProps {
  view: 'desk' | 'floorplan';
  onSeatParty: () => void;
  playerIdentity?: { name: string; traits: VisualTraits } | null;
  /** When the desk bottom bar is hidden (no tools yet), let the street scene grow into the space below. */
  expandDeskScene?: boolean;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({
  view,
  onSeatParty,
  playerIdentity = null,
  expandDeskScene = false,
}) => {
  if (view === 'floorplan') return null;

  return (
    <div
      className={
        expandDeskScene
          ? 'flex min-h-0 flex-1 flex-col overflow-x-hidden'
          : 'h-[50vh] shrink-0 overflow-x-hidden'
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="desk-scene"
          className="h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <DeskScene
            onSeatParty={onSeatParty}
            playerIdentity={playerIdentity}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
