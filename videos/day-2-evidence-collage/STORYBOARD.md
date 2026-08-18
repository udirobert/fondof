# Storyboard — Day 2: Evidence Collage (v2, user-as-hero rebuild)

Canvas 1080x1920, 20 fps, total 56.0s. Voice: ElevenLabs "George" (~-17 LUFS). BGM: bgm-elevenlabs.mp3 @ volume 0.11. Captions: word-level karaoke, suppressed from 49.2s (CTA read).

Cast (all halftone B&W cutouts with coral drop-shadow):
- **Courier** — protagonist robot, the through-line (F1, F2, F4, F6, F7).
- **Clerk** — overwhelmed office worker = the viewer's "before" state (F1, F5, F7 hand-off).
- **Thinker** — Rodin-style ponderer (F2, F7 finale).
- **Source Hand** — authority placing source cards (F3, F7 finale).
- **Archivist** — keeper of sources (F3, F6, F7 finale).
- **Smith** — blacksmith robot who runs the forge (F4, F6, F7 finale).
- **Inspector** — monocled reviewer with stamp (F5, F7 finale).
- Clone skill cards — the flood (F1). Full cast reunites in the F7 finale row.

## Frame 01 — The Flood (0–9.927s, voice-01 9.427s)
- Six generic clone skill cards rain down over cream grid ground (overlap/occlusion annotated).
- Clerk peers out overwhelmed behind the cards (1.4s); Courier enters from lower left (2.6s).
- Red flags stamp onto cards 1 & 2: "HALLUCINATED IMPORT" (4.2s), "FAKE API" (5.7s).
- Verdict chip "Written for no one." pops at 7.0s.
- Transition: vertical slide up.

## Frame 02 — The Question (9.427–14.582s, voice-02 5.155s)
- Big ink question card, tilted, drops in.
- "What if instead…" types in letter by letter.
- Courier leans in from right; Thinker joins lower left on "thinking that already survived" (2.7s).
- Transition: vertical slide up.

## Frame 03 — The Sources (14.582–27.260s, voice-03 12.678s)
- One Source Hand cutout slides in three times (repositioned), placing each of 3 source cards:
  1. Paul Graham — "the work everyone skips" (paulgraham.com/schlep.html)
  2. Peter Thiel — "competition is for losers" (darkened YouTube capture + play triangle)
  3. Kepano — "how moats actually stack" (stephango.com/moats)
- Archivist peeks in at lower right during card C (6.0s).
- Summary chips "3 SOURCES / REAL THINKING" (8.85s), then "vibes" pill struck through with coral stroke ("Not vibes.", 11.55s).
- Transition: zoom-blur into the forge.

## Frame 04 — The Forge (27.260–34.412s, voice-04 7.152s)
- Three mini source tiles (PG/THIEL/KEPANO) collapse down a coral arrow into the dark FORGE panel; progress bar fills; "target: /your-repo".
- Draft card pops below with suspicious line "import ghost-module from nowhere".
- Smith works the lower-left corner (1.0s); "THIS REPO ✓" chip (2.85s), Courier watches from lower right, "LOOKS CONVINCING ⚠" dashed badge (5.6s).
- Transition: vertical slide up.

## Frame 05 — The Review (34.412–40.124s, voice-05 5.712s)
- Torn fragments of the off-chain draft spread across the desk (scroll-000 / scroll-100 crops).
- Inspector opens the review from the right (0.5s); Clerk watches their draft on trial from the left (1.0s). Both exit before the sweep (4.6s).
- Review slips snap in: "FINDING 01 INVENTED IMPORT" (1.36s), "FINDING 02 FAKE REFERENCE" (2.58s).
- REJECTED / NOT FITTED coral stamp slams (3.79s).
- Fragments swept off-screen; integrity note "Never published. Never trained on. Just evidence." (4.95s).
- Transition: zoom-blur into the re-forge.

## Frame 06 — The Re-forge (40.124–47.369s, voice-06 7.245s)
- Three-step trail with numbered medallions and coral connectors:
  1. "Back to the source" (paulgraham.com/schlep.html · stephango.com/moats)
  2. "Follow the actual trail" (trace claims → verify → discard what fails)
  3. "Into this codebase" (packages/web/src/lib/skill-share.ts)
- Archivist returns with the source (0.2s); Smith carries it into the codebase (3.45s); Courier steps down the trail alongside it (4.5s).
- Result card: "A skill that actually fits." ✓ (5.0s) + provenance chip "SOURCE ROUTE RETAINED · REFORGE TRACE VERIFIED" (6.2s).
- Transition: soft blur crossfade.

## Frame 07 — Your Turn (47.369–56.0s, voice-07 7.663s)
- Courier hands the fitted skill card (forge-notes.md, "source → repo → fitted action", green ✓) to the Clerk — the viewer (0.25s); coral "THAT'S YOU." chip pops (1.05s).
- Top group clears (1.95s); "DON'T INSTALL A SKILL." in, ink strike draws through it (2.55s).
- "RE-FORGE THE THINKING." replaces it (3.75s).
- Coral URL band "fondof.netlify.app" (5.15s) + note "A source-first skill for a real repository." (5.6s).
- Full cast reunion row — Clerk, Thinker, Archivist, Smith, Inspector, Source Hand, Courier — pops in staggered (5.9s+).
- Captions suppressed from 49.2s absolute (rel 1.83) — CTA is read, not captioned.

## Integrity constraints (kept from v1)
- Off-chain draft labeled "NOT USED" — never published, never trained on.
- No fake metrics, no fake publish claims.
- Real source URLs shown; real repo code referenced (skill-share.ts).
