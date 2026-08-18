#!/usr/bin/env python3
"""Rebuild caption_groups.json + compositions/captions.html from audio_meta.json word timings."""
import json, re, pathlib

ROOT = pathlib.Path(__file__).parent
meta = json.loads((ROOT / "audio_meta.json").read_text())

# scene start = cumulative voice durations (matches index.html)
starts = {}
t = 0.0
for v in meta["voices"]:
    starts[v["frame"]] = t
    t += v["duration_s"]
TOTAL = 56.0
SUPPRESS_AT = 49.2  # frame 7: captions off once the on-screen statement/URL takes over

groups = []
gid = 0
for v in meta["voices"]:
    off = starts[v["frame"]]
    words = [{**w, "start": round(w["start"] + off, 3), "end": round(w["end"] + off, 3)} for w in v["words"]]
    words = [w for w in words if w["start"] < SUPPRESS_AT]
    cur = []
    def flush():
        global gid
        if not cur:
            return
        groups.append({
            "id": f"caption-group-{gid}",
            "frame": v["frame"],
            "start": cur[0]["start"],
            "end": cur[-1]["end"],
            "text": " ".join(w["text"] for w in cur),
            "words": [{"id": f"caption-word-{gid}-{i}", "text": w["text"], "start": w["start"], "end": w["end"]} for i, w in enumerate(cur)],
        })
        gid += 1
        cur.clear()
    for i, w in enumerate(words):
        cur.append(w)
        ends_punct = bool(re.search(r"[.,?!:;]$", w["text"]))
        gap = words[i + 1]["start"] - w["end"] if i + 1 < len(words) else 99
        if len(cur) >= 3 or (ends_punct and len(cur) >= 2) or gap > 0.4:
            flush()
    flush()

(ROOT / "caption_groups.json").write_text(json.dumps({"total_duration_s": TOTAL, "width": 1080, "height": 1920, "groups": groups}, indent=1))
print(f"wrote caption_groups.json ({len(groups)} groups)")

skin = (ROOT / ".hyperframes" / "caption-skin.html").read_text()
tokens = """<style data-brand-tokens="">
      :root {
      --ink: #221812;
      --cream: #F7F1E5;
      --tile: #FFDDCE;
      --tile-strong: #B53700;
      --coral: #C5521C;
      --navy: #181615;
      --navy-soft: #1F1C1B;
      --navy-elev: #252220;
      --cap-ink: #221812;
      --cap-canvas: #F7F1E5;
      --cap-accent: #B53700;
      --cap-accent-2: #C5521C;
      --font-display: "Outfit", system-ui, serif;
      --font-body: "Outfit", system-ui, sans-serif;
      --cap-band-top: 1600px;
      --cap-band-height: 320px;
      }
    </style>"""
html = skin.replace('<style data-brand-tokens></style>', tokens)
html = html.replace("var GROUPS = [];", "var GROUPS = " + json.dumps(groups) + ";")
html = html.replace("var DURATION = 0;", f"var DURATION = {TOTAL};")
html = html.replace('data-duration="0"', f'data-duration="{TOTAL}"', 1)
html = html.replace('data-width="0"', 'data-width="1080"', 1)
html = html.replace('data-height="0"', 'data-height="1920"', 1)
# suppress captions once the closing statement + URL take over the screen
html = html.replace(
    "// full-span anchor so the sub-comp timeline spans the whole video",
    f'// closing statement + URL are read on-screen; drop captions for the CTA read\n    tl.set("#captions-root", {{ opacity: 0 }}, {SUPPRESS_AT});\n\n    // full-span anchor so the sub-comp timeline spans the whole video',
)
html = html.replace('<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>',
                    '<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>\n')
html = "<template id=\"captions-template\" data-composition-id=\"captions\" data-width=\"1080\" data-height=\"1920\">\n" + html + "\n<style>\n  .caption-line { line-height: 1.1 !important; }\n</style>\n</template>\n"
(ROOT / "compositions" / "captions.html").write_text(html)
print("wrote compositions/captions.html")
