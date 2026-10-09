// Plain value sets shared by server and client code (no database imports here).

export const PersonRole = { IP_CS: "IP_CS", DESIGNER: "DESIGNER", EDITOR: "EDITOR" } as const;
export type PersonRole = (typeof PersonRole)[keyof typeof PersonRole];

/** What a signed-in person is allowed to do across the app. */
export const AppRole = {
  ADMIN: "ADMIN",
  COHORT_LEADER: "COHORT_LEADER",
  IP_CS: "IP_CS",
  DESIGNER: "DESIGNER",
  EDITOR: "EDITOR",
  FLOATER: "FLOATER",
} as const;
export type AppRole = (typeof AppRole)[keyof typeof AppRole];

export const StatusState = { PENDING: "PENDING", PARTIAL: "PARTIAL", DONE: "DONE" } as const;
export type StatusState = (typeof StatusState)[keyof typeof StatusState];

export const Week = { W1: "W1", W2: "W2", W3: "W3", W4: "W4" } as const;
export type Week = (typeof Week)[keyof typeof Week];

export const FestiveFormat = { STATIC: "STATIC", STORY: "STORY", REEL: "REEL" } as const;
export type FestiveFormat = (typeof FestiveFormat)[keyof typeof FestiveFormat];
