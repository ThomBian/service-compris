import type { Reservation } from '../types';
import { N1_T2, N1_T3, N1_T5 } from '../constants';

/**
 * Scripted reservations for Night 1 tutorial only.
 * Spawned on-demand by useScriptedEvents — NOT auto-spawned by useClientSpawner
 * (RESERVATIONS_DISABLED rule blocks auto-spawning).
 * IDs are prefixed 'n1-res-' so useScriptedEvents can identify them.
 * `time` matches Night 1 scripted beat minutes defined in constants.ts.
 */

export const NIGHT_1_RESERVATIONS: Reservation[] = [
  {
    id: 'n1-res-businessman',
    time: N1_T2,
    firstName: 'Henri',
    lastName: 'Moreau',
    partySize: 2,
    arrived: false,
    partySeated: false,
  },
  {
    id: 'n1-res-late-group',
    time: N1_T3,
    firstName: 'Dupont',
    lastName: 'Réservation',
    partySize: 2,
    arrived: false,
    partySeated: false,
  },
  {
    id: 'n1-res-phantom',
    time: N1_T5,
    firstName: 'Le',
    lastName: 'Fantôme',
    partySize: 1,
    arrived: false,
    partySeated: false,
  },
];
