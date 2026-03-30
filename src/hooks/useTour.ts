import { useState, useCallback } from 'react';

export const TOUR_SEEN_KEY = 'service-compris-tour-seen';

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
      localStorage.setItem(TOUR_SEEN_KEY, 'true');
    } catch {
      /* ignore */
    }
    setIsTourActive(false);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((s) => {
      if (s >= totalSteps - 1) {
        try {
          localStorage.setItem(TOUR_SEEN_KEY, 'true');
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
