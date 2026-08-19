/**
 * Lusion-inspired DOM ↔ WebGL sync helpers.
 * Canvas scrolls with the page (absolute + translate), meshes track element bounds.
 */

export interface DomAnchor {
  id: string;
  /** Document-space left */
  x: number;
  /** Document-space top */
  y: number;
  width: number;
  height: number;
  /** 0–1 visibility in viewport */
  visibility: number;
}

export interface ScrollSyncState {
  scrollX: number;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
  /** Extra canvas padding as fraction of viewport height (Lusion default ~0.25) */
  padding: number;
  /** Document-space top of the canvas root (0 when it starts at page top) */
  rootOffsetY: number;
  anchors: Record<string, DomAnchor>;
}

export function createScrollSyncState(padding = 0.25): ScrollSyncState {
  return {
    scrollX: 0,
    scrollY: 0,
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : 1,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 1,
    padding,
    rootOffsetY: 0,
    anchors: {},
  };
}

/** Read all `[data-gl-anchor]` elements into document-space rects. */
export function sampleAnchors(
  state: ScrollSyncState,
  root: ParentNode = document,
): void {
  const nodes = root.querySelectorAll<HTMLElement>("[data-gl-anchor]");
  const next: Record<string, DomAnchor> = {};
  const vh = state.viewportHeight;

  nodes.forEach((el) => {
    const id = el.dataset.glAnchor;
    if (!id) return;
    const rect = el.getBoundingClientRect();
    const topDoc = rect.top + state.scrollY;
    const bottomDoc = topDoc + rect.height;
    const viewTop = state.scrollY;
    const viewBottom = state.scrollY + vh;
    const visible =
      Math.max(0, Math.min(bottomDoc, viewBottom) - Math.max(topDoc, viewTop)) /
      Math.max(1, rect.height);

    next[id] = {
      id,
      x: rect.left + state.scrollX,
      y: topDoc,
      width: rect.width,
      height: rect.height,
      visibility: Math.min(1, Math.max(0, visible)),
    };
  });

  state.anchors = next;
}

/**
 * Convert document-space point to world coords on a plane at `planeZ`,
 * for a perspective camera looking down -Z at the origin.
 */
export function documentToWorld(
  docX: number,
  docY: number,
  state: ScrollSyncState,
  cameraZ: number,
  fovDeg: number,
  planeZ = 0,
): { x: number; y: number } {
  // Position relative to current viewport center (canvas is translated with scroll)
  const canvasTop =
    state.scrollY - state.rootOffsetY - state.viewportHeight * state.padding;
  const screenX = docX - state.scrollX;
  const screenY = docY - canvasTop;

  const canvasH = state.viewportHeight * (1 + state.padding * 2);
  const canvasW = state.viewportWidth;

  const ndcX = (screenX / canvasW) * 2 - 1;
  const ndcY = -(screenY / canvasH) * 2 + 1;

  const dist = cameraZ - planeZ;
  const halfH = Math.tan((fovDeg * Math.PI) / 360) * dist;
  const halfW = halfH * (canvasW / canvasH);

  return {
    x: ndcX * halfW,
    y: ndcY * halfH,
  };
}

export function anchorCenterWorld(
  anchor: DomAnchor,
  state: ScrollSyncState,
  cameraZ = 8,
  fovDeg = 42,
): { x: number; y: number; visibility: number } {
  const cx = anchor.x + anchor.width / 2;
  const cy = anchor.y + anchor.height / 2;
  const { x, y } = documentToWorld(cx, cy, state, cameraZ, fovDeg);
  return { x, y, visibility: anchor.visibility };
}
