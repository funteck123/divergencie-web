#!/usr/bin/env python3
"""Mode 1: lightweight, no-OCR, no-LLM detection of the correct answer on
an infographic-style MS page -- finds green-checkmark vs red-X colored
icon blobs by pixel color, ranks them top-to-bottom, and maps rank
position to option letter (A=1st from top, B=2nd, etc.) on the
assumption that a page's icons appear in the same vertical order as its
lettered options (true in the one page manually verified so far)."""
import sys
import fitz
import cv2
import numpy as np

def render_page(pdf_path, page_num, zoom=3):
    doc = fitz.open(pdf_path)
    page = doc[page_num]
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
    else:
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    doc.close()
    return img

def find_colored_blobs(img, color):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    if color == "green":
        lower, upper = np.array([40, 80, 60]), np.array([85, 255, 255])
    elif color == "red":
        # red wraps hue 0 -- two ranges
        m1 = cv2.inRange(hsv, np.array([0, 100, 60]), np.array([10, 255, 255]))
        m2 = cv2.inRange(hsv, np.array([170, 100, 60]), np.array([180, 255, 255]))
        mask = cv2.bitwise_or(m1, m2)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        return [c for c in contours if cv2.contourArea(c) > 30]
    else:
        raise ValueError(color)
    mask = cv2.inRange(hsv, lower, upper)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return [c for c in contours if cv2.contourArea(c) > 30]

def detect_answer(pdf_path, page_num):
    img = render_page(pdf_path, page_num)
    greens = find_colored_blobs(img, "green")
    reds = find_colored_blobs(img, "red")

    def centroid(c):
        M = cv2.moments(c)
        if M["m00"] == 0:
            return None
        return (M["m10"] / M["m00"], M["m01"] / M["m00"])

    green_pts = [p for p in (centroid(c) for c in greens) if p]
    red_pts = [p for p in (centroid(c) for c in reds) if p]

    # Cluster nearby blobs (a checkmark/X icon is often multiple small
    # disconnected contours) by true 2D distance -- a Y-only cluster
    # wrongly merges two different marks that happen to sit on the same
    # row in a grid layout (e.g. bottom-left vs bottom-right of a 2x2
    # grid) into one, confirmed as a real bug on a real file.
    def cluster(pts, radius=40):
        clusters = []
        for p in pts:
            placed = False
            for cl in clusters:
                cx = sum(x for x, y in cl) / len(cl)
                cy = sum(y for x, y in cl) / len(cl)
                if ((cx - p[0]) ** 2 + (cy - p[1]) ** 2) ** 0.5 < radius:
                    cl.append(p)
                    placed = True
                    break
            if not placed:
                clusters.append([p])
        return [(sum(x for x, y in cl) / len(cl), sum(y for x, y in cl) / len(cl)) for cl in clusters]

    green_clusters = cluster(green_pts)
    red_clusters = cluster(red_pts)

    # Reading order, not just top-to-bottom: group marks into rows to
    # handle both a single vertical list AND a grid layout (e.g. 2x2).
    # Measured the real numbers on real files rather than guessing a
    # threshold twice: a 2x2 grid's same-row pairs sit ~1.5-7.6px apart
    # in Y (icons drawn at virtually the same height); two different
    # rows in a real vertical list sit ~54-65px apart, even when each
    # row's icon X position varies a lot because option text length
    # differs (ruled out an X-vs-Y relative rule for exactly this
    # reason -- it merged rows on a file whose option text lengths
    # varied per row). There's a wide, clean gap between those two
    # ranges, so a 20px absolute tolerance -- not the original 60,
    # which sat inside the "different row" range and caused a real
    # wrong answer on a real file -- separates them safely.
    all_marks = [(x, y, "green") for x, y in green_clusters] + [(x, y, "red") for x, y in red_clusters]
    all_marks.sort(key=lambda m: m[1])
    rows, row_tolerance = [], 20
    for m in all_marks:
        placed = False
        for row in rows:
            ry = sum(p[1] for p in row) / len(row)
            if abs(ry - m[1]) < row_tolerance:
                row.append(m)
                placed = True
                break
        if not placed:
            rows.append([m])
    reading_order = []
    for row in rows:
        reading_order.extend(sorted(row, key=lambda m: m[0]))

    total = len(green_clusters) + len(red_clusters)
    return {
        "greenCount": len(green_clusters),
        "redCount": len(red_clusters),
        "markOrder": [m[2] for m in reading_order],
        "greenClusters": green_clusters,
        "redClusters": red_clusters,
        # Real failure found on a real file: a page with unrelated red
        # diagram elements produced 6 red blobs (should have been 3),
        # confidently inferring a nonsensical "E" answer for a 4-option
        # question. No real MCQ page here has more than ~5 options, so a
        # mark count outside 2-5 means something other than the answer
        # icons got picked up -- ambiguous, not a guess.
        "plausible": 2 <= total <= 5,
    }

if __name__ == "__main__":
    pdf_path, page_num = sys.argv[1], int(sys.argv[2])
    result = detect_answer(pdf_path, page_num)
    print(result["greenCount"], "green,", result["redCount"], "red")
    print("mark order (top to bottom):", result["markOrder"])
    if result["greenCount"] == 1:
        idx = result["markOrder"].index("green")
        letter = chr(65 + idx)
        print(f"INFERRED ANSWER: {letter} (rank {idx} from top)")
    else:
        print("AMBIGUOUS: not exactly one green mark")
