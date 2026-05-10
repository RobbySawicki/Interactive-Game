"""
Build the Interactive Media sales pitch deck.

Outputs:
  - Interactive-Media-Pitch.pdf  (final client deliverable)

Run:  python3 build_deck.py
"""

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# ──────────────────────────────────────────────────────────────────────────────
# Brand tokens (lifted from interactivemedia.ca site styling)
# ──────────────────────────────────────────────────────────────────────────────
BG       = HexColor("#0b0b0a")
BG2      = HexColor("#141312")
INK      = HexColor("#f4f1ea")
INK2     = HexColor("#b8b3a7")
INK3     = HexColor("#6a6557")
LINE     = HexColor("#2a2825")
LINE2    = HexColor("#3a3833")
ACCENT   = HexColor("#d4e34a")
ACCENT_INK = HexColor("#0b0b0a")
HOT      = HexColor("#e26b3f")
COOL     = HexColor("#6fa8d8")

# 16:9 widescreen
SLIDE_W, SLIDE_H = 13.333 * inch, 7.5 * inch
PAGE = (SLIDE_W, SLIDE_H)
LEFT  = 0.85 * inch
RIGHT = SLIDE_W - 0.85 * inch
CONTENT_W = RIGHT - LEFT

F_DISPLAY      = "Helvetica"
F_DISPLAY_BOLD = "Helvetica-Bold"
F_BODY         = "Helvetica"
F_BODY_BOLD    = "Helvetica-Bold"
F_MONO         = "Courier"
F_MONO_BOLD    = "Courier-Bold"
F_ITALIC       = "Helvetica-Oblique"


# ──────────────────────────────────────────────────────────────────────────────
# Chrome
# ──────────────────────────────────────────────────────────────────────────────
def draw_chrome(c, slide_num, total, section_label):
    c.setFillColor(BG)
    c.rect(0, 0, SLIDE_W, SLIDE_H, fill=1, stroke=0)

    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    inset = 0.28 * inch
    c.rect(inset, inset, SLIDE_W - 2 * inset, SLIDE_H - 2 * inset, fill=0, stroke=1)

    tick = 0.10 * inch
    for cx, cy, dx, dy in [
        (inset, inset, 1, 1),
        (SLIDE_W - inset, inset, -1, 1),
        (inset, SLIDE_H - inset, 1, -1),
        (SLIDE_W - inset, SLIDE_H - inset, -1, -1),
    ]:
        c.setStrokeColor(INK3)
        c.setLineWidth(0.6)
        c.line(cx, cy, cx + dx * tick, cy)
        c.line(cx, cy, cx, cy + dy * tick)

    bar_y = SLIDE_H - 0.50 * inch
    bx, by = 0.55 * inch, bar_y
    c.setStrokeColor(INK)
    c.setLineWidth(0.7)
    c.rect(bx, by - 0.085 * inch, 0.17 * inch, 0.17 * inch, fill=0, stroke=1)
    c.setFillColor(ACCENT)
    c.rect(bx + 0.04 * inch, by - 0.045 * inch, 0.09 * inch, 0.09 * inch, fill=1, stroke=0)

    c.setFillColor(INK)
    c.setFont(F_BODY_BOLD, 9)
    c.drawString(bx + 0.27 * inch, by - 0.02 * inch, "INTERACTIVE MEDIA")

    if section_label:
        c.setFillColor(INK3)
        c.setFont(F_MONO, 8)
        c.drawCentredString(SLIDE_W / 2, by - 0.02 * inch, section_label.upper())

    c.setFillColor(INK3)
    c.setFont(F_MONO, 8)
    c.drawRightString(SLIDE_W - 0.55 * inch, by - 0.02 * inch,
                      f"{slide_num:02d} / {total:02d}")

    foot_y = 0.45 * inch
    c.setFillColor(INK3)
    c.setFont(F_MONO, 8)
    c.drawString(0.55 * inch, foot_y, "INTERACTIVEMEDIA.CA")
    c.drawRightString(SLIDE_W - 0.55 * inch, foot_y, "GUERRILLA OOH — PLAY BACK")


# ──────────────────────────────────────────────────────────────────────────────
# Drawing primitives
# ──────────────────────────────────────────────────────────────────────────────
def eyebrow(c, x, y, text):
    c.setFillColor(ACCENT)
    c.rect(x, y + 0.05 * inch, 0.28 * inch, 0.012 * inch, fill=1, stroke=0)
    c.setFillColor(INK2)
    c.setFont(F_MONO, 9)
    c.drawString(x + 0.40 * inch, y, text.upper())


def measure_title_width(c, text, size, italic_part):
    """Return total drawn width for a title (with optional {em}…{em} italic parts)."""
    parts = text.split("{em}") if italic_part else [text]
    total = 0
    for i, p in enumerate(parts):
        font = F_ITALIC if (italic_part and i % 2 == 1) else F_DISPLAY_BOLD
        total += c.stringWidth(p, font, size)
    return total


def display_title(c, x, y, text, *, max_size=56, min_size=22,
                  max_width=None, color=INK, italic_part=False,
                  align="left"):
    """Auto-sized title that shrinks to fit within max_width.

    Supports {em}…{em} for italicised INK2 segments.
    Returns the y position to start the next element (already accounts for line height).
    """
    if max_width is None:
        max_width = RIGHT - x

    # Find largest size that fits
    size = max_size
    while size > min_size:
        if measure_title_width(c, text, size, italic_part) <= max_width:
            break
        size -= 1
    else:
        size = min_size

    # Compute draw position for alignment
    width = measure_title_width(c, text, size, italic_part)
    if align == "center":
        cursor = x + (max_width - width) / 2
    elif align == "right":
        cursor = x + max_width - width
    else:
        cursor = x

    parts = text.split("{em}") if italic_part else [text]
    for i, p in enumerate(parts):
        if italic_part and i % 2 == 1:
            c.setFont(F_ITALIC, size)
            c.setFillColor(INK2)
        else:
            c.setFont(F_DISPLAY_BOLD, size)
            c.setFillColor(color)
        c.drawString(cursor, y, p)
        font = F_ITALIC if (italic_part and i % 2 == 1) else F_DISPLAY_BOLD
        cursor += c.stringWidth(p, font, size)
    return y - size * 0.95


def wrap_text(c, text, x, y, w, font, size, leading, color=INK2):
    c.setFillColor(color)
    c.setFont(font, size)
    words = text.split()
    line = ""
    cy = y
    for word in words:
        candidate = (line + " " + word).strip()
        if c.stringWidth(candidate, font, size) <= w:
            line = candidate
        else:
            c.drawString(x, cy, line)
            cy -= leading
            line = word
    if line:
        c.drawString(x, cy, line)
        cy -= leading
    return cy


def fit_text_to_box(c, text, x, y_top, w, h, font, max_size, min_size, leading_factor=1.30, color=INK2):
    """Shrink font until wrapped text fits in (w, h). Renders top-aligned."""
    size = max_size
    while size >= min_size:
        leading = size * leading_factor
        # Count lines at this size
        words = text.split()
        line = ""
        lines = 0
        for word in words:
            cand = (line + " " + word).strip()
            if c.stringWidth(cand, font, size) <= w:
                line = cand
            else:
                lines += 1
                line = word
        if line:
            lines += 1
        if lines * leading <= h:
            break
        size -= 1
    leading = size * leading_factor
    return wrap_text(c, text, x, y_top - leading * 0.78, w, font, size, leading, color)


def hline(c, x1, y, x2, color=LINE, width=0.5):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def card_box(c, x, y, w, h, *, fill=BG2, stroke=LINE2, accent_top=False, accent=ACCENT):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.6)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=1)
    if accent_top:
        c.setFillColor(accent)
        c.rect(x, y + h - 0.05 * inch, w, 0.04 * inch, fill=1, stroke=0)


def labeled_card(c, x, y, w, h, kw, head, body, *, accent_top=True):
    card_box(c, x, y, w, h, accent_top=accent_top)
    pad = 0.18 * inch
    c.setFillColor(ACCENT)
    c.setFont(F_MONO_BOLD, 9)
    c.drawString(x + pad, y + h - 0.42 * inch, kw)

    # auto-fit headline to card width
    head_size = 16
    while head_size > 10 and c.stringWidth(head, F_DISPLAY_BOLD, head_size) > w - pad * 2:
        head_size -= 1
    c.setFillColor(INK)
    c.setFont(F_DISPLAY_BOLD, head_size)
    head_y = y + h - 0.42 * inch - 18
    c.drawString(x + pad, head_y, head)

    body_y_top = head_y - 6
    fit_text_to_box(
        c, body, x + pad, body_y_top, w - pad * 2,
        body_y_top - (y + pad), F_BODY, 10.5, 8.5, 1.28, INK2,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Mocks of the three surfaces
# ──────────────────────────────────────────────────────────────────────────────
def draw_ipad_mock(c, cx, cy, w=2.6 * inch, accent_color=None):
    ac = accent_color or ACCENT
    h = w * 3 / 4
    x, y = cx - w / 2, cy - h / 2

    c.setFillColor(HexColor("#1a1816"))
    c.setStrokeColor(LINE2)
    c.setLineWidth(0.6)
    c.roundRect(x - 8, y - 8, w + 16, h + 16, 10, fill=1, stroke=1)
    c.setFillColor(HexColor("#0e0d0c"))
    c.roundRect(x, y, w, h, 4, fill=1, stroke=0)

    c.setFillColor(INK3)
    c.setFont(F_MONO, 6)
    c.drawString(x + 8, y + h - 12, "SCORE")
    c.drawRightString(x + w - 8, y + h - 12, "COMBO")
    c.setFillColor(INK)
    c.setFont(F_DISPLAY_BOLD, 16)
    c.drawString(x + 8, y + h - 30, "1,240")
    c.setFillColor(ac)
    c.drawRightString(x + w - 8, y + h - 30, "x3")

    for i, (px, py, s) in enumerate([
        (0.30, 0.45, 14), (0.62, 0.55, 10), (0.46, 0.30, 8),
    ]):
        c.setFillColor(ac if i != 1 else COOL)
        c.circle(x + w * px, y + h * py, s, fill=1, stroke=0)
        c.setStrokeColor(ac if i != 1 else COOL)
        c.setLineWidth(0.5)
        c.circle(x + w * px, y + h * py, s + 6, fill=0, stroke=1)

    c.setFillColor(LINE2)
    c.rect(x + 8, y + 10, w - 16, 2, fill=1, stroke=0)
    c.setFillColor(ac)
    c.rect(x + 8, y + 10, (w - 16) * 0.62, 2, fill=1, stroke=0)
    c.setFillColor(INK3)
    c.setFont(F_MONO, 6)
    c.drawString(x + 8, y + 18, "TIME 18.4s")


def draw_truck_side_mock(c, cx, cy, w=4.0 * inch, accent_color=None):
    ac = accent_color or ACCENT
    h = w * 432 / 1007
    x, y = cx - w / 2, cy - h / 2

    c.setFillColor(HexColor("#1a1816"))
    c.setStrokeColor(LINE2)
    c.setLineWidth(0.6)
    c.roundRect(x - 6, y - 6, w + 12, h + 12, 4, fill=1, stroke=1)
    c.setFillColor(HexColor("#0a0908"))
    c.rect(x, y, w, h, fill=1, stroke=0)

    c.setFillColor(INK3)
    c.setFont(F_MONO, 6)
    c.drawString(x + 10, y + h - 14, "LIVE SCORE")
    c.setFillColor(INK)
    c.setFont(F_DISPLAY_BOLD, 28)
    c.drawString(x + 10, y + h - 44, "1,240")
    c.setFillColor(ac)
    c.setFont(F_DISPLAY_BOLD, 14)
    c.drawString(x + 10, y + 14, "POW!")

    c.setStrokeColor(LINE2)
    c.setLineWidth(0.4)
    c.line(x + w * 0.40, y + 10, x + w * 0.40, y + h - 10)
    c.setFillColor(INK3)
    c.setFont(F_MONO, 6)
    c.drawString(x + w * 0.43, y + h - 14, "COMBO")
    bar_x = x + w * 0.43
    bar_y = y + h / 2
    for i in range(6):
        c.setFillColor(ac if i < 3 else LINE2)
        c.rect(bar_x + i * 8, bar_y, 6, 14, fill=1, stroke=0)

    c.setStrokeColor(LINE2)
    c.setLineWidth(0.4)
    c.line(x + w * 0.70, y + 10, x + w * 0.70, y + h - 10)
    c.setFillColor(INK3)
    c.setFont(F_MONO, 6)
    c.drawString(x + w * 0.72, y + h - 14, "TOP 3")
    rows = [("01", "AVA", "2,140"), ("02", "MAX", "1,860"), ("03", "JEN", "1,240")]
    for i, (rk, nm, sc) in enumerate(rows):
        ry = y + h - 28 - i * 12
        c.setFillColor(ac if i == 0 else INK2)
        c.setFont(F_MONO_BOLD if i == 0 else F_MONO, 7)
        c.drawString(x + w * 0.72, ry, f"{rk} {nm}")
        c.setFillColor(INK)
        c.setFont(F_MONO, 7)
        c.drawRightString(x + w - 10, ry, sc)


def draw_truck_rear_mock(c, cx, cy, w=2.2 * inch, accent_color=None):
    import math
    ac = accent_color or ACCENT
    h = w
    x, y = cx - w / 2, cy - h / 2

    c.setFillColor(HexColor("#1a1816"))
    c.setStrokeColor(LINE2)
    c.setLineWidth(0.6)
    c.roundRect(x - 6, y - 6, w + 12, h + 12, 4, fill=1, stroke=1)
    c.setFillColor(HexColor("#0a0908"))
    c.rect(x, y, w, h, fill=1, stroke=0)

    cx2, cy2 = x + w / 2, y + h / 2 + 6
    c.setFillColor(ac)
    points = []
    for i in range(16):
        a = i * (360 / 16) * math.pi / 180
        r = (w * 0.42) if i % 2 == 0 else (w * 0.30)
        points.append((cx2 + math.cos(a) * r, cy2 + math.sin(a) * r))
    p = c.beginPath()
    p.moveTo(*points[0])
    for px, py in points[1:]:
        p.lineTo(px, py)
    p.close()
    c.drawPath(p, fill=1, stroke=0)

    qr_size = w * 0.40
    qx, qy = cx2 - qr_size / 2, cy2 - qr_size / 2
    c.setFillColor(BG)
    c.rect(qx - 4, qy - 4, qr_size + 8, qr_size + 8, fill=1, stroke=0)
    c.setFillColor(INK)
    cell = qr_size / 9
    pattern = [
        "111111010",
        "100001010",
        "101101011",
        "101101011",
        "100001010",
        "111111010",
        "000000010",
        "010101011",
        "010110100",
    ]
    for r, row in enumerate(pattern):
        for col, v in enumerate(row):
            if v == "1":
                c.rect(qx + col * cell, qy + (8 - r) * cell, cell, cell, fill=1, stroke=0)

    c.setFillColor(BG)
    c.rect(x, y, w, 16, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont(F_DISPLAY_BOLD, 8)
    c.drawCentredString(x + w / 2, y + 5, "SCAN TO WIN")


# ──────────────────────────────────────────────────────────────────────────────
# Slides
# ──────────────────────────────────────────────────────────────────────────────
def slide_cover(c):
    # Left column for hero text
    eyebrow(c, LEFT, 5.5 * inch, "Pitch · v1.0 · 2026")
    next_y = display_title(
        c, LEFT, 4.5 * inch,
        "Guerrilla OOH that {em}plays back{em}.",
        max_size=64, italic_part=True, max_width=7.4 * inch,
    )
    wrap_text(
        c,
        "A two-screen interactive platform for in-person brand activations. "
        "One player on an iPad. A crowd on a giant LED panel or projection. "
        "Live sync. Branded per campaign.",
        LEFT, next_y - 0.30 * inch, 7.2 * inch, F_BODY, 14, 21, INK2,
    )

    # Right column for the three-surface visual cluster
    cluster_cx = 10.55 * inch
    draw_truck_side_mock(c, cluster_cx, 5.05 * inch, w=3.6 * inch)
    draw_truck_rear_mock(c, cluster_cx + 1.05 * inch, 2.85 * inch, w=1.6 * inch)
    draw_ipad_mock(c, cluster_cx - 1.05 * inch, 2.85 * inch, w=2.05 * inch)

    # Caption strip beneath the cluster
    c.setFillColor(INK3)
    c.setFont(F_MONO, 8)
    c.drawCentredString(cluster_cx, 1.55 * inch,
                        "iPAD  ·  SIDE LED  ·  REAR PANEL / PROJECTION")

    # Tagline strip on the left, above the chrome footer
    hline(c, LEFT, 1.20 * inch, LEFT + 7.4 * inch, LINE)
    c.setFillColor(INK)
    c.setFont(F_BODY_BOLD, 13)
    c.drawString(LEFT, 0.95 * inch, "Two-screen brand activations · interactivemedia.ca")


def slide_problem(c):
    eyebrow(c, LEFT, 5.9 * inch, "Section 01 · The problem")
    title_max_w = 7.4 * inch
    next_y = display_title(
        c, LEFT, 5.2 * inch,
        "OOH is loud.",
        max_size=54, italic_part=False, max_width=title_max_w,
    )
    next_y = display_title(
        c, LEFT, next_y,
        "{em}Almost no one is listening.{em}",
        max_size=54, italic_part=True, max_width=title_max_w,
    )
    wrap_text(
        c,
        "Static boards get a half-second of attention. Digital boards get "
        "tuned out the same way social ads do. Brands keep paying for "
        "impressions that don't actually impress.",
        LEFT, next_y - 0.20 * inch, title_max_w, F_BODY, 13, 20, INK2,
    )

    stats = [
        ("0.4s",   "Average glance time at a billboard."),
        ("70%",    "Of consumers say outdoor ads don't feel personal."),
        ("9 / 10", "Walk-by activations fail to convert without an active hook."),
    ]
    sx = 8.6 * inch
    sw = 3.85 * inch
    sy = 5.7 * inch
    for label, body in stats:
        card_box(c, sx, sy - 1.20 * inch, sw, 1.05 * inch)
        c.setFillColor(ACCENT)
        c.setFont(F_DISPLAY_BOLD, 26)
        c.drawString(sx + 16, sy - 0.50 * inch, label)
        wrap_text(c, body, sx + 16, sy - 0.78 * inch, sw - 32,
                  F_BODY, 10, 13, INK2)
        sy -= 1.30 * inch

    c.setFillColor(INK)
    c.setFont(F_BODY_BOLD, 13)
    c.drawString(LEFT, 1.30 * inch,
                 "Attention now has to be earned in seconds — not bought in CPMs.")


def slide_idea(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 02 · The product")
    next_y = display_title(
        c, LEFT, 5.45 * inch,
        "It's an {em}interactive game{em}.",
        max_size=58, italic_part=True, max_width=CONTENT_W,
    )
    wrap_text(
        c,
        "A player picks up an iPad and plays. The crowd watches the action "
        "blow up on a giant LED panel or projection beside them. Every tap, "
        "hit, miss, and score syncs across both screens live. Spectators "
        "pull into a crowd. The crowd pulls in more players.",
        LEFT, next_y - 0.20 * inch, CONTENT_W, F_BODY, 13, 19, INK2,
    )

    cy = 2.40 * inch
    draw_ipad_mock(c,         3.0 * inch, cy, w=2.0 * inch)
    draw_truck_side_mock(c,   7.2 * inch, cy, w=3.0 * inch)
    draw_truck_rear_mock(c,  11.0 * inch, cy, w=1.6 * inch)

    labels = [
        (3.0 * inch, "01 · PLAYER",  "iPad in hand"),
        (7.2 * inch, "02 · HYPE",    "Side LED / projection"),
        (11.0 * inch, "03 · CAPTURE","Rear panel + QR"),
    ]
    for x, lbl, sub in labels:
        c.setFillColor(ACCENT)
        c.setFont(F_MONO_BOLD, 9)
        c.drawCentredString(x, 1.20 * inch, lbl)
        c.setFillColor(INK)
        c.setFont(F_BODY_BOLD, 11)
        c.drawCentredString(x, 1.02 * inch, sub)

    c.setStrokeColor(LINE2)
    c.setLineWidth(0.8)
    for ax in [4.4 * inch, 9.0 * inch]:
        c.line(ax, cy, ax + 0.55 * inch, cy)
        c.line(ax + 0.55 * inch, cy, ax + 0.45 * inch, cy + 0.08 * inch)
        c.line(ax + 0.55 * inch, cy, ax + 0.45 * inch, cy - 0.08 * inch)


def slide_why(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 03 · Why it works")
    display_title(
        c, LEFT, 5.4 * inch,
        "Stop them. Hold them. {em}Capture them.{em}",
        max_size=42, italic_part=True, max_width=CONTENT_W,
    )

    pillars = [
        ("STOP",
         "Pulls a crowd in seconds.",
         "A live game on a giant LED panel is loud, bright, and visibly alive. People stop to watch — then they stop to play."),
        ("HOLD",
         "30s rounds. 90s+ dwell.",
         "Players stay for the round. Spectators stay for the leaderboard, the next player, and the chance to take a shot themselves."),
        ("CAPTURE",
         "Turns attention into action.",
         "A QR on the rear panel or projection lets you collect emails, hand out samples, drop coupons, or launch a follow-up flow."),
    ]
    cw = (CONTENT_W - 0.30 * inch) / 3
    ch = 2.6 * inch
    cy = 4.20 * inch
    for i, (kw, headline, body) in enumerate(pillars):
        x = LEFT + i * (cw + 0.15 * inch)
        labeled_card(c, x, cy - ch, cw, ch, kw, headline, body)

    c.setFillColor(INK3)
    c.setFont(F_MONO, 9)
    c.drawString(LEFT, 1.30 * inch,
                 "FULL FUNNEL — \"PASSER-BY\" TO \"OPT-IN\" — ON ONE STREET CORNER.")


def slide_setup(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 04 · The setup")
    next_y = display_title(
        c, LEFT, 5.4 * inch,
        "Three surfaces. {em}One game.{em}",
        max_size=50, italic_part=True, max_width=CONTENT_W,
    )
    wrap_text(
        c,
        "Every event, hit, score, and miss is broadcast live across all three surfaces. "
        "The truck can be a real LED truck, a stage-side LED wall, a window display, or a "
        "wall projection. The square panel can be a kiosk, a poster, or a step-and-repeat "
        "with a QR. Same engine, different real-estate.",
        LEFT, next_y - 0.20 * inch, CONTENT_W, F_BODY, 12, 17, INK2,
    )

    cy = 2.70 * inch
    draw_truck_side_mock(c, 4.0 * inch, cy, w=4.4 * inch)
    draw_truck_rear_mock(c, 7.6 * inch, cy, w=1.8 * inch)
    draw_ipad_mock(c,      10.4 * inch, cy, w=2.4 * inch)

    captions = [
        (4.0 * inch,  "SIDE LED · 1007 × 432", "Hype reel — the screen that pulls the crowd in."),
        (7.6 * inch,  "REAR LED · 1:1",        "QR + burst on every hit."),
        (10.4 * inch, "iPad · 4:3 TOUCH",      "The player's surface."),
    ]
    for x, lbl, sub in captions:
        c.setFillColor(ACCENT)
        c.setFont(F_MONO_BOLD, 9)
        c.drawCentredString(x, 1.20 * inch, lbl)
        c.setFillColor(INK2)
        c.setFont(F_BODY, 10)
        c.drawCentredString(x, 1.02 * inch, sub)


def slide_ipad(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 05 · Surface 01 — the player")
    title_max_w = 5.8 * inch
    display_title(
        c, LEFT, 5.4 * inch,
        "The {em}iPad{em}.",
        max_size=56, italic_part=True, max_width=title_max_w,
    )

    # Mock sits below the title in the left column
    draw_ipad_mock(c, 3.8 * inch, 2.95 * inch, w=4.4 * inch)

    bullets = [
        ("TOUCH-FIRST",  "Drag, fling, tap, tilt, draw — built around what hands do best on a tablet."),
        ("BRANDED SKIN", "Same engine, fully reskinned per campaign — palette, fonts, hero art, sound, copy."),
        ("LIVE SCORE",   "Round timer, combo meter, reaction words — every hit feels rewarding."),
        ("END SCREEN",   "Name entry feeds the live leaderboard on the LED. Capture happens here too."),
        ("ON-SITE DIAL", "Hidden tweaks panel lets the operator tune difficulty in real time."),
        ("HARDWARE",     "Runs in any iPad browser — no app, no install. Bring your own iPad or rent on-site."),
    ]
    bx = 7.6 * inch
    bw = RIGHT - bx
    by = 5.30 * inch
    for kw, body in bullets:
        c.setFillColor(ACCENT)
        c.setFont(F_MONO_BOLD, 9)
        c.drawString(bx, by, kw)
        c.setFillColor(INK2)
        end_y = wrap_text(c, body, bx + 1.30 * inch, by, bw - 1.30 * inch,
                          F_BODY, 10.5, 13, INK2)
        by = end_y - 0.12 * inch


def slide_side_led(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 06 · Surface 02 — the hype")
    title_max_w = 6.4 * inch
    display_title(
        c, LEFT, 5.4 * inch,
        "The {em}LED panel{em} (or projection).",
        max_size=42, italic_part=True, max_width=title_max_w,
    )

    draw_truck_side_mock(c, 4.3 * inch, 2.95 * inch, w=6.4 * inch)

    bullets = [
        ("LIVE SCORE",       "Updates instantly on every hit — the screen is alive in a way static OOH never is."),
        ("REACTION WORDS",   "POW, KAPOW, NICE — timed bursts that make it feel like the crowd is cheering."),
        ("COMBO METER",      "Visual streak indicator that escalates with the player's run. Pulls eyes in."),
        ("LEADERBOARD RAIL", "Top scores from the day. People come back to take down the leader."),
    ]
    bx = 8.55 * inch
    bw = RIGHT - bx
    by = 5.30 * inch
    for kw, body in bullets:
        c.setFillColor(ACCENT)
        c.setFont(F_MONO_BOLD, 9)
        c.drawString(bx, by, kw)
        c.setFillColor(INK2)
        end_y = wrap_text(c, body, bx + 1.35 * inch, by, bw - 1.35 * inch,
                          F_BODY, 10.5, 13, INK2)
        by = end_y - 0.14 * inch

    c.setFillColor(INK3)
    c.setFont(F_MONO, 8)
    c.drawString(LEFT, 1.25 * inch,
                 "DEPLOYS AS · LED TRUCK SIDE · STAGE-SIDE WALL · WINDOW PROJECTION · ARENA SCREEN")


def slide_rear(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 07 · Surface 03 — the capture")
    title_max_w = 7.4 * inch
    display_title(
        c, LEFT, 5.4 * inch,
        "The {em}rear panel{em} closes the loop.",
        max_size=40, italic_part=True, max_width=title_max_w,
    )

    draw_truck_rear_mock(c, 3.6 * inch, 2.85 * inch, w=3.4 * inch)

    bullets = [
        ("SQUARE FORMAT",   "1:1 panel — fits the back of a truck, a stage scrim, a window, a freestanding kiosk."),
        ("QR DROP",         "Scan-to-anywhere. Email list, sample request, sweepstakes, coupon, IG follow, sign-up."),
        ("LIVE BURSTS",     "Comic-style POW bursts pulse on every hit — keeps moving even between players."),
        ("FOOT-TRAFFIC ROI","This is the panel that converts a spectator into a pixel you can re-market to."),
    ]
    bx = 7.6 * inch
    bw = RIGHT - bx
    by = 4.80 * inch
    for kw, body in bullets:
        c.setFillColor(ACCENT)
        c.setFont(F_MONO_BOLD, 9)
        c.drawString(bx, by, kw)
        c.setFillColor(INK2)
        end_y = wrap_text(c, body, bx + 1.50 * inch, by, bw - 1.50 * inch,
                          F_BODY, 10.5, 13, INK2)
        by = end_y - 0.14 * inch


def slide_game_ideas_action(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 08 · What the game can be")
    next_y = display_title(
        c, LEFT, 5.4 * inch,
        "The mechanic is {em}yours{em}.",
        max_size=46, italic_part=True, max_width=CONTENT_W,
    )
    wrap_text(
        c,
        "Same platform. Pick the action that fits the brand. Examples — not a fixed menu.",
        LEFT, next_y - 0.20 * inch, CONTENT_W, F_BODY, 12, 16, INK2,
    )

    ideas = [
        ("SLING THE THING",
         "Drag-and-fling slingshot",
         "Branded projectile: a cookie, a lipstick wand, a basketball, a beer can, a bottle, a snack pack. 30s sprint, combos, scoring."),
        ("TAP TO THE BEAT",
         "Reflex sprint",
         "Branded glowing dots appear, tap before they fade. Combo multipliers. Music-synced. Energy, music, fitness."),
        ("CATCH & DODGE",
         "Branded rain",
         "Catch the good (branded products), dodge the bad. Tilt or tap to move the bucket. Good-vs-evil narrative."),
        ("RACE / DRIVE",
         "Steer & dodge",
         "Tilt or drag a thumb to steer a branded vehicle through obstacles. Distance-based scoring."),
    ]
    cw = (CONTENT_W - 0.45 * inch) / 4
    ch = 2.45 * inch
    cy = 3.45 * inch
    for i, (kw, head, body) in enumerate(ideas):
        x = LEFT + i * (cw + 0.15 * inch)
        labeled_card(c, x, cy - ch, cw, ch, kw, head, body)

    c.setFillColor(INK3)
    c.setFont(F_MONO, 9)
    c.drawString(LEFT, 0.92 * inch, "MORE ON THE NEXT PAGE →")


def slide_game_ideas_brand(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 08 · What the game can be · cont.")
    display_title(
        c, LEFT, 5.4 * inch,
        "Or skip the action. {em}Quiz them. Vote them. Style them.{em}",
        max_size=30, italic_part=True, max_width=CONTENT_W,
    )

    ideas = [
        ("TRIVIA / QUIZ",
         "Multiple-choice rounds",
         "Brand knowledge, sports trivia, pop-culture rounds. Live leaderboard. Sports partners, retail, media brands."),
        ("VOTE / TASTE TEST",
         "Head-to-head picks",
         "Original vs. Crunchy. Red vs. Blue. Crowd-sourced votes drive a live tally on the LED."),
        ("SPIN TO WIN",
         "Wheel mechanic",
         "Classic prize-wheel reskinned: sample, coupon, free product, swag. QR confirms the win."),
        ("DRAW / SIGN / STYLE",
         "Creative mode",
         "Sign a board, customize a jersey, color a product, paint a virtual graffiti wall. Output saves and emails."),
        ("PHOTO BOOTH",
         "AR-style frame",
         "Camera mode with branded overlay — photo posts to the LED panel, then gets emailed via QR scan."),
        ("UNLOCK / COMBO",
         "Branded codes",
         "Collect items from multiple posters around the venue to unlock a final scene. Scavenger-hunt flavor."),
    ]
    cols = 3
    cw = (CONTENT_W - (cols - 1) * 0.15 * inch) / cols
    ch = 1.65 * inch
    grid_top = 4.45 * inch
    for i, (kw, head, body) in enumerate(ideas):
        col = i % cols
        row = i // cols
        x = LEFT + col * (cw + 0.15 * inch)
        y = grid_top - row * (ch + 0.15 * inch)
        labeled_card(c, x, y - ch, cw, ch, kw, head, body)


def slide_example_walkthrough(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 09 · Worked example")
    display_title(
        c, LEFT, 5.4 * inch,
        "Walking through {em}one round{em}.",
        max_size=46, italic_part=True, max_width=CONTENT_W,
    )

    # Mocks in a single row
    cy = 3.7 * inch
    draw_ipad_mock(c, 2.4 * inch, cy, w=2.6 * inch)
    draw_truck_side_mock(c, 6.7 * inch, cy + 0.10 * inch, w=4.4 * inch)
    draw_truck_rear_mock(c, 11.1 * inch, cy, w=2.0 * inch)

    steps = [
        ("01", "Player taps the iPad.",
         "Name entry, then the game starts. The LED swaps from attract to LIVE — the crowd notices."),
        ("02", "Each hit broadcasts.",
         "Drag, release. The iPad shows the throw; the LED shows the score and a POW! burst."),
        ("03", "Combos build hype.",
         "Streaks light the combo meter and trigger bigger bursts on the side LED. People stop walking."),
        ("04", "30s. Final score.",
         "Name lands on the leaderboard. LED tells the crowd if it's a new top score."),
        ("05", "Spectator scans the QR.",
         "Rear panel pulls them off the sidewalk and onto your sign-up / sample / coupon page."),
    ]
    sw = (CONTENT_W - 4 * 0.10 * inch) / 5
    sy = 1.85 * inch
    for i, (n, h, body) in enumerate(steps):
        x = LEFT + i * (sw + 0.10 * inch)
        c.setFillColor(ACCENT)
        c.setFont(F_MONO_BOLD, 9)
        c.drawString(x, sy + 0.62 * inch, n)
        c.setFillColor(INK)
        c.setFont(F_BODY_BOLD, 10)
        c.drawString(x, sy + 0.46 * inch, h)
        wrap_text(c, body, x, sy + 0.26 * inch, sw,
                  F_BODY, 9, 12, INK2)


def slide_examples_brands(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 10 · Reskin examples")
    display_title(
        c, LEFT, 5.4 * inch,
        "Same engine. {em}Different brand, every time.{em}",
        max_size=34, italic_part=True, max_width=CONTENT_W,
    )

    examples = [
        ("SNACK BRAND",     "Sling the cookie or chip",
         "Branded projectile and target. End screen offers a coupon or sample."),
        ("BEAUTY BRAND",    "Apply the mascara or lipstick",
         "Drag-and-paint mechanic. Final look exports to email."),
        ("BEER / BEVERAGE", "Toss the can into the cooler",
         "Slingshot reskinned as a branded can. Crowd cheers a perfect landing."),
        ("SPORTS TEAM",     "Free throws / penalty kicks",
         "Branded ball, team court, mascot reactions. Leaderboard sponsored by partner."),
        ("AUTO BRAND",      "Drive the new model",
         "Tilt-to-steer. The truck shows your run. Leaderboards the fastest lap."),
        ("STREAMER / MEDIA","Trivia from a show",
         "Multiple-choice rounds, instant scoring, sweepstakes drop on the rear QR."),
        ("FAST FOOD",       "Build-the-burger / fry-toss",
         "Drag ingredients into the bun in 30s. Closest order wins a free meal."),
        ("RETAILER",        "Catch falling items",
         "Catch & dodge reskin. Running tally on the LED. Coupon at the end."),
    ]
    cols = 4
    cw = (CONTENT_W - (cols - 1) * 0.15 * inch) / cols
    ch = 1.65 * inch
    grid_top = 4.20 * inch
    for i, (kw, head, body) in enumerate(examples):
        col = i % cols
        row = i // cols
        x = LEFT + col * (cw + 0.15 * inch)
        y = grid_top - row * (ch + 0.18 * inch)
        labeled_card(c, x, y - ch, cw, ch, kw, head, body)


def slide_contexts(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 11 · Where it goes")
    display_title(
        c, LEFT, 5.4 * inch,
        "Anywhere people {em}gather{em}.",
        max_size=52, italic_part=True, max_width=CONTENT_W,
    )

    contexts = [
        ("FESTIVALS",        "Concerts, food fests, fairs."),
        ("STADIUMS",         "Concourse activations, fan zones, pre-game."),
        ("RETAIL & MALLS",   "Floor displays, pop-ups, window installs."),
        ("STREET TAKEOVERS", "LED truck pulls up, draws a crowd, drives away."),
        ("CONFERENCES",      "The booth that beats every other booth."),
        ("CAMPUS",           "Quad takeovers, orientation, recruiting."),
        ("LAUNCH EVENTS",    "Brand launches, product unveils, premieres."),
        ("HOLIDAY MARKETS",  "Winter villages, summer markets, food halls."),
    ]
    cols = 4
    cw = (CONTENT_W - (cols - 1) * 0.15 * inch) / cols
    ch = 1.10 * inch
    grid_top = 4.10 * inch
    for i, (h, b) in enumerate(contexts):
        col = i % cols
        row = i // cols
        x = LEFT + col * (cw + 0.15 * inch)
        y = grid_top - row * (ch + 0.20 * inch)
        card_box(c, x, y - ch, cw, ch)
        # auto-fit heading
        head_size = 14
        pad = 0.18 * inch
        while head_size > 10 and c.stringWidth(h, F_DISPLAY_BOLD, head_size) > cw - pad * 2:
            head_size -= 1
        c.setFillColor(ACCENT)
        c.setFont(F_DISPLAY_BOLD, head_size)
        c.drawString(x + pad, y - 0.36 * inch, h)
        wrap_text(c, b, x + pad, y - 0.58 * inch, cw - pad * 2,
                  F_BODY, 10, 13, INK2)

    c.setFillColor(INK3)
    c.setFont(F_MONO, 8)
    c.drawString(LEFT, 1.20 * inch,
                 "ANY IN-PERSON FOOTPRINT WITH A SIGHT-LINE FOR A SCREEN OR PROJECTION.")


def slide_deliverables(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 12 · What you get")
    display_title(
        c, LEFT, 5.4 * inch,
        "{em}Turnkey{em}. Custom-branded.",
        max_size=46, italic_part=True, max_width=CONTENT_W,
    )

    rows = [
        ("01", "Custom build",
         "Fully reskinned iPad game + LED display. Your palette, fonts, logo, hero art, audio, copy. Brief-to-live in days."),
        ("02", "Hardware-ready",
         "Built for iPad in landscape, LED at any common dimension, projection-ready output. We hand you a URL."),
        ("03", "Operator panel",
         "On-site dial-in for difficulty, throw power, target speed, reaction copy. Tunes to the crowd."),
        ("04", "Capture flow",
         "QR drop wired into your CRM, sweepstakes platform, email tool, or sample-fulfillment vendor."),
        ("05", "Multi-stop reuse",
         "Built once, runs at every stop on a tour. Reset leaderboard between events. Same URL, same brand."),
        ("06", "Reporting",
         "Plays, completions, top score, dwell time, capture conversion. Lightweight dashboard."),
    ]
    cols = 2
    cw = (CONTENT_W - 0.30 * inch) / cols
    ch = 1.15 * inch
    grid_top = 4.40 * inch
    pad = 0.20 * inch
    for i, (n, h, b) in enumerate(rows):
        col = i % cols
        row = i // cols
        x = LEFT + col * (cw + 0.30 * inch)
        y = grid_top - row * (ch + 0.15 * inch)
        card_box(c, x, y - ch, cw, ch)
        c.setFillColor(ACCENT)
        c.setFont(F_MONO_BOLD, 10)
        c.drawString(x + pad, y - 0.34 * inch, n)
        c.setFillColor(INK)
        c.setFont(F_DISPLAY_BOLD, 14)
        c.drawString(x + pad + 0.35 * inch, y - 0.34 * inch, h)
        wrap_text(c, b, x + pad, y - 0.58 * inch, cw - pad * 2,
                  F_BODY, 10, 13, INK2)


def code_chip(c, x, y, code, label):
    w = 2.7 * inch
    h = 1.10 * inch
    c.setFillColor(BG2)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.2)
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)

    c.setFillColor(INK3)
    c.setFont(F_MONO, 8)
    c.drawString(x + 16, y + h - 20, "ENTER CODE")

    c.setFillColor(ACCENT)
    c.setFont(F_MONO_BOLD, 30)
    c.drawString(x + 16, y + 38, code.upper())

    c.setFillColor(INK2)
    c.setFont(F_BODY, 9.5)
    wrap_text(c, label, x + 16, y + 22, w - 32, F_BODY, 9.5, 12, INK2)


def slide_demos(c):
    eyebrow(c, LEFT, 6.05 * inch, "Section 13 · See it live")
    next_y = display_title(
        c, LEFT, 5.4 * inch,
        "Try it. {em}Right now.{em}",
        max_size=58, italic_part=True, max_width=CONTENT_W,
    )
    wrap_text(
        c,
        "Visit interactivemedia.ca on any phone, tablet, or laptop. "
        "Enter one of the codes below to open the live demo.",
        LEFT, next_y - 0.20 * inch, CONTENT_W, F_BODY, 13, 19, INK2,
    )

    chip_y = 2.20 * inch
    code_chip(c, LEFT,              chip_y, "DEMO",   "Side-by-side preview — iPad + truck, synced live.")
    code_chip(c, LEFT + 2.95 * inch, chip_y, "DEMO 2", "Tap-to-the-beat — single-surface reflex sprint.")
    code_chip(c, LEFT + 5.90 * inch, chip_y, "OREO",   "Branded sample build — Sling The Stuf.")

    # Custom-code reservation pill
    x = LEFT + 8.85 * inch
    w = RIGHT - x
    h = 1.10 * inch
    c.setFillColor(BG2)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.0)
    c.roundRect(x, chip_y, w, h, 8, fill=1, stroke=1)
    c.setFillColor(INK3)
    c.setFont(F_MONO, 8)
    c.drawString(x + 16, chip_y + h - 20, "FOR YOUR PITCH")
    c.setFillColor(INK)
    c.setFont(F_BODY_BOLD, 12)
    c.drawString(x + 16, chip_y + h - 38, "Custom code on request.")
    c.setFillColor(INK2)
    c.setFont(F_BODY, 9.5)
    wrap_text(c,
              "We'll issue a private branded build for any active opportunity.",
              x + 16, chip_y + h - 56, w - 32, F_BODY, 9.5, 12, INK2)

    c.setFillColor(INK3)
    c.setFont(F_MONO, 8)
    c.drawString(LEFT, 1.65 * inch,
                 "EACH DEMO RUNS IN ANY MODERN BROWSER — NO APP, NO DOWNLOAD, NO LOGIN.")


def slide_cta(c):
    eyebrow(c, LEFT, 5.9 * inch, "Next steps")
    title_max_w = 7.4 * inch
    next_y = display_title(
        c, LEFT, 5.2 * inch,
        "Pitch us a brand.",
        max_size=44, italic_part=False, max_width=title_max_w,
    )
    next_y = display_title(
        c, LEFT, next_y - 0.05 * inch,
        "{em}We'll send a custom demo back.{em}",
        max_size=44, italic_part=True, max_width=title_max_w,
    )
    wrap_text(
        c,
        "Bring us a brief — even a rough one — and we'll return a "
        "live, branded build inside a working week. Use it to close the "
        "client. Take it on the road from there.",
        LEFT, next_y - 0.30 * inch, title_max_w, F_BODY, 13, 20, INK2,
    )

    # Contact tile on the right
    cx = 8.55 * inch
    cw = RIGHT - cx
    cy_top = 5.7 * inch
    ch = 4.1 * inch
    c.setFillColor(BG2)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.0)
    c.roundRect(cx, cy_top - ch, cw, ch, 6, fill=1, stroke=1)

    c.setFillColor(INK3)
    c.setFont(F_MONO, 9)
    c.drawString(cx + 0.25 * inch, cy_top - 0.35 * inch, "CONTACT")
    c.setFillColor(INK)
    c.setFont(F_DISPLAY_BOLD, 22)
    c.drawString(cx + 0.25 * inch, cy_top - 0.70 * inch, "Interactive Media")
    c.setFillColor(INK2)
    c.setFont(F_BODY, 12)
    c.drawString(cx + 0.25 * inch, cy_top - 0.95 * inch, "interactivemedia.ca")

    fields = [
        ("REP · NAME", "[Your name]"),
        ("EMAIL",      "[your.email@interactivemedia.ca]"),
        ("PHONE",      "[+1 · your phone]"),
    ]
    fy = cy_top - 1.40 * inch
    for label, value in fields:
        c.setFillColor(INK3)
        c.setFont(F_MONO, 9)
        c.drawString(cx + 0.25 * inch, fy, label)
        c.setFillColor(INK)
        c.setFont(F_BODY_BOLD if "NAME" in label else F_BODY, 12)
        c.drawString(cx + 0.25 * inch, fy - 0.22 * inch, value)
        fy -= 0.65 * inch

    # QR placeholder square
    qrx = cx + cw - 1.10 * inch
    qry = cy_top - ch + 0.35 * inch
    c.setFillColor(ACCENT)
    c.rect(qrx, qry, 0.85 * inch, 0.85 * inch, fill=1, stroke=0)
    c.setFillColor(BG)
    c.setFont(F_MONO_BOLD, 7)
    c.drawCentredString(qrx + 0.425 * inch, qry + 0.50 * inch, "QR")
    c.drawCentredString(qrx + 0.425 * inch, qry + 0.38 * inch, "HERE")


# ──────────────────────────────────────────────────────────────────────────────
# Compose
# ──────────────────────────────────────────────────────────────────────────────
SLIDES = [
    ("Cover",                "",                          slide_cover),
    ("The problem",          "01 · PROBLEM",              slide_problem),
    ("The product",          "02 · PRODUCT",              slide_idea),
    ("Why it works",         "03 · WHY",                  slide_why),
    ("The setup",            "04 · SETUP",                slide_setup),
    ("The iPad",             "05 · SURFACE — PLAYER",     slide_ipad),
    ("The side LED",         "06 · SURFACE — HYPE",       slide_side_led),
    ("The rear panel",       "07 · SURFACE — CAPTURE",    slide_rear),
    ("Game ideas (action)",  "08 · IDEAS",                slide_game_ideas_action),
    ("Game ideas (brand)",   "08 · IDEAS CONT.",          slide_game_ideas_brand),
    ("Worked example",       "09 · EXAMPLE",              slide_example_walkthrough),
    ("Brand reskins",        "10 · RESKINS",              slide_examples_brands),
    ("Where it goes",        "11 · CONTEXTS",             slide_contexts),
    ("What you get",         "12 · DELIVERABLES",         slide_deliverables),
    ("Demo codes",           "13 · DEMOS",                slide_demos),
    ("CTA",                  "NEXT STEPS",                slide_cta),
]


def build_pdf(path: Path):
    c = canvas.Canvas(str(path), pagesize=PAGE)
    c.setTitle("Interactive Media — Sales Pitch")
    c.setAuthor("Interactive Media")
    c.setSubject("Two-screen brand activation platform")
    total = len(SLIDES)
    for i, (_title, section, fn) in enumerate(SLIDES, start=1):
        draw_chrome(c, i, total, section)
        fn(c)
        c.showPage()
    c.save()


if __name__ == "__main__":
    here = Path(__file__).parent
    out = here / "Interactive-Media-Pitch.pdf"
    build_pdf(out)
    print(f"Wrote {out}")
