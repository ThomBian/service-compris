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

export interface VisualTraits {
  skinTone:      0 | 1 | 2 | 3 | 4;
  hairStyle:     0 | 1 | 2 | 3 | 4;
  hairColor:     0 | 1 | 2 | 3 | 4 | 5;
  clothingStyle: 0 | 1 | 2 | 3;
  clothingColor: 0 | 1 | 2 | 3 | 4;
  height:        0 | 1 | 2;
  // VIP-only accessories — undefined on regular clients
  hat?:        0 | 1 | 2;  // 0=top hat, 1=beret, 2=chef's toque
  facialHair?: 0 | 1;       // 0=curled moustache, 1=full beard
  neckwear?:   0 | 1 | 2;  // 0=red tie, 1=gold cravat, 2=red scarf
  // Banned-only accessories — undefined on regular clients and VIPs
  glasses?:  0 | 1;  // 0=round wire-frame, 1=oversized sunglasses
  eyebrows?: 0 | 1;  // 0=heavy furrowed brow, 1=droopy half-closed lids (drunk)
}

export type VipConsequenceTier = 'RATING' | 'CASH_FINE' | 'GAME_OVER';

export type BannedConsequenceTier = 'CASH_FINE' | 'MORALE' | 'RATING' | 'GAME_OVER';

export interface Banned {
  id: string;
  name: string;
  visualTraits: VisualTraits;
  arrivalMO: 'RESERVATION_ALIAS' | 'WALK_IN' | 'LATE';
  aliasFirstName?: string;
  aliasLastName?: string;
  expectedPartySize: number;
  consequenceTier: BannedConsequenceTier;
  cashFinePenalty?: number;
  moralePenalty?: number;
  ratingPenalty?: number;
  consequenceDescription: string;
}

export interface Vip {
  id: string;
  name: string;
  visualTraits: VisualTraits;
  arrivalMO: 'RESERVATION_ALIAS' | 'WALK_IN' | 'LATE';
  aliasFirstName?: string;
  aliasLastName?: string;
  expectedPartySize: number;
  consequenceTier: VipConsequenceTier;
  cashFinePenalty?: number;
  consequenceDescription: string;
}

export interface CharacterDefinition {
  id:                string;
  name:              string;
  role:              'VIP' | 'BANNED';
  behaviorType:      string;
  visualTraits:      VisualTraits;
  clueText:          string;
  arrivalMO:         'RESERVATION_ALIAS' | 'WALK_IN' | 'LATE' | 'BYPASS';
  aliasFirstName?:   string;
  aliasLastName?:    string;
  expectedPartySize: number;
  auraRecovery?:      'ON_SEATING';
  reservedPartySize?: number;  // size injected into the reservation (when different from expectedPartySize)
  cashBonus?:         number;
  cashPenalty?:       number;
  ratingPenalty?:     number;
  moralePenalty?:     number;
  gameOver?:          boolean;
  consequenceDescription: string;
}

export interface Reservation {
  id: string;
  time: number; // in-game minutes
  firstName: string;
  lastName: string;
  partySize: number;
  arrived: boolean;
  /** True after this booking's party was seated at least once (still dining or finished). */
  partySeated: boolean;
  /** In-game minute when the legitimate party for this booking joined the queue (set on spawn). */
  legitQueuedAt?: number;
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
  claimedReservationId?: string; // Reservation they're impersonating (impersonators only)
  isLate: boolean;
  lieType: LieType;
  
  // Known Info (Revealed to player)
  knownFirstName?: string;
  knownLastName?: string;
  knownPartySize?: number;
  knownTime?: number;
  hasLied: boolean; // Flag for "Grateful Liar" or "Justified Refusal"
  visualTraits: VisualTraits;
  isCaught: boolean; // Flag for successful accusation
  characterId?: string;

  // Dialogue
  lastMessage: string;
  chatHistory: ChatMessage[];
}

export type GameOverReason = 'MORALE' | 'VIP' | 'BANNED' | null;

export interface GameState {
  inGameMinutes: number;
  timeMultiplier: number;
  /** 0–3 (Chill…Hell). Hell locks the clock to 3×. */
  difficulty: number;
  reservations: Reservation[];
  spawnedReservationIds: string[];
  queue: Client[];
  currentClient: Client | null;
  grid: Cell[][];
  cash: number;
  rating: number; // 0-5 stars
  morale: number; // 0-100
  logs: string[];
  dailyCharacterIds: string[];
  seatedCharacterIds: string[];
  gameOver: boolean;
  /** Set when gameOver becomes true so the summary can show the right story (not everything is morale). */
  gameOverReason: GameOverReason;
  /** Roster id of the character whose action caused game over. */
  gameOverCharacterId: string | null;
  strikeActive: boolean;
  nightNumber: number;
  coversSeated: number;
  shiftRevenue: number;
}
