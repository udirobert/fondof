/** Shared material tokens for the landing WebGL scene (CSS var mirrors). */
export const experienceColors = {
  ink: "#2a241c",
  mist: "#e8dfd0",
  parchment: "#f4efe6",
  paper: "#fffaf2",
  paperSoft: "#ebe2d4",
  ember: "#c45a2a",
  emberHot: "#a84820",
  steel: "#5a6d7e",
  novel: "#2f8f7a",
} as const;

export type ExperienceColor = keyof typeof experienceColors;
