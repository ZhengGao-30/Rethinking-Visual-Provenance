# Rethinking Visual Provenance — a plain-language guide

A static web page that explains, in plain language, the research paper

> **Rethinking Visual Provenance: Detection and Watermarking Across Direct Visual Generation and LLM-Driven Code Rendering**
> Zheng Gao, Xiaoyu Li, Zhicheng Bao, Yang Song, Jiaojiao Jiang (UNSW Sydney)

The paper is a **conceptual research agenda** (a working draft). It reports no experiments and no new theorems, and the page makes no claim about how well any detector or watermark works. The page asks how a video was made (a model painting the pixels, or code drawing them) and what a hidden watermark, a guess by a detector, or a signed record could and could not show.

## What is here

- `index.html`, `css/site.css`, `js/site.js`: the page. Plain HTML, CSS and a small script. No build step, no framework, no analytics, no web fonts, no tracking.
- `assets/paper.pdf`: the paper (46 pages) that the page summarises.
- `assets/img/figures/`: the paper's conceptual figures (made with an image model for the paper; not measurements).
- `assets/img/examples/`: example frames, each with a visible credit and a source link on the page: four frames from Google's Veo 3.1 documentation and three frames from videos credited to code-based workflows.
- `assets/img/video/`: the cover image of the companion video (a frame from the local render of the paper's 4-minute explainer).
- `assets/img/art/`: one small hand-built SVG drawing.

## View it

Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8000
```

then visit <http://localhost:8000/>.

When GitHub Pages is switched on for this repository (Settings → Pages → Deploy from a branch → `main` / root), the page is served at <https://zhenggao-30.github.io/Rethinking-Visual-Provenance/>.

## Notes

- **Example frames are other people's work.** They are shown to illustrate the topic, with the creator or provider credit and a link to the source under each frame. The page says only what each source says about how its video was made.
- **The companion video** is the paper's 4-minute explainer by Zheng Gao (YouTube `14SMl0d_e48`). **The player loads YouTube only when you press play.** Until then the page makes no request to YouTube. The player uses YouTube's privacy-enhanced embed (`youtube-nocookie.com`).
- **Licence.** No licence file is included; the repository owner has not chosen one yet.
