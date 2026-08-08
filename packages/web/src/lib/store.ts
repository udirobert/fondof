import { create } from "zustand";
import type { IdeaFromAPI, ForgeResponse, ExistingSkillHit } from "./api";

export interface SourceEntry {
  url: string;
  title: string;
  contentType: string;
  ideasCount: number;
  sourceHash: string;
  isProcessing: boolean;
}

export interface AppState {
  // Sources
  sources: SourceEntry[];
  addSource: (source: SourceEntry) => void;
  updateSource: (url: string, update: Partial<SourceEntry>) => void;
  removeSource: (url: string) => void;

  // Fit target (repo the skill is composed for)
  activeRepo: string;
  setActiveRepo: (fullName: string) => void;

  // Ideas
  ideas: IdeaFromAPI[];
  setIdeas: (ideas: IdeaFromAPI[]) => void;
  addIdeas: (ideas: IdeaFromAPI[]) => void;
  selectedIdeaIds: Set<string>;
  toggleIdeaSelection: (id: string) => void;
  selectIdeas: (ids: string[]) => void;
  clearSelection: () => void;
  /** Existing skills that overlap the latest ingest (Exa / SkillPool search) */
  discoverySkills: ExistingSkillHit[];
  setDiscoverySkills: (skills: ExistingSkillHit[]) => void;
  /** Instant path: seed sources + ideas + optional preselection */
  loadSample: (
    sources: SourceEntry[],
    ideas: IdeaFromAPI[],
    selectIds?: string[],
  ) => void;

  // Forge
  forgedSkill: ForgeResponse | null;
  setForgedSkill: (skill: ForgeResponse | null) => void;

  // Publish
  publishedTxHash: string | null;
  publishedSignal: string | null;
  setPublished: (txHash: string, signal: string) => void;

  // UI State
  isIngesting: boolean;
  setIngesting: (v: boolean) => void;
  isForging: boolean;
  setForging: (v: boolean) => void;
  isPublishing: boolean;
  setPublishing: (v: boolean) => void;
  forgeOpen: boolean;
  setForgeOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Sources
  sources: [],
  addSource: (source) => set((s) => ({ sources: [...s.sources, source] })),
  updateSource: (url, update) =>
    set((s) => ({
      sources: s.sources.map((src) =>
        src.url === url ? { ...src, ...update } : src,
      ),
    })),
  removeSource: (url) =>
    set((s) => ({ sources: s.sources.filter((src) => src.url !== url) })),

  activeRepo: "udirobert/fondof",
  setActiveRepo: (fullName) => set({ activeRepo: fullName }),

  // Ideas
  ideas: [],
  setIdeas: (ideas) => set({ ideas }),
  addIdeas: (ideas) => set((s) => ({ ideas: [...s.ideas, ...ideas] })),
  selectedIdeaIds: new Set(),
  toggleIdeaSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedIdeaIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIdeaIds: next };
    }),
  selectIdeas: (ids) => set({ selectedIdeaIds: new Set(ids) }),
  clearSelection: () => set({ selectedIdeaIds: new Set() }),
  discoverySkills: [],
  setDiscoverySkills: (skills) => set({ discoverySkills: skills }),
  loadSample: (sources, ideas, selectIds = []) =>
    set({
      sources,
      ideas,
      selectedIdeaIds: new Set(selectIds),
      discoverySkills: [
        {
          title: "agent-skills/reliability-patterns",
          url: "https://github.com/agentskills/reliability-patterns",
          snippet:
            "Circuit breakers, retry budgets, and timeout composition for agent tooling.",
        },
        {
          title: "skills.sh/compose-from-sources",
          url: "https://skills.sh/compose-from-sources",
          snippet:
            "Combine overlapping techniques into one fitted skill markdown.",
        },
      ],
      forgedSkill: null,
      publishedTxHash: null,
      publishedSignal: null,
    }),

  // Forge
  forgedSkill: null,
  setForgedSkill: (skill) => set({ forgedSkill: skill }),

  // Publish
  publishedTxHash: null,
  publishedSignal: null,
  setPublished: (txHash, signal) => set({ publishedTxHash: txHash, publishedSignal: signal }),

  // UI State
  isIngesting: false,
  setIngesting: (v) => set({ isIngesting: v }),
  isForging: false,
  setForging: (v) => set({ isForging: v }),
  isPublishing: false,
  setPublishing: (v) => set({ isPublishing: v }),
  forgeOpen: false,
  setForgeOpen: (v) => set({ forgeOpen: v }),
}));
