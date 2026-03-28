import { useState } from 'react';

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

  const startTour = () => {
    localStorage.setItem(TOUR_SEEN_KEY, 'true');
    setCurrentStep(0);
    setIsTourActive(true);
  };

  const skipTour = () => {
    setIsTourActive(false);
  };

  const nextStep = () => {
    if (currentStep >= totalSteps - 1) {
      skipTour();
      return;
    }
    setCurrentStep((s) => s + 1);
  };

  return { isTourActive, currentStep, startTour, nextStep, skipTour };
}
