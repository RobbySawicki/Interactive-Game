# Sales pitch deck

The client-facing deck for pitching Interactive Media to brands.

> **Not served from the website.** This folder lives in the repo but is not linked from `/index.html`. Clients receive the PDF directly from the sales rep — they don't browse `/pitch-deck/`. Don't add a link to it on the site.

## Files

| File | Purpose |
|---|---|
| `Interactive-Media-Pitch.pdf` | Final client deliverable. Send this. |
| `Interactive-Media-Pitch.docx` | Editable working copy. Update copy / contact info here, regenerate PDF when ready. |
| `build_deck.py` | Generates the PDF (16 slides, 16:9, branded). |
| `build_word.py` | Generates the Word version. |

## Regenerate

```bash
cd pitch-deck
pip install reportlab python-docx pillow
python3 build_deck.py     # → Interactive-Media-Pitch.pdf
python3 build_word.py     # → Interactive-Media-Pitch.docx
```

## Deck structure (16 slides)

1. Cover — hero pitch, three-surface visual
2. The problem — why OOH alone doesn't convert
3. The product — "It's an interactive game"
4. Why it works — stop / hold / capture
5. The setup — three surfaces, one game
6. Surface 01: the iPad (player)
7. Surface 02: the LED panel / projection (hype)
8. Surface 03: the rear panel / QR drop (capture)
9. Game ideas — action mechanics
10. Game ideas — brand / creative mechanics
11. Walked example — one round, step-by-step
12. Reskin examples — 8 brand category ideas
13. Where it goes — activation contexts
14. What you get — deliverables
15. See it live — demo codes for the rep to share
16. CTA — contact card (fill before sending)

## Customising per pitch

For a specific pitch, the rep should:

1. Open `Interactive-Media-Pitch.docx`.
2. Fill in the **Contact** block on the final slide.
3. Optionally swap one of the reskin examples for the prospect's category (slide 12).
4. Optionally drop a custom demo code on slide 15 (request one from the team — we'll set up the route).
5. Export to PDF: **File → Save as → PDF**.

## Demo codes baked in

The deck references the public codes available at interactivemedia.ca:

- `DEMO` — side-by-side preview, iPad + truck synced live
- `DEMO 2` — single-surface tap-to-the-beat reflex sprint
- `OREO` — sample branded build

Custom codes can be issued per opportunity.
