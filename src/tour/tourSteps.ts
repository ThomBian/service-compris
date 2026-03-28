export type TourTarget =
  | "topbar"
  | "queue"
  | "party-ticket"
  | "booking-ledger"
  | "clipboard"
  | "seat-party"
  | "floorplan";

/** Key under tour.json (same as JSON object keys). */
export type TourCopyKey =
  | "topbar"
  | "queue"
  | "partyTicket"
  | "bookingLedger"
  | "clipboard"
  | "seatParty"
  | "floorplan";

export interface TourStep {
  target: TourTarget;
  copyKey: TourCopyKey;
  view: "desk" | "floorplan";
}

export const TOUR_STEPS: TourStep[] = [
  { target: "topbar", copyKey: "topbar", view: "desk" },
  { target: "queue", copyKey: "queue", view: "desk" },
  { target: "party-ticket", copyKey: "partyTicket", view: "desk" },
  { target: "booking-ledger", copyKey: "bookingLedger", view: "desk" },
  { target: "clipboard", copyKey: "clipboard", view: "desk" },
  { target: "seat-party", copyKey: "seatParty", view: "desk" },
  { target: "floorplan", copyKey: "floorplan", view: "floorplan" },
];
