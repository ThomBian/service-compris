import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DeskScene } from './scene/DeskScene';
import type { VisualTraits } from '../types';

interface ScenePanelProps {
  view: 'desk' | 'floorplan';
  onSeatParty: () => void;
  tourSeatPartySpotlight?: boolean;
  playerIdentity?: { name: string; traits: VisualTraits } | null;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({
  view,
  onSeatParty,
  tourSeatPartySpotlight = false,
  playerIdentity = null,
}) => {
  if (view === 'floorplan') return null;

  return (
    <div className="h-[50vh] shrink-0 overflow-x-hidden">
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
            tourSeatPartySpotlight={tourSeatPartySpotlight}
            playerIdentity={playerIdentity}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
