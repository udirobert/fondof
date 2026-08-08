/** Shared material tokens for the landing WebGL scene (CSS var mirrors). */
export const experienceColors = {
  ink: "#1a1612",
  mist: "#2a2520",
  paper: "#f2ede4",
  paperSoft: "#d9d0c2",
  ember: "#e07a45",
  emberHot: "#f0955c",
  steel: "#9aadc0",
  novel: "#4db6a0",
} as const;

export type ExperienceColor = keyof typeof experienceColors;
