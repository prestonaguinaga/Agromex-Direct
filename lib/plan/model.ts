/**
 * The house model: what a set of plans is made of, as data. Bob edits this
 * through typed operations (ops.ts); floor plans, schedules, DXF and code
 * checks are all derived from it, so an edit to one thing never drifts the
 * rest. Pure types — no server or browser dependencies.
 *
 * Units: inches. Origin at the south-west corner of the building; x grows
 * east, y grows north. Rooms are axis-aligned rectangles whose edges sit on
 * wall CENTERLINES; walls are derived from room edges (geometry.ts).
 */

export const PLAN_SCHEMA_VERSION = 1;

export type RoomType =
  | "bedroom"
  | "bathroom"
  | "kitchen"
  | "living"
  | "dining"
  | "office"
  | "hall"
  | "closet"
  | "laundry"
  | "utility"
  | "stair"
  | "garage"
  | "porch"
  | "other";

export const ROOM_TYPES: RoomType[] = ["bedroom", "bathroom", "kitchen", "living", "dining", "office", "hall", "closet", "laundry", "utility", "stair", "garage", "porch", "other"];

/** Rooms people live in — IRC R304/R305 minimums apply. */
export const HABITABLE: ReadonlySet<RoomType> = new Set(["bedroom", "living", "dining", "kitchen", "office"]);

export type Side = "N" | "E" | "S" | "W";
export const SIDES: Side[] = ["N", "E", "S", "W"];

export interface Rect {
  /** South-west corner, inches, to wall centerlines. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Room extends Rect {
  id: string;
  name: string;
  type: RoomType;
  /** Override the level's ceiling height (inches). */
  ceilingIn?: number;
  floorFinish?: string;
  notes?: string;
}

/** "opening" is a cased opening / archway with no door — how an open-plan living/kitchen is modelled. */
export type OpeningKind = "door" | "window" | "opening";

export interface Opening {
  id: string;
  kind: OpeningKind;
  /** The room whose side this opening sits on. */
  roomId: string;
  side: Side;
  /** From the room's west corner (N/S sides) or south corner (E/W sides), inches, to the opening's near jamb. */
  offset: number;
  width: number;
  height: number;
  /** Windows: sill height above finished floor, inches. */
  sill?: number;
  /** Doors: which way it swings, seen from inside the room. */
  swing?: "in" | "out";
  hinge?: "left" | "right";
  /** Doors: exterior door (derived when the side is an exterior wall) · sliding · pocket · bifold. */
  doorStyle?: "hinged" | "sliding" | "pocket" | "bifold" | "barn";
  /** Windows: operable type. */
  windowStyle?: "single-hung" | "double-hung" | "casement" | "slider" | "fixed" | "awning";
  tempered?: boolean;
  label?: string;
}

export interface Stair {
  id: string;
  /** The room the stair sits in (usually a "stair" or "hall" room). */
  roomId: string;
  /** Offset of the stair's south-west corner inside that room, inches. */
  x: number;
  y: number;
  width: number;
  /** Direction of travel going UP. */
  run: Side;
  /** Level this stair climbs to (null for a stair to nothing yet). */
  toLevelId: string | null;
  treadIn: number;
  /** Straight run for stage one; landings are validated, not modelled as separate pieces. */
  shape: "straight";
}

export interface Level {
  id: string;
  name: string;
  /** Ceiling height, inches. */
  ceilingIn: number;
  /** Floor structure depth below this level (joists + subfloor); 0 for slab. */
  floorStructureIn: number;
  rooms: Room[];
  openings: Opening[];
  stairs: Stair[];
}

export interface RoofSpec {
  type: "gable" | "hip" | "shed" | "flat";
  /** Rise per 12" run. */
  pitchRise: number;
  overhangIn: number;
  /** Gable: which axis the ridge runs along. */
  ridge?: "x" | "y";
  material?: string;
}

export interface InsulationSpec {
  wallR: number;
  ceilingR: number;
  floorR: number;
  windowU: number;
  windowShgc: number;
}

export interface PlanSettings {
  address: string;
  jurisdiction: string;
  codeEdition: "2018" | "2021";
  climateZone: string;
  windMph: number;
  exteriorWallIn: number;
  interiorWallIn: number;
  /** Distance from each exterior face to the property line, inches; null = unknown. */
  setbacksIn: Partial<Record<Side, number | null>>;
  insulation: InsulationSpec;
  foundation: "post-tension slab" | "slab on grade" | "pier and beam" | "crawlspace" | "basement";
  /** Fuel-burning appliance or attached garage → CO alarms (R315). */
  fuelBurning: boolean;
  attachedGarage: boolean;
}

export interface HousePlan {
  schema: number;
  title: string;
  description: string;
  settings: PlanSettings;
  roof: RoofSpec;
  levels: Level[];
}

export const DEFAULT_SETTINGS: PlanSettings = {
  address: "",
  jurisdiction: "",
  codeEdition: "2021",
  climateZone: "3A",
  windMph: 115,
  exteriorWallIn: 6.5,
  interiorWallIn: 4.5,
  setbacksIn: { N: null, E: null, S: null, W: null },
  insulation: { wallR: 21, ceilingR: 38, floorR: 19, windowU: 0.3, windowShgc: 0.25 },
  foundation: "post-tension slab",
  fuelBurning: false,
  attachedGarage: false,
};

export const DEFAULT_ROOF: RoofSpec = { type: "gable", pitchRise: 6, overhangIn: 12, ridge: "x", material: "architectural shingles" };

/** Standard opening sizes (inches) so Bob can say "a 3-0 door" and mean it. */
export const STANDARD = {
  door: { width: 32, height: 80 },
  exteriorDoor: { width: 36, height: 80 },
  closetDoor: { width: 30, height: 80 },
  bathDoor: { width: 28, height: 80 },
  casedOpening: { width: 72, height: 84 },
  window: { width: 36, height: 48, sill: 30 },
  egressWindow: { width: 36, height: 60, sill: 24 },
  stairWidth: 36,
  tread: 10,
  maxRise: 7.75,
} as const;

// ── formatting helpers (pure) ────────────────────────────────────────────────

const EIGHTHS = ["", "⅛", "¼", "⅜", "½", "⅝", "¾", "⅞"];

/** 137.5 → 11'-5½" · 51.25 → 4'-3¼" (architectural: to the nearest ⅛") */
export function ftIn(inches: number): string {
  const sign = inches < 0 ? "-" : "";
  let eighths = Math.round(Math.abs(inches) * 8);
  const ft = Math.floor(eighths / 96);
  eighths -= ft * 96;
  const whole = Math.floor(eighths / 8);
  const frac = EIGHTHS[eighths - whole * 8];
  return `${sign}${ft}'-${whole}${frac}"`;
}

/** Square inches → square feet, one decimal. */
export function sqft(sqin: number): number {
  return Math.round((sqin / 144) * 10) / 10;
}
