export type ID = string;

export type Nullable<T> = T | null | undefined;

export type ISODateString = string;

export type Coordinates = {
  x: number;
  y: number;
};

export type Dimensions = {
  width: number;
  height: number;
};

export type TeamSideValue = "HOME" | "AWAY" | "NEUTRAL";

export type PitchZoneValue =
  | "DEFENSIVE"
  | "MIDFIELD"
  | "ATTACKING"
  | "WIDE_LEFT"
  | "WIDE_RIGHT"
  | "CENTRE"
  | "GOAL_AREA"
  | "CUSTOM";

export type MatchPeriodValue =
  | "WARMUP"
  | "FIRST_HALF"
  | "HALF_TIME"
  | "SECOND_HALF"
  | "EXTRA_TIME_FIRST"
  | "EXTRA_TIME_SECOND"
  | "PENALTIES"
  | "FULL_TIME";

export type StatEventTypeValue =
  | "GOAL"
  | "POINT"
  | "WIDE"
  | "FOUL"
  | "KICKOUT"
  | "KICKIN"
  | "TURNOVER"
  | "SCORE_ASSIST"
  | "SUBSTITUTION"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "PERIOD_START"
  | "PERIOD_END"
  | "CUSTOM";

export type BoardOverlayType = "shape" | "path" | "marker" | "label" | "legend";

export type OverlayShape = {
  id: ID;
  type: "rect" | "ellipse" | "polygon" | "line";
  points?: Coordinates[];
  bbox?: Coordinates & Partial<Dimensions>;
  style?: Record<string, string | number | undefined>;
};

export type OverlayLabel = {
  id: ID;
  text: string;
  position: Coordinates;
  emphasis?: "low" | "medium" | "high";
};

export type OverlayLegendItem = {
  id: ID;
  label: string;
  color?: string;
  description?: string;
};

export type BoardOverlayData = {
  version: 1;
  overlays: Array<{
    id: ID;
    overlayType: BoardOverlayType;
    shape?: OverlayShape;
    label?: OverlayLabel;
  }>;
  legend?: OverlayLegendItem[];
};

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiErrorPayload = {
  ok: false;
  code: AppErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
};

export type ApiSuccessPayload<T> = {
  ok: true;
  data: T;
};

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor?: string | null;
  total?: number;
};
