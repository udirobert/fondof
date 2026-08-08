import { z } from "zod";

/** Schema for a single extracted idea from the LLM */
export const extractedIdeaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  domain: z.array(z.string()).min(1),
  applicability: z.array(z.string()).min(1),
  patternType: z.enum(["technique", "mental-model", "anti-pattern", "architecture"]),
});

/** Schema for the full LLM response (array of ideas) */
export const extractedIdeasResponseSchema = z.array(extractedIdeaSchema).min(1);

export type ExtractedIdeaLLM = z.infer<typeof extractedIdeaSchema>;
