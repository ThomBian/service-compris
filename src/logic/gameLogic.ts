import { 
  ClientType, 
  LieType,
  Client, 
  GameState, 
  Reservation,
  PhysicalState,
  DialogueState,
  ChatMessage,
  Cell,
  CellState
} from '../types';
import { 
  FIRST_NAMES, 
  LAST_NAMES,
  GREETINGS,
  SCAMMER_GREETINGS,
  WALK_IN_GREETINGS,
  GRID_SIZE
} from '../constants';
import { getRandom, formatTime } from '../utils';

// --- Grid Initialization ---

export const createInitialGrid = (): Cell[][] => {
  const grid: Cell[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({
        id: `cell-${x}-${y}`,
        x,
        y,
        state: CellState.EMPTY,
      });
    }
    grid.push(row);
  }
  return grid;
};

// --- Client Spawning Logic ---

export const generateClientData = (res?: Reservation, allReservations: Reservation[] = []): {
  type: ClientType;
  trueFirstName: string;
  trueLastName: string;
  truePartySize: number;
  trueReservationId?: string;
  lieType: LieType.NONE | LieType.SIZE | LieType.IDENTITY;
} => {
  let type: ClientType;
  let trueFirstName: string;
  let trueLastName: string;
  let truePartySize: number;
  let trueReservationId: string | undefined;
  let lieType: LieType.NONE | LieType.SIZE | LieType.IDENTITY = LieType.NONE;

  if (res) {
    type = ClientType.LEGITIMATE;
    trueFirstName = res.firstName;
    trueLastName = res.lastName;
    trueReservationId = res.id;
    truePartySize = res.partySize;

    const roll = Math.random();
    if (roll < 0.3) {
      // Size Lie: strictly more people
      lieType = LieType.SIZE;
      truePartySize = res.partySize + Math.floor(Math.random() * 2) + 1;
    }
  } else {
    const typeRoll = Math.random();
    if (typeRoll < 0.6) {
      type = ClientType.WALK_IN;
      trueFirstName = getRandom(FIRST_NAMES);
      trueLastName = getRandom(LAST_NAMES);
      truePartySize = Math.floor(Math.random() * 4) + 1;
      lieType = LieType.NONE;
    } else {
      type = ClientType.SCAMMER;
      lieType = LieType.IDENTITY;

      // Stolen identity logic
      const stolenRoll = Math.random();
      if (stolenRoll < 0.5 && allReservations.length > 0) {
        const stolenRes = getRandom(allReservations);
        trueFirstName = stolenRes.firstName;
        trueLastName = stolenRes.lastName;
      } else {
        trueFirstName = getRandom(FIRST_NAMES);
        trueLastName = getRandom(LAST_NAMES);
      }

      truePartySize = Math.floor(Math.random() * 4) + 2;
    }
  }

  return { type, trueFirstName, trueLastName, truePartySize, trueReservationId, lieType };
};

export const createNewClient = ({
  data,
  currentMinutes,
  res
}: {
  data: ReturnType<typeof generateClientData>;
  currentMinutes: number;
  res?: Reservation;
}): Client => {
  const { type, trueFirstName, trueLastName, truePartySize, trueReservationId, lieType } = data;
  const finalIsLate = res ? (currentMinutes - res.time > 30) : false;
  
  // If they are late, that's also a lie type for Legit Reservations
  let finalLieType: LieType = lieType;
  if (type === ClientType.LEGITIMATE && finalIsLate && finalLieType === LieType.NONE) {
    finalLieType = LieType.TIME;
  }

  const client: Client = {
    id: Math.random().toString(36).substr(2, 9),
    type,
    patience: 100,
    physicalState: PhysicalState.IN_QUEUE,
    dialogueState: DialogueState.AWAITING_GREETING,
    spawnTime: currentMinutes,
    trueFirstName,
    trueLastName,
    truePartySize,
    trueReservationId,
    isLate: finalIsLate,
    lieType: finalLieType,
    hasLied: finalLieType !== LieType.NONE,
    isCaught: false,
    lastMessage: 'Waiting in line...',
    chatHistory: [],
  };

  return client;
};

// --- Queue Management Logic ---

export function prepareClientForDesk(client: Client): Client {
  const greeting = client.type === ClientType.WALK_IN 
    ? getRandom(WALK_IN_GREETINGS) 
    : client.type === ClientType.SCAMMER 
      ? getRandom(SCAMMER_GREETINGS) 
      : getRandom(GREETINGS);

  const preparedClient: Client = {
    ...client,
    physicalState: PhysicalState.AT_DESK,
    dialogueState: DialogueState.OPENING_GAMBIT,
    lastMessage: greeting,
    chatHistory: [
      { sender: 'maitre-d', text: 'Good evening! How may I help you?' },
      { sender: 'guest', text: greeting }
    ]
  };

  preparedClient.knownFirstName = preparedClient.trueFirstName;
  if (Math.random() > 0.5) preparedClient.knownPartySize = preparedClient.truePartySize;

  return preparedClient;
}

function updateQueuePatience(queue: Client[]): Client[] {
  return queue.map(c => ({
    ...c,
    patience: Math.max(0, c.patience - 1)
  }));
}

function handleStormOuts(queue: Client[], rating: number, logs: string[]) {
  const stormedOutCount = queue.filter(c => c.patience <= 0).length;
  if (stormedOutCount === 0) return { nextQueue: queue, nextRating: rating, nextLogs: logs, occurred: false };

  const nextQueue = queue.filter(c => c.patience > 0);
  const nextRating = Math.max(0, rating - (0.5 * stormedOutCount));
  const nextLogs = [`${stormedOutCount} guest(s) stormed out of the queue!`, ...logs].slice(0, 50);
  
  return { nextQueue, nextRating, nextLogs, occurred: true };
}

function tryMoveToDesk(queue: Client[], currentClient: Client | null, logs: string[]) {
  if (currentClient || queue.length === 0) return { nextQueue: queue, nextCurrentClient: currentClient, nextLogs: logs, occurred: false };

  const [first, ...rest] = queue;
  const nextCurrentClient = prepareClientForDesk(first);
  const nextLogs = [`Next guest stepped up to the podium.`, ...logs].slice(0, 50);

  return { nextQueue: rest, nextCurrentClient, nextLogs, occurred: true };
}

export function processQueueTick(prev: GameState): GameState {
  let nextQueue = prev.queue;
  let nextCurrentClient = prev.currentClient;
  let nextRating = prev.rating;
  let nextLogs = prev.logs;
  let nextGrid = prev.grid.map(row => row.map(cell => {
    if (cell.state === CellState.OCCUPIED && cell.mealDuration !== undefined) {
      const nextDuration = cell.mealDuration - 1;
      if (nextDuration <= 0) {
        return { ...cell, state: CellState.EMPTY, mealDuration: undefined, partyId: undefined };
      }
      return { ...cell, mealDuration: nextDuration };
    }
    return cell;
  }));
  let changed = true; // Always changed because of grid decay or patience

  // 1. Drain patience for queue
  nextQueue = updateQueuePatience(nextQueue);

  // 2. Check for storm outs
  const stormResult = handleStormOuts(nextQueue, nextRating, nextLogs);
  nextQueue = stormResult.nextQueue;
  nextRating = stormResult.nextRating;
  nextLogs = stormResult.nextLogs;

  // 3. Move to desk if empty
  const moveResult = tryMoveToDesk(nextQueue, nextCurrentClient, nextLogs);
  nextQueue = moveResult.nextQueue;
  nextCurrentClient = moveResult.nextCurrentClient;
  nextLogs = moveResult.nextLogs;

  return {
    ...prev,
    queue: nextQueue,
    currentClient: nextCurrentClient,
    grid: nextGrid,
    rating: nextRating,
    logs: nextLogs
  };
}

// --- Questioning Logic ---

export type QuestionField = 'firstName' | 'lastName' | 'time';

function getFieldQuestionText(field: QuestionField): string {
  switch (field) {
    case 'firstName': return "What is your first name?";
    case 'lastName': return "What is your last name?";
    case 'time': return "What time was your reservation?";
    default: return "";
  }
}

function handleFieldQuestion(
  field: QuestionField,
  client: Client,
  reservations: Reservation[],
  inGameMinutes: number
) {
  const alreadyKnown = (field === 'firstName' && client.knownFirstName) ||
                      (field === 'lastName' && client.knownLastName) ||
                      (field === 'time' && client.knownTime);

  if (alreadyKnown) {
    return {
      patiencePenalty: 20,
      logMsg: `Client is frustrated. You already asked that.`,
      guestResponse: "I already told you that!",
      revealedInfo: {}
    };
  }

  let revealedInfo: Partial<Client> = {};
  let guestResponse = '';

  if (field === 'firstName') {
    revealedInfo = { knownFirstName: client.trueFirstName };
    guestResponse = `My name is ${client.trueFirstName}.`;
  } else if (field === 'lastName') {
    revealedInfo = { knownLastName: client.trueLastName };
    guestResponse = `My last name is ${client.trueLastName}.`;
  } else if (field === 'time') {
    const res = reservations.find(r => r.id === client.trueReservationId);
    const trueTime = res ? res.time : (inGameMinutes - 10);
    revealedInfo = { knownTime: trueTime };
    guestResponse = `Our reservation was for ${formatTime(trueTime)}.`;
  }

  return {
    patiencePenalty: 10,
    logMsg: '',
    guestResponse,
    revealedInfo
  };
}

export function generateQuestionResponse({
  field, 
  client, 
  reservations, 
  inGameMinutes
}: {
  field: QuestionField;
  client: Client;
  reservations: Reservation[];
  inGameMinutes: number;
}) {
  const playerQuestion = getFieldQuestionText(field);
  const result = handleFieldQuestion(field, client, reservations, inGameMinutes);
  return { playerQuestion, ...result, caught: false };
}

// --- Accusation Logic ---

export type AccusationField = 'size' | 'time' | 'reservation';

function isAccusationCorrect(
  field: AccusationField,
  client: Client,
  res?: Reservation
): boolean {
  if (field === 'reservation') {
    return client.type === ClientType.SCAMMER;
  }
  
  if (field === 'time') {
    return client.isLate;
  }

  if (field === 'size') {
    if (!res) return false;
    return client.truePartySize > res.partySize;
  }

  return false;
}

function getAccusationText(field: AccusationField): string {
  switch (field) {
    case 'reservation': return "I don't think you have a reservation at all.";
    case 'size': return "You're bringing more people than you booked for!";
    case 'time': return "You're far too late for your reservation.";
    default: return "";
  }
}

export function checkAccusation({
  field, 
  client, 
  reservations
}: {
  field: AccusationField;
  client: Client;
  reservations: Reservation[];
}) {
  const res = reservations.find(r => r.id === client.trueReservationId);
  const caught = isAccusationCorrect(field, client, res);
  const accusationText = getAccusationText(field);

  if (caught) {
    return {
      caught: true,
      accusationText,
      guestResponse: "You caught me... I didn't think you'd notice. *sweats*",
      logMsg: `CAUGHT IN A LIE: You correctly called out their ${field} lie!`,
      patiencePenalty: 0
    };
  } else {
    return {
      caught: false,
      accusationText,
      guestResponse: "I'm telling the truth! This is insulting!",
      logMsg: `False Accusation: They weren't lying about ${field}!`,
      patiencePenalty: 50
    };
  }
}

// --- Decision Logic ---

function calculateBasePay(client: Client): number {
  return 20 + (client.truePartySize * 10);
}

export function handleAcceptedClient(
  client: Client,
  seatedCount: number,
  currentCash: number,
  currentRating: number,
  currentMorale: number,
  currentLogs: string[]
) {
  let nextCash = currentCash;
  let nextRating = currentRating;
  let nextMorale = currentMorale;
  let nextLogs = [...currentLogs];
  
  const partySize = client.truePartySize;
  const croppedCount = partySize - seatedCount;
  const basePayPerPerson = (20 + (partySize * 10)) / partySize;
  let basePay = basePayPerPerson * seatedCount;

  // Cropping Penalty
  if (croppedCount > 0) {
    const penalty = -0.5 * Math.pow(2, croppedCount - 1);
    nextRating = Math.max(0, nextRating + penalty);
    nextLogs = [`CROPPED: Left ${croppedCount} guest(s) behind. Rating penalty: ${penalty.toFixed(2)}`, ...nextLogs];
  }

  if (client.hasLied) {
    if (client.isCaught) {
      // The Grateful Liar
      nextCash += basePay * 2.5;
      nextRating = Math.min(5, nextRating + 0.8);
      nextMorale = Math.min(100, nextMorale + 10);
      nextLogs = [`Grateful Liar: You caught them, but sat them anyway! Massive bonus.`, ...nextLogs];
    } else {
      // Fooled!
      if (client.type === ClientType.SCAMMER) {
        nextCash -= 50;
        nextRating = Math.max(0, nextRating - 1.0);
        nextMorale = Math.max(0, nextMorale - 20);
        nextLogs = [`FOOLED: You sat a scammer! They skipped the bill and left a mess.`, ...nextLogs];
      } else {
        nextRating = Math.max(0, nextRating - 0.5);
        nextMorale = Math.max(0, nextMorale - 10);
        nextLogs = [`FOOLED: You sat a rule-breaker without calling them out. Staff is annoyed.`, ...nextLogs];
      }
    }
  } else {
    // Honest customer
    nextCash += basePay;
    nextRating = Math.min(5, nextRating + 0.1);
    nextLogs = [`Accepted ${client.trueFirstName}. Standard service.`, ...nextLogs];
  }

  return { nextCash, nextRating, nextMorale, nextLogs };
}

export function handleRefusedClient(
  client: Client,
  currentRating: number,
  currentMorale: number,
  currentLogs: string[]
) {
  let nextRating = currentRating;
  let nextMorale = currentMorale;
  let nextLogs = [...currentLogs];

  // Justified if: Scammer, or Size Lie, or Time Crime (>30 mins late)
  const isJustified = client.type === ClientType.SCAMMER || client.lieType === LieType.SIZE || client.isLate;

  if (isJustified) {
    // Justified Refusal
    nextRating = Math.min(5, nextRating + 0.2);
    nextMorale = Math.min(100, nextMorale + 5);
    nextLogs = [`Justified Refusal: You protected the house from a problematic guest.`, ...nextLogs];
  } else {
    // Unjustified Refusal
    nextRating = Math.max(0, nextRating - 0.5);
    nextMorale = Math.max(0, nextMorale - 15);
    nextLogs = [`Unjustified Refusal: You turned away an honest guest!`, ...nextLogs];
  }

  return { nextRating, nextMorale, nextLogs };
}

export function handleSeatingRefusal(
  client: Client,
  currentRating: number,
  currentMorale: number,
  currentLogs: string[]
) {
  const nextRating = Math.max(0, currentRating - 1.5);
  const nextMorale = Math.max(0, currentMorale - 30);
  const nextLogs = [
    `Refused after seating: You accepted ${client.trueFirstName} then turned them away. Guests are furious.`,
    ...currentLogs
  ];
  return { nextRating, nextMorale, nextLogs };
}

// --- Grid Interaction Logic ---

export function isAdjacent(cell1: { x: number, y: number }, cell2: { x: number, y: number }): boolean {
  const dx = Math.abs(cell1.x - cell2.x);
  const dy = Math.abs(cell1.y - cell2.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

export function canSelectCell(cell: Cell, selectedCells: Cell[]): boolean {
  if (cell.state !== CellState.EMPTY) return false;
  if (selectedCells.length === 0) return true;
  return selectedCells.some(selected => isAdjacent(cell, selected));
}
