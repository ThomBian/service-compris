import { useState, useCallback } from 'react';

import { STORAGE_KEYS } from '@/src/storageKeys';

export const TOUR_SEEN_KEY = STORAGE_KEYS.tourSeen;

export interface TourControls {
  isTourActive: boolean;
  currentStep: number;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
}

export function useTour(totalSteps: number): TourControls {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsTourActive(true);
  }, []);

  const skipTour = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.tourSeen, 'true');
    } catch {
      /* ignore */
    }
    setIsTourActive(false);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((s) => {
      if (s >= totalSteps - 1) {
        try {
          localStorage.setItem(STORAGE_KEYS.tourSeen, 'true');
        } catch {
          /* ignore */
        }
        setIsTourActive(false);
        return s;
      }
      return s + 1;
    });
  }, [totalSteps]);

  return { isTourActive, currentStep, startTour, nextStep, skipTour };
}
