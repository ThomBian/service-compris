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
  CellState,
  VisualTraits,
  type ToolReveal,
} from "../types";
import type { ActiveRule, PathScores } from "../types/campaign";
import {
  START_TIME,
  QUEUE_PATIENCE_DRAIN_PER_TICK,
} from "../constants";
import { NIGHT_1_RESERVATIONS } from "../data/night1Reservations";
import { generateDailyCharacters, injectCharacterReservations, CHARACTER_ROSTER } from "./characterRoster";
import { generateReservations } from "./reservationGenerator";
import {
  FIRST_NAMES,
  LAST_NAMES,
  GRID_SIZE,
  BASE_REVENUE_PER_SEAT,
  PARTY_SIZE_TIP_PER_SEAT_PARTY,
} from "../constants";
import { getRandom, formatTime } from "../utils";
import { tGame, randomGreeting } from "../i18n/tGame";

function traitsMatch(a: VisualTraits, b: VisualTraits): boolean {
  return (
    a.skinTone      === b.skinTone &&
    a.hairStyle     === b.hairStyle &&
    a.hairColor     === b.hairColor &&
    a.clothingStyle === b.clothingStyle &&
    a.clothingColor === b.clothingColor &&
    a.height        === b.height &&
    a.hat           === b.hat &&
    a.facialHair    === b.facialHair &&
    a.neckwear      === b.neckwear &&
    a.glasses       === b.glasses &&
    a.eyebrows      === b.eyebrows
  );
}

export function seedTraits(id: string, index: number): VisualTraits {
  const seed = id + String(index);
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
    h = h >>> 0;
  }
  const pick = (range: number): number => {
    const v = h % range;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
    return v;
  };
  return {
    skinTone: pick(5) as VisualTraits["skinTone"],
    hairStyle: pick(5) as VisualTraits["hairStyle"],
    hairColor: pick(6) as VisualTraits["hairColor"],
    clothingStyle: pick(4) as VisualTraits["clothingStyle"],
    clothingColor: pick(5) as VisualTraits["clothingColor"],
    height: pick(3) as VisualTraits["height"],
  };
}

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

/** Drop any in-progress table picks so they cannot carry over after the guest leaves or a new seating starts. */
export function clearFloorplanSelection(grid: Cell[][]): Cell[][] {
  return grid.map((row) =>
    row.map((cell) =>
      cell.state === CellState.SELECTED
        ? { ...cell, state: CellState.EMPTY }
        : cell,
    ),
  );
}

// --- Client Spawning Logic ---

export const generateClientData = (
  res?: Reservation,
  allReservations: Reservation[] = [],
  currentInGameMinutes?: number,
  spawnedReservationIds: string[] = [],
  excludeTraits?: VisualTraits[],
): {
  type: ClientType;
  trueFirstName: string;
  trueLastName: string;
  truePartySize: number;
  trueReservationId?: string;
  lieType: LieType.NONE | LieType.SIZE | LieType.IDENTITY;
  claimedReservationId?: string;
  visualTraits: VisualTraits;
} => {
  let type: ClientType;
  let trueFirstName: string;
  let trueLastName: string;
  let truePartySize: number;
  let trueReservationId: string | undefined;
  let lieType: LieType.NONE | LieType.SIZE | LieType.IDENTITY = LieType.NONE;
  let claimedReservationId: string | undefined;

  if (res) {
    type = ClientType.LEGITIMATE;
    trueFirstName = res.firstName;
    trueLastName = res.lastName;
    trueReservationId = res.id;
    truePartySize = res.partySize;

    const roll = Math.random();
    if (roll < 0.3) {
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
      // True identity is always random — impersonation is in what they *claim*
      trueFirstName = getRandom(FIRST_NAMES);
      trueLastName = getRandom(LAST_NAMES);
      truePartySize = Math.floor(Math.random() * 4) + 2;

      // Impersonators only target bookings whose real party already joined the queue, on a later
      // in-game minute — never the same tick, so "Joined queue" can distinguish them.
      if (currentInGameMinutes !== undefined && Math.random() < 0.1) {
        const qualifying = allReservations.filter(
          (r) =>
            spawnedReservationIds.includes(r.id) &&
            r.legitQueuedAt !== undefined &&
            currentInGameMinutes > r.legitQueuedAt,
        );
        if (qualifying.length > 0) {
          claimedReservationId = getRandom(qualifying).id;
        }
      }
    }
  }

  let visualTraits: VisualTraits;
  do {
    visualTraits = {
      skinTone: Math.floor(Math.random() * 5) as VisualTraits["skinTone"],
      hairStyle: Math.floor(Math.random() * 5) as VisualTraits["hairStyle"],
      hairColor: Math.floor(Math.random() * 6) as VisualTraits["hairColor"],
      clothingStyle: Math.floor(
        Math.random() * 4,
      ) as VisualTraits["clothingStyle"],
      clothingColor: Math.floor(
        Math.random() * 5,
      ) as VisualTraits["clothingColor"],
      height: Math.floor(Math.random() * 3) as VisualTraits["height"],
    };
  } while (excludeTraits?.some((e) => traitsMatch(e, visualTraits)));

  return {
    type,
    trueFirstName,
    trueLastName,
    truePartySize,
    trueReservationId,
    lieType,
    claimedReservationId,
    visualTraits,
  };
};

export const createNewClient = ({
  data,
  currentMinutes,
  res,
}: {
  data: ReturnType<typeof generateClientData>;
  currentMinutes: number;
  res?: Reservation;
}): Client => {
  const {
    type,
    trueFirstName,
    trueLastName,
    truePartySize,
    trueReservationId,
    lieType,
    visualTraits,
  } = data;
  let finalIsLate = res ? currentMinutes - res.time > 30 : false;

  let finalLieType: LieType = lieType;
  if (
    type === ClientType.LEGITIMATE &&
    finalIsLate &&
    finalLieType === LieType.NONE
  ) {
    finalLieType = LieType.TIME;
  }

  // Impersonators always arrive late
  if (data.claimedReservationId) {
    finalIsLate = true;
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
    claimedReservationId: data.claimedReservationId,
    isLate: finalIsLate,
    lieType: finalLieType,
    hasLied: finalLieType !== LieType.NONE,
    visualTraits,
    isCaught: false,
    lastMessage: tGame('waitingInLine'),
    chatHistory: [],
  };

  return client;
};

// --- Queue Management Logic ---

export function prepareClientForDesk(client: Client): Client {
  const greeting = client.type === ClientType.WALK_IN
    ? randomGreeting('walkin')
    : client.type === ClientType.SCAMMER
      ? randomGreeting('scammer')
      : tGame('greetings.reservationWithName', {
          lastName: client.trueLastName,
          partySize: client.truePartySize,
        });

  const preparedClient: Client = {
    ...client,
    physicalState: PhysicalState.AT_DESK,
    dialogueState: DialogueState.OPENING_GAMBIT,
    lastMessage: greeting,
    chatHistory: [
      { sender: 'maitre-d', text: tGame('maitreGreeting') },
      { sender: 'guest', text: greeting },
    ],
  };

  if (preparedClient.claimedReservationId) {
    // Impersonator: no pre-filled ticket fields — player must investigate.
  } else if (client.type === ClientType.WALK_IN) {
    preparedClient.knownFirstName = client.trueFirstName;
    if (Math.random() > 0.5)
      preparedClient.knownPartySize = client.truePartySize;
  } else if (client.type === ClientType.SCAMMER) {
    preparedClient.knownFirstName = client.trueFirstName;
    if (Math.random() > 0.5)
      preparedClient.knownPartySize = client.truePartySize;
  } else if (client.type === ClientType.LEGITIMATE) {
    const shouldAnnounce = Math.random() < 0.65;
    if (shouldAnnounce) {
      preparedClient.knownFirstName = preparedClient.trueFirstName;
    }
    if (Math.random() > 0.5)
      preparedClient.knownPartySize = client.truePartySize;
  }

  return preparedClient;
}

function updateQueuePatience(queue: Client[], strikeMultiplier = 1): Client[] {
  const drain = QUEUE_PATIENCE_DRAIN_PER_TICK * strikeMultiplier;
  return queue.map((c) => ({
    ...c,
    patience: Math.max(0, c.patience - drain),
  }));
}

function handleStormOuts(queue: Client[], rating: number, logs: string[]) {
  const stormedOut = queue.filter((c) => c.patience <= 0);
  const stormedOutCount = stormedOut.length;
  if (stormedOutCount === 0)
    return {
      nextQueue: queue,
      nextRating: rating,
      nextLogs: logs,
      occurred: false,
      stormedOutClientIds: [] as string[],
    };

  const nextQueue = queue.filter((c) => c.patience > 0);
  const nextRating = Math.max(0, rating - 0.5 * stormedOutCount);
  const nextLogs = [
    tGame('stormQueue', { count: stormedOutCount }),
    ...logs,
  ].slice(0, 50);

  return {
    nextQueue,
    nextRating,
    nextLogs,
    occurred: true,
    stormedOutClientIds: stormedOut.map((c) => c.id),
  };
}

function tryMoveToDesk(
  queue: Client[],
  currentClient: Client | null,
  logs: string[],
) {
  if (currentClient || queue.length === 0)
    return {
      nextQueue: queue,
      nextCurrentClient: currentClient,
      nextLogs: logs,
      occurred: false,
    };

  const [first, ...rest] = queue;
  const nextCurrentClient = prepareClientForDesk(first);
  const nextLogs = [tGame('nextGuest'), ...logs].slice(
    0,
    50,
  );

  return { nextQueue: rest, nextCurrentClient, nextLogs, occurred: true };
}

export interface QueueTickResult {
  state: GameState;
  stormedCount: number;
  stormedOutClientIds: string[];
}

export function processQueueTick(prev: GameState): QueueTickResult {
  let nextQueue = prev.queue;
  let nextCurrentClient = prev.currentClient;
  let nextRating = prev.rating;
  let nextLogs = prev.logs;
  let nextGrid = prev.grid.map((row) =>
    row.map((cell) => {
      if (
        cell.state === CellState.OCCUPIED &&
        cell.mealDuration !== undefined
      ) {
        const nextDuration = cell.mealDuration - 1;
        if (nextDuration <= 0) {
          return {
            ...cell,
            state: CellState.EMPTY,
            mealDuration: undefined,
            partyId: undefined,
          };
        }
        return { ...cell, mealDuration: nextDuration };
      }
      return cell;
    }),
  );

  const strikeMultiplier = prev.strikeActive ? 2 : 1;
  nextQueue = updateQueuePatience(nextQueue, strikeMultiplier);

  const stormResult = handleStormOuts(nextQueue, nextRating, nextLogs);
  nextQueue = stormResult.nextQueue;
  nextRating = stormResult.nextRating;
  nextLogs = stormResult.nextLogs;
  const { stormedOutClientIds } = stormResult;
  const stormedCount = prev.queue.length - nextQueue.length;

  const moveResult = tryMoveToDesk(nextQueue, nextCurrentClient, nextLogs);
  nextQueue = moveResult.nextQueue;
  nextCurrentClient = moveResult.nextCurrentClient;
  nextLogs = moveResult.nextLogs;

  return {
    state: {
      ...prev,
      queue: nextQueue,
      currentClient: nextCurrentClient,
      grid: nextGrid,
      rating: nextRating,
      logs: nextLogs,
    },
    stormedCount,
    stormedOutClientIds,
  };
}

// --- Questioning Logic ---

export type QuestionField = "firstName" | "lastName" | "time";

function getFieldQuestionText(field: QuestionField): string {
  switch (field) {
    case "firstName":
      return tGame('questionFirstName');
    case "lastName":
      return tGame('questionLastName');
    case "time":
      return tGame('questionTime');
    default:
      return "";
  }
}

function handleFieldQuestion(
  field: QuestionField,
  client: Client,
  reservations: Reservation[],
  inGameMinutes: number,
) {
  // Impersonators lie using the stolen reservation's data
  if (client.claimedReservationId) {
    const stolenRes = reservations.find(
      (r) => r.id === client.claimedReservationId,
    );
    if (stolenRes) {
      const alreadyKnownForImpersonator =
        (field === "firstName" && client.knownFirstName) ||
        (field === "lastName" && client.knownLastName) ||
        (field === "time" && client.knownTime);

      if (alreadyKnownForImpersonator) {
        return {
          patiencePenalty: 20,
          logMsg: tGame('frustratedRepeat'),
          guestResponse: tGame('guestAlreadyTold'),
          revealedInfo: {},
        };
      }

      if (field === "firstName") {
        return {
          patiencePenalty: 10,
          logMsg: "",
          guestResponse: tGame('guestMyName', { name: stolenRes.firstName }),
          revealedInfo: { knownFirstName: stolenRes.firstName },
        };
      }
      if (field === "lastName") {
        return {
          patiencePenalty: 10,
          logMsg: "",
          guestResponse: tGame('guestMyLastName', { name: stolenRes.lastName }),
          revealedInfo: { knownLastName: stolenRes.lastName },
        };
      }
      if (field === "time") {
        const liesAboutTime = Math.random() < 0.4;
        const offset = Math.random() < 0.5 ? 15 : -15;
        const claimedTime = liesAboutTime
          ? stolenRes.time + offset
          : stolenRes.time;
        return {
          patiencePenalty: 10,
          logMsg: "",
          guestResponse: tGame('guestReservationTime', { time: formatTime(claimedTime) }),
          revealedInfo: { knownTime: claimedTime },
        };
      }
    }
  }

  // Original logic for all other clients
  const alreadyKnown =
    (field === "firstName" && client.knownFirstName) ||
    (field === "lastName" && client.knownLastName) ||
    (field === "time" && client.knownTime);

  if (alreadyKnown) {
    return {
      patiencePenalty: 20,
      logMsg: tGame('frustratedRepeat'),
      guestResponse: tGame('guestAlreadyTold'),
      revealedInfo: {},
    };
  }

  let revealedInfo: Partial<Client> = {};
  let guestResponse = "";

  if (field === "firstName") {
    revealedInfo = { knownFirstName: client.trueFirstName };
    guestResponse = tGame('guestMyName', { name: client.trueFirstName });
  } else if (field === "lastName") {
    revealedInfo = { knownLastName: client.trueLastName };
    guestResponse = tGame('guestMyLastName', { name: client.trueLastName });
  } else if (field === "time") {
    const res = reservations.find((r) => r.id === client.trueReservationId);
    const trueTime = res ? res.time : inGameMinutes - 10;
    revealedInfo = { knownTime: trueTime };
    guestResponse = tGame('guestReservationTime', { time: formatTime(trueTime) });
  }

  return {
    patiencePenalty: 10,
    logMsg: "",
    guestResponse,
    revealedInfo,
  };
}

export function generateQuestionResponse({
  field,
  client,
  reservations,
  inGameMinutes,
}: {
  field: QuestionField;
  client: Client;
  reservations: Reservation[];
  inGameMinutes: number;
}) {
  const playerQuestion = getFieldQuestionText(field);
  const result = handleFieldQuestion(
    field,
    client,
    reservations,
    inGameMinutes,
  );
  return { playerQuestion, ...result, caught: false };
}

// --- Accusation Logic ---

export type AccusationField = "size" | "time" | "reservation";

function accusationFieldLabel(field: AccusationField): string {
  if (field === "size") return tGame("fieldSize");
  if (field === "time") return tGame("fieldTime");
  return tGame("fieldReservation");
}

function isAccusationCorrect(
  field: AccusationField,
  client: Client,
  res?: Reservation,
): boolean {
  if (field === "reservation") {
    return client.type === ClientType.SCAMMER;
  }

  if (field === "time") {
    return client.isLate;
  }

  if (field === "size") {
    if (!res) return false;
    return client.truePartySize > res.partySize;
  }

  return false;
}

function getAccusationText(field: AccusationField): string {
  switch (field) {
    case "reservation":
      return tGame('accuseReservation');
    case "size":
      return tGame('accuseSize');
    case "time":
      return tGame('accuseTime');
    default:
      return "";
  }
}

export function checkAccusation({
  field,
  client,
  reservations,
}: {
  field: AccusationField;
  client: Client;
  reservations: Reservation[];
}) {
  const res = reservations.find((r) => r.id === client.trueReservationId);
  const caught = isAccusationCorrect(field, client, res);
  const accusationText = getAccusationText(field);

  if (caught) {
    return {
      caught: true,
      accusationText,
      guestResponse: tGame('accuseCaughtResponse'),
      logMsg: tGame('logCaughtLie', { field: accusationFieldLabel(field) }),
      patiencePenalty: 0,
    };
  } else {
    return {
      caught: false,
      accusationText,
      guestResponse: tGame('accuseFalseResponse'),
      logMsg: tGame('logFalseAccusation', { field: accusationFieldLabel(field) }),
      patiencePenalty: 50,
    };
  }
}

// --- Decision Logic ---

export function handleAcceptedClient(
  client: Client,
  seatedCount: number,
  currentCash: number,
  currentRating: number,
  currentMorale: number,
  currentLogs: string[],
) {
  let nextCash = currentCash;
  let nextRating = currentRating;
  let nextMorale = currentMorale;
  let nextLogs = [...currentLogs];

  const partySize = client.truePartySize;
  const croppedCount = partySize - seatedCount;
  const basePay =
    BASE_REVENUE_PER_SEAT * seatedCount +
    PARTY_SIZE_TIP_PER_SEAT_PARTY * partySize * seatedCount;

  // Cropping Penalty
  if (croppedCount > 0) {
    const penalty = -0.5 * Math.pow(2, croppedCount - 1);
    nextRating = Math.max(0, nextRating + penalty);
    nextLogs = [
      tGame('logCropped', { count: croppedCount, penalty: penalty.toFixed(2) }),
      ...nextLogs,
    ];
  }

  if (client.hasLied) {
    if (client.isCaught) {
      // The Grateful Liar
      nextCash += basePay * 2.5;
      nextRating = Math.min(5, nextRating + 0.8);
      nextMorale = Math.min(100, nextMorale + 10);
      nextLogs = [
        tGame('logGratefulLiar'),
        ...nextLogs,
      ];
    } else {
      // Fooled!
      if (client.type === ClientType.SCAMMER) {
        nextCash -= 50;
        nextRating = Math.max(0, nextRating - 1.0);
        nextMorale = Math.max(0, nextMorale - 20);
        nextLogs = [
          tGame('logFooledScammer'),
          ...nextLogs,
        ];
      } else {
        nextRating = Math.max(0, nextRating - 0.5);
        nextMorale = Math.max(0, nextMorale - 10);
        nextLogs = [
          tGame('logFooledOther'),
          ...nextLogs,
        ];
      }
    }
  } else {
    // Honest customer
    nextCash += basePay;
    nextRating = Math.min(5, nextRating + 0.1);
    nextLogs = [
      tGame('logAccepted', { name: client.trueFirstName }),
      ...nextLogs,
    ];
  }

  return { nextCash, nextRating, nextMorale, nextLogs };
}

export function handleRefusedClient(
  client: Client,
  currentRating: number,
  currentMorale: number,
  currentLogs: string[],
) {
  let nextRating = currentRating;
  let nextMorale = currentMorale;
  let nextLogs = [...currentLogs];

  // Walk-ins: no rating/morale penalty (temporary design — house policy TBD).
  if (client.type === ClientType.WALK_IN) {
    nextLogs = [
      tGame('logWalkInAway', { name: client.trueFirstName }),
      ...nextLogs,
    ];
    return { nextRating, nextMorale, nextLogs };
  }

  // Justified if: Scammer, or Size Lie, or Time Crime (>30 mins late)
  const isJustified =
    client.type === ClientType.SCAMMER ||
    client.lieType === LieType.SIZE ||
    client.isLate;

  if (isJustified) {
    // Justified Refusal
    nextRating = Math.min(5, nextRating + 0.2);
    nextMorale = Math.min(100, nextMorale + 5);
    nextLogs = [
      tGame('logJustifiedRefusal'),
      ...nextLogs,
    ];
  } else {
    // Unjustified Refusal
    nextRating = Math.max(0, nextRating - 0.5);
    nextMorale = Math.max(0, nextMorale - 15);
    nextLogs = [
      tGame('logUnjustifiedRefusal'),
      ...nextLogs,
    ];
  }

  return { nextRating, nextMorale, nextLogs };
}

export function handleSeatingRefusal(
  client: Client,
  currentRating: number,
  currentMorale: number,
  currentLogs: string[],
) {
  const nextRating = Math.max(0, currentRating - 1.5);
  const nextMorale = Math.max(0, currentMorale - 30);
  const nextLogs = [
    tGame('logRefusedAfterSeating', { name: client.trueFirstName }),
    ...currentLogs,
  ];
  return { nextRating, nextMorale, nextLogs };
}

// --- Grid Interaction Logic ---

export function isAdjacent(
  cell1: { x: number; y: number },
  cell2: { x: number; y: number },
): boolean {
  const dx = Math.abs(cell1.x - cell2.x);
  const dy = Math.abs(cell1.y - cell2.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

export function canSelectCell(cell: Cell, selectedCells: Cell[]): boolean {
  if (cell.state !== CellState.EMPTY) return false;
  if (selectedCells.length === 0) return true;
  return selectedCells.some((selected) => isAdjacent(cell, selected));
}

/**
 * If morale has hit 0, atomically set gameOver, clear all occupied cells,
 * and stop the clock. Returns state unchanged if morale > 0.
 */
export function applyMoraleGameOver(state: GameState): GameState {
  if (state.morale > 0 || state.gameOver) return state;
  const clearedGrid = state.grid.map((row) =>
    row.map((cell) =>
      cell.state === CellState.OCCUPIED
        ? {
            ...cell,
            state: CellState.EMPTY,
            mealDuration: undefined,
            partyId: undefined,
          }
        : cell,
    ),
  );
  return {
    ...state,
    grid: clearedGrid,
    gameOver: true,
    gameOverReason: 'MORALE',
    gameOverCharacterId: null,
    timeMultiplier: 0,
    logs: [tGame('moraleCollapsed'), ...state.logs].slice(0, 50),
  };
}

// --- Initial State Builder ---

export type PersistState = { cash: number; rating: number; morale: number; nightNumber: number };

export function buildInitialState(
  difficulty: number,
  persist?: PersistState,
  rules: ActiveRule[] = [],
  characterIds?: string[],
  pathScores?: PathScores,
): GameState {
  const nightNumber = persist?.nightNumber ?? 1;
  const rating = persist ? Math.max(1.0, persist.rating) : 5.0;

  const dailyChars = characterIds && characterIds.length > 0
    ? CHARACTER_ROSTER.filter(c => characterIds.includes(c.id))
    : generateDailyCharacters(difficulty, CHARACTER_ROSTER, pathScores);

  const baseReservations = nightNumber === 1
    ? NIGHT_1_RESERVATIONS
    : generateReservations({ nightNumber, rating });
  const reservations = injectCharacterReservations(dailyChars, baseReservations);

  return {
    inGameMinutes: START_TIME,
    timeMultiplier: difficulty === 3 ? 3 : 1,
    difficulty,
    reservations,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: persist?.cash ?? 0,
    rating,
    morale: persist ? Math.max(0, persist.morale) : 100,
    logs: [tGame('welcome')],
    dailyCharacterIds: dailyChars.map(c => c.id),
    seatedCharacterIds: [],
    gameOverCharacterId: null,
    strikeActive: false,
    gameOver: false,
    gameOverReason: null,
    nightNumber,
    coversSeated: 0,
    shiftRevenue: 0,
    activeRules: rules,
    firedEventIds: [],
    revealedTools:
      nightNumber === 1
        ? []
        : (['LEDGER', 'PARTY_TICKET', 'CLIPBOARD_VIP', 'CLIPBOARD_BANNED'] as ToolReveal[]),
    nightEndPending: false,
  };
}
