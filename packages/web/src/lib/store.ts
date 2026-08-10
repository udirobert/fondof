import { create } from "zustand";
import type {
  IdeaFromAPI,
  ForgeResponse,
  ExistingSkillHit,
  IngestValue,
} from "./api";
import type { ConnectedRepo } from "./github-repo";

export interface SourceEntry {
  url: string;
  title: string;
  contentType: string;
  ideasCount: number;
  sourceHash: string;
  isProcessing: boolean;
  /** Characters extracted (transcript / article body) */
  textLength?: number;
  /** Full source body for view / copy / download (session) */
  bodyText?: string;
  extractProvider?: string;
  cacheHit?: boolean;
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
  /** User-added GitHub repos (public) */
  userRepos: ConnectedRepo[];
  addUserRepo: (repo: ConnectedRepo) => void;
  removeUserRepo: (fullName: string) => void;

  // Ideas
  ideas: IdeaFromAPI[];
  setIdeas: (ideas: IdeaFromAPI[]) => void;
  addIdeas: (ideas: IdeaFromAPI[]) => void;
  selectedIdeaIds: Set<string>;
  toggleIdeaSelection: (id: string) => void;
  selectIdeas: (ids: string[]) => void;
  clearSelection: () => void;
  /** Existing skills from the Compare stage (Exa) — not auto-fetched on extract */
  discoverySkills: ExistingSkillHit[];
  setDiscoverySkills: (skills: ExistingSkillHit[]) => void;
  ingestValue: IngestValue | null;
  setIngestValue: (value: IngestValue | null) => void;
  compareNote: string | null;
  setCompareNote: (note: string | null) => void;
  /** Partial-overlap targets — forge composes a delta vs these skills */
  gapByIdeaId: Record<
    string,
    { title: string; url: string; snippet?: string }
  >;
  setGapForIdea: (
    ideaId: string,
    gap: { title: string; url: string; snippet?: string } | null,
  ) => void;
  clearGaps: () => void;
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
  userRepos: [],
  addUserRepo: (repo) =>
    set((s) => {
      if (s.userRepos.some((r) => r.fullName === repo.fullName)) {
        return { activeRepo: repo.fullName };
      }
      return {
        userRepos: [repo, ...s.userRepos],
        activeRepo: repo.fullName,
      };
    }),
  removeUserRepo: (fullName) =>
    set((s) => {
      const userRepos = s.userRepos.filter((r) => r.fullName !== fullName);
      const activeRepo =
        s.activeRepo === fullName
          ? userRepos[0]?.fullName || "udirobert/fondof"
          : s.activeRepo;
      return { userRepos, activeRepo };
    }),

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
  ingestValue: null,
  setIngestValue: (value) => set({ ingestValue: value }),
  compareNote: null,
  setCompareNote: (note) => set({ compareNote: note }),
  gapByIdeaId: {},
  setGapForIdea: (ideaId, gap) =>
    set((s) => {
      const next = { ...s.gapByIdeaId };
      if (!gap) delete next[ideaId];
      else next[ideaId] = gap;
      return { gapByIdeaId: next };
    }),
  clearGaps: () =>
    set((s) =>
      Object.keys(s.gapByIdeaId).length === 0 ? s : { gapByIdeaId: {} },
    ),
  loadSample: (sources, ideas, selectIds = []) =>
    set({
      sources,
      ideas,
      selectedIdeaIds: new Set(selectIds),
      discoverySkills: [],
      gapByIdeaId: {},
      ingestValue: {
        providers: ["cache"],
        cacheHit: true,
        sourceHash: sources[0]?.sourceHash || "demo",
        textLength: sources[0]?.textLength ?? 0,
        ideaCount: ideas.length,
        deferred: ["exa", "forge", "publish"],
      },
      compareNote: null,
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
