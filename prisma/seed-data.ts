// Source data for the initial seed, reconciled from:
//  - the V1 HTML prototype (clean, internally-consistent roster)
//  - the PRD (Dashboard_PRD_2), whose tables suffered PDF-extraction
//    corruption (columns visibly reordered) but which explicitly renames
//    one editor ("Rahul with Sahil" -> "Rahul with Manav") and adds a
//    handful of new clients to a few cohorts.
//
// Known open items (see PRD §8, and flagged again in the delivery notes):
//  - Client roster totals to 50 here vs. the PRD's stated "48 clients" -
//    the PRD's own cohort tables sum to 51 as extracted, so the true
//    count needs confirming against the source spreadsheet.
//  - Weekly IP targets are still placeholders (PRD §8.2 asks each IP CS
//    to confirm/correct these).
//  - W1-W4 cohort-to-IP assignments were left blank in the prototype and
//    are seeded empty here too (PRD §8.4) - populate via the Rotation
//    screen once the real schedule is known.

export const cohortSeed: { code: string; leaderName: string; clients: string[] }[] = [
  {
    code: "C1",
    leaderName: "Aasawari",
    clients: [
      "Hiranandani Communities",
      "Regalia",
      "RUPL + ASR",
      "Raheja District",
      "Agami Realty",
      "Eden Club",
      "Sajay Developers",
      "Merx Group",
      "Sosar Group",
      "PCPL",
    ],
  },
  {
    code: "C2",
    leaderName: "Pooja",
    clients: [
      "Gurukrupa Group",
      "Savvy",
      "Kensville",
      "Raymond",
      "R & Y",
      "R & Y & Liventa",
      "Rishab & Yaswanth",
      "Savvy Greens",
    ],
  },
  {
    code: "C3",
    leaderName: "Shradha",
    clients: [
      "Fortune Primero",
      "Viera",
      "Aakshya",
      "Nexsa",
      "IMB",
      "Perspective",
      "GHP Group",
      "Ramsons Trendsquares",
      "TRL",
    ],
  },
  {
    code: "C4",
    leaderName: "Shilpa",
    clients: [
      "Trendsquares WOG",
      "Vaibhavlaxmi Developers",
      "Elements",
      "Sibermond",
      "Man Development",
      "Vaswani",
      "Divyashree",
    ],
  },
  {
    code: "C5",
    leaderName: "Harsh",
    clients: ["West Avenue Realty", "Aum Developers", "Patil Developers", "KRCH", "Jade"],
  },
  {
    code: "C6",
    leaderName: "Karan",
    clients: ["Today Global", "MS Realty", "Vascon", "NCC Urban", "Palkhi"],
  },
  {
    code: "C7",
    leaderName: "Yoshita",
    clients: ["House of Jets", "Krisala", "SAA", "Eltria", "BHC", "Ajwani"],
  },
];

export const ipSeed: {
  name: string;
  ipcs: string;
  designer: string;
  editors: string[];
  defaultWeeklyTarget: number;
}[] = [
  { name: "Bytes", ipcs: "Prutha", designer: "Cohort Designers", editors: ["Talib", "Ashish", "Karan"], defaultWeeklyTarget: 10 },
  { name: "Team Culture", ipcs: "Prutha", designer: "Cohort Designers", editors: [], defaultWeeklyTarget: 8 },
  { name: "AI Walkthrough", ipcs: "Rahul with Manav", designer: "Avantika", editors: ["Owaish"], defaultWeeklyTarget: 8 },
  { name: "Location Restaurant", ipcs: "Rahul with Manav", designer: "Avantika", editors: ["Shubham"], defaultWeeklyTarget: 10 },
  { name: "Construction Update", ipcs: "Rahul with Manav", designer: "Avantika", editors: ["Abhijit"], defaultWeeklyTarget: 7 },
  { name: "Trending fun facts", ipcs: "Rahul with Manav", designer: "Avantika", editors: [], defaultWeeklyTarget: 10 },
  { name: "History Decoded", ipcs: "Akash Satish", designer: "Dhanesh / Dallas", editors: ["Abhishek"], defaultWeeklyTarget: 10 },
  { name: "Events", ipcs: "Akash Satish", designer: "Dhanesh / Dallas", editors: ["Sanket"], defaultWeeklyTarget: 10 },
  { name: "Connectivity + Infrastructure", ipcs: "Adarsh", designer: "Bhavna", editors: ["Sameer"], defaultWeeklyTarget: 10 },
  { name: "Sample Flat", ipcs: "Muskaan / Rishika", designer: "Nikhil", editors: ["Abhijeet"], defaultWeeklyTarget: 10 },
  { name: "Unique USP", ipcs: "Joan", designer: "Apeksha", editors: ["Omkar"], defaultWeeklyTarget: 8 },
];
