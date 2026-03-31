import type { Reservation } from '../types';
import { START_TIME } from '../constants';

/**
 * Scripted reservations for Night 1 tutorial only.
 * Spawned on-demand by useScriptedEvents — NOT auto-spawned by useClientSpawner
 * (RESERVATIONS_DISABLED rule blocks auto-spawning).
 * IDs are prefixed 'n1-res-' so useScriptedEvents can identify them.
 */
export const NIGHT_1_RESERVATIONS: Reservation[] = [
  {
    id: 'n1-res-businessman',
    time: START_TIME + 8,
    firstName: 'Henri',
    lastName: 'Moreau',
    partySize: 2,
    arrived: false,
    partySeated: false,
  },
  {
    id: 'n1-res-late-group',
    time: START_TIME + 15,
    firstName: 'Dupont',
    lastName: 'Réservation',
    partySize: 2,
    arrived: false,
    partySeated: false,
  },
  {
    id: 'n1-res-phantom',
    time: START_TIME + 29,
    firstName: 'Le',
    lastName: 'Fantôme',
    partySize: 1,
    arrived: false,
    partySeated: false,
  },
];
