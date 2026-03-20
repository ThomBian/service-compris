export enum PhysicalState {
  IN_QUEUE = 'IN_QUEUE',
  AT_DESK = 'AT_DESK',
  SEATING = 'SEATING',
  ACCEPTED = 'ACCEPTED',
  REFUSED = 'REFUSED',
  STORMED_OUT = 'STORMED_OUT',
}

export enum CellState {
  EMPTY = 'EMPTY',
  SELECTED = 'SELECTED',
  OCCUPIED = 'OCCUPIED',
}

export interface Cell {
  id: string;
  x: number;
  y: number;
  state: CellState;
  mealDuration?: number; // ticks remaining
  partyId?: string;
}

export enum DialogueState {
  AWAITING_GREETING = 'AWAITING_GREETING',
  OPENING_GAMBIT = 'OPENING_GAMBIT',
  WAITING_FOR_PLAYER = 'WAITING_FOR_PLAYER',
  RESPONDING = 'RESPONDING',
  DECISION_REACTION = 'DECISION_REACTION',
}

export enum ClientType {
  WALK_IN = 'WALK_IN',
  LEGITIMATE = 'LEGITIMATE',
  SCAMMER = 'SCAMMER',
}

export enum LieType {
  NONE = 'NONE',
  SIZE = 'SIZE',
  TIME = 'TIME',
  IDENTITY = 'IDENTITY',
}

export interface Reservation {
  id: string;
  time: number; // in-game minutes
  firstName: string;
  lastName: string;
  partySize: number;
  arrived: boolean;
}

export interface ChatMessage {
  sender: 'maitre-d' | 'guest';
  text: string;
}

export interface Client {
  id: string;
  type: ClientType;
  patience: number; // 0-100
  physicalState: PhysicalState;
  dialogueState: DialogueState;
  spawnTime: number; // in-game minutes when they appeared
  
  // Hidden Truths
  trueFirstName: string;
  trueLastName: string;
  truePartySize: number;
  trueReservationId?: string; // Only for LEGITIMATE
  isLate: boolean;
  lieType: LieType;
  
  // Known Info (Revealed to player)
  knownFirstName?: string;
  knownLastName?: string;
  knownPartySize?: number;
  knownTime?: number;
  hasLied: boolean; // Flag for "Grateful Liar" or "Justified Refusal"
  isCaught: boolean; // Flag for successful accusation
  
  // Dialogue
  lastMessage: string;
  chatHistory: ChatMessage[];
}

export interface GameState {
  inGameMinutes: number;
  timeMultiplier: number;
  reservations: Reservation[];
  spawnedReservationIds: string[];
  queue: Client[];
  currentClient: Client | null;
  grid: Cell[][];
  cash: number;
  rating: number; // 0-5 stars
  morale: number; // 0-100
  logs: string[];
}
