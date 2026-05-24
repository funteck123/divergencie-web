---
name: visual-refinement-loop
description: >
  Critic-in-the-loop visual design iteration using render → perceive → critique → rewrite cycles.
  Use this skill whenever producing any visual deliverable: academic posters, HTML/CSS layouts,
  data visualisations, SVG illustrations, UI mockups, or any print-ready design. Trigger on any
  request to "make a poster", "design a layout", "create a chart", "build a UI", or "improve the
  design" — even if the user hasn't explicitly asked for iteration. This skill MUST be used any
  time Claude is generating output that will be visually rendered and judged by a human eye.
  Do not skip this skill for visual tasks just because the first version "looks fine in code".
---

# SKILL: Visual Refinement Loop (VRL)
> Critic-in-the-Loop Design Iteration for Claude

**Synthesised from:**
- *Vision-Guided Iterative Refinement for Frontend Code Generation* — Amazon Science / arXiv 2604.05839 (2025)
- *IntroSVG: Introspective Generator-Critic Framework* — arXiv 2603.09312 (2025)
- *Visual Prompting with Iterative Refinement for Design Critique Generation* — arXiv 2412.16829 (2024)

---

## What This Skill Is

You are both **Generator** and **Critic**. You write code, render it to an image, *look* at the rendered image with your vision, critique what you actually see (not what you intended), then rewrite. You repeat this loop autonomously — without waiting for the user to tell you what's wrong.

This is not "write then check". It is: write → render → perceive → critique → rewrite → repeat.

---

## When to Activate

Activate this skill whenever you are producing any visual deliverable:

- Academic/conference posters (HTML, matplotlib, SVG)
- Data visualisation (charts, diagrams, infographics)
- UI mockups or web components
- Any HTML/CSS layout intended for print or presentation
- Any SVG illustration

**Do not activate** for pure text, code logic, or data analysis with no visual output.

---

## The Loop: Step-by-Step Protocol

### Stage 0 — Pre-flight

Before writing a single line of code:

1. Read the relevant `SKILL.md` files (frontend-design, pdf, etc.)
2. Check what rendering tool is available:
   ```bash
   which chromium || python3 -c "from playwright.sync_api import sync_playwright; p=sync_playwright().start(); b=p.chromium.launch(); print('playwright ok'); b.close(); p.stop()"
   ```
3. Confirm you can render to PNG — if not, adapt (use `wkhtmltopdf`, `matplotlib savefig`, or `cairosvg`)
4. State your design intent in 1 sentence before generating: e.g. *"Bold minimalism: black/white/one accent, oversized type, max whitespace."* This is your north star for critique.

---

### Stage 1 — Generate (v1)

Write a complete, runnable v1. Aim for structural correctness first:
- Layout proportions and column counts
- Correct content placement
- Readable base typography

Save as `poster_v1.html` (or `.py`, `.svg`).

---

### Stage 2 — Render to PNG

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 2480, "height": 3508})
    page.goto("file:///home/claude/poster_v1.html")
    page.wait_for_timeout(2000)
    page.screenshot(path="/home/claude/poster_v1.png", full_page=True)
    browser.close()
print("Rendered: poster_v1.png")
EOF
```

For matplotlib: just `plt.savefig("poster_v1.png", dpi=150, bbox_inches='tight')`.

---

### Stage 3 — Vision Critique (CRITICAL STEP)

View the rendered PNG with your vision tool. Do **not** critique the code — critique what you **see**.

Run this critique protocol on the image. Be honest and harsh:

#### The 8-Axis Critique Framework

**1. Hierarchy** — Can you identify the most important element within 2 seconds? If no, it's broken.

**2. Alignment** — Are all text blocks, boxes, and figures aligned to a consistent grid? Eyeball for any ragged edges, orphaned elements, or inconsistent left-margins.

**3. Spacing** — Is whitespace consistent? Look for: cramped sections, uneven padding inside boxes, columns that look unbalanced.

**4. Typography** — Are font sizes creating clear contrast between headings, subheadings, body, and captions? Any text that looks the same size as adjacent text at a different level is a failure.

**5. Colour** — Does the accent colour actually accent anything, or is it everywhere? Check: background/foreground contrast, coloured elements that are hard to read, any colour that looks muddy or off on screen.

**6. Figure quality** — Do SVG diagrams, tables, and charts look intentional or cobbled together? Check: labels readable, line weights consistent, no overlapping text.

**7. Overall impression** — Look at the poster from arm's length (zoom out mentally). Does it look like a professional publication or a student draft?

**8. Content fit** — Is any section visually overloaded? Is any section embarrassingly empty?

#### Output a Structured Critique

Write your critique in this format before touching the code:

```
CRITIQUE v1 → v2
=================
HIERARCHY:    [pass/fail + 1 sentence]
ALIGNMENT:    [pass/fail + what's misaligned]
SPACING:      [pass/fail + where]
TYPOGRAPHY:   [pass/fail + which sizes need changing]
COLOUR:       [pass/fail + what to fix]
FIGURES:      [pass/fail + what's wrong]
IMPRESSION:   [honest 1-sentence gut reaction]
CONTENT FIT:  [which sections need rebalancing]

TOP 3 FIXES (in priority order):
1. [most damaging issue]
2. [second]
3. [third]
```

---

### Stage 4 — Targeted Rewrite

Apply only the top 3 fixes. Do not rewrite everything — that introduces new bugs. Surgical edits only.

Save as `poster_v2.html`. Re-render to `poster_v2.png`.

---

### Stage 5 — Re-Critique

View `poster_v2.png`. Run the 8-axis critique again. Note what improved and what didn't.

**Key rule (from CITL research):** Diminishing returns set in after 3 cycles. Do not run more than 3-4 iterations — quality plateaus and can regress. Stop when:
- Hierarchy, alignment, and typography all pass
- Overall impression is "professional"
- Remaining issues are minor preferences, not design failures

---

### Stage 6 — Final Output

Copy the best version to outputs:

```bash
cp /home/claude/poster_v3.html /mnt/user-data/outputs/poster_final.html
cp /home/claude/poster_v3.png /mnt/user-data/outputs/poster_final.png
```

Present both files. Write a brief **"What changed between v1 and final"** note so the user understands what was fixed.

---

## Two-Critic Architecture (for harder tasks)

Based on the CITL paper (Amazon, 2025) and METAL (Li et al., 2025): separate visual and code critique roles.

**When to use:** Posters with complex SVG diagrams, or UI mockups with many interactive states.

**How:**
1. **Visual Critic pass** — Look at the PNG only. Ignore the code. List purely perceptual issues (layout, colour, spacing, readability).
2. **Code Critic pass** — Read the code with the visual critique in hand. Translate each perceptual issue into a specific CSS/HTML/Python fix.
3. Write the fix.

This two-stage separation produces better corrections than trying to do both in one pass. The visual critic abstracts away from implementation; the code critic translates vision into action.

---

## Typography Scale Reference

For A0/A1 print posters at 2480px wide, these pixel sizes work:

| Role | Size |
|------|------|
| Title / wordmark | 90–130px |
| Section label | 20–28px (uppercase, tracked) |
| Body text | 26–32px |
| Caption / footnote | 20–24px |
| Table cell | 24–28px |
| Equation | 28–34px |

If body and caption are within 4px of each other, the hierarchy is broken. Increase the gap.

---

## Colour Usage Rules

- Maximum **2 accent colours** per poster. One primary (e.g. red), one optional warm secondary (e.g. amber). Everything else is black/white/grey.
- The accent must appear on **no more than 20% of the poster area**. If it's everywhere, it accents nothing.
- Table highlight row: accent background + white text only. Never dark text on accent.
- Section labels: accent colour works. Section body text: black or dark grey only.
- Background: pure white (`#FAFAFA`) or pure black. Never mid-grey backgrounds — they look washed out.

---

## Common Failure Modes (and Fixes)

| What you'll see in the PNG | Why it happens | Fix |
|---|---|---|
| All columns look the same visual weight | Body text same size as headings | Increase heading size by 2× |
| Section boxes look like prison cells | Too much border/background on every element | Remove most borders; use space to separate, not lines |
| Accent colour everywhere | Used accent for all headings + all key terms | Reserve accent for section labels and 1 highlight row only |
| Figures look like placeholders | SVG drawn at wrong scale, text too small | Rebuild SVG at full viewBox resolution; check text is ≥16px within SVG |
| Footer text unreadable | Font too small on dark background | Minimum 22px, check contrast ratio |
| Columns unbalanced | Content dumped without balancing across 3 cols | Move 1-2 bullet points to shorter column; add stat callout boxes |
| Equation looks like regular text | Not styled distinctively | Use italic, serif font, left-border box, monospace if needed |

---

## Execution Checklist

Before calling the loop complete, verify:

- [ ] Rendered and viewed the PNG at least twice (v1 → v2 minimum)
- [ ] Written a structured critique before each rewrite
- [ ] Applied only top-3 fixes per iteration (not a full rewrite)
- [ ] Typography hierarchy has at least 3 clearly distinct size levels
- [ ] Accent colour appears in ≤3 distinct roles (section label, table row, header band)
- [ ] All SVG figures have legible labels (≥16px within viewBox)
- [ ] Final version copied to `/mnt/user-data/outputs/`
- [ ] Presented files and written a changelog summary

---

## Research Basis — Key Findings

**From CITL (Amazon, arXiv 2604.05839):**
- Automated VLM critique of rendered output achieves up to 17.8% quality improvement over 3 cycles
- Two-stage critique (visual critic → code critic) outperforms a single unified critic
- Diminishing returns and quality regressions appear after cycle 3-4; stop there

**From IntroSVG (arXiv 2603.09312):**
- The "generate-critique-refine" loop is a zero-shot capability — no fine-tuning needed for Claude
- The model perceives the rendered PNG (not the code) as the ground truth of quality
- Early-stage failures are the most correctable; late-stage regressions are hard to recover from

**From UICrit / Visual Prompting (arXiv 2412.16829):**
- Grounding critique to specific bounding box regions improves actionability
- In practice for Claude: name the exact element ("the left column body text", "the MH04 table row") not just "the typography needs work"
- Few-shot critique samples improve feedback quality; internalize the 8-axis framework above

---

*This skill synthesises SOTA methods as of mid-2025. The core loop — render, perceive, critique with axis structure, targeted edit, repeat — is the most validated approach for visual quality improvement without human-in-the-loop.*
