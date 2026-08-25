#!/usr/bin/env python3
"""Modes 2 & 3: composite N page-render PNGs (2 or 4) into one stacked
image with clear separators and page-index labels, send to Gemini, ask
it to read the checkmark/circled/marked correct answer for each labeled
page. Real experiment, per explicit user direction to reopen LLM use for
JUST this sub-problem (unresolved MS pages this no-OCR text parser can't
read) and compare against the lightweight (no-LLM) icon-detector and
against each other (2-page batch vs 4-page batch) for agreement.

Uses Gemini directly (OpenRouter's free daily quota was exhausted --
same real limit hit earlier in this session). Note on the API key format:
this account's key starts "AQ." rather than the usual "AIzaSy..." and
only authenticates against the v1 endpoint with ?key=, not v1beta or a
Bearer/x-goog-api-key header -- confirmed empirically, not assumed."""
import sys
import os
import json
import base64
import requests
from PIL import Image, ImageDraw

def load_env(path):
    env = {}
    for line in open(path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k] = v
    return env

ENV = load_env("/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/.env")
API_KEY = ENV["GEMINI_API_KEY"]
MODEL = "gemini-3.5-flash-lite"  # 3.5/3.6/3.7-flash exhausted; 2.5-flash is retired for new users (confirmed via a live 404)

def composite(page_paths, labels):
    imgs = [Image.open(p).convert("RGB") for p in page_paths]
    bar_h = 50
    total_h = sum(im.height for im in imgs) + bar_h * len(imgs)
    max_w = max(im.width for im in imgs)
    canvas = Image.new("RGB", (max_w, total_h), "white")
    draw = ImageDraw.Draw(canvas)
    y = 0
    for im, label in zip(imgs, labels):
        draw.rectangle([0, y, max_w, y + bar_h], fill=(20, 60, 94))
        draw.text((20, y + 12), label, fill="white")
        y += bar_h
        canvas.paste(im, (0, y))
        y += im.height
    return canvas

def call_gemini(image, labels):
    buf_path = "/tmp/composite_tmp.png"
    image.save(buf_path)
    b64 = base64.b64encode(open(buf_path, "rb").read()).decode()

    prompt = (
        "This image contains " + str(len(labels)) + " labeled sections, each a page from a "
        "multiple-choice exam mark scheme. Each section shows one question's explanation, "
        "with the correct answer marked somehow (a green checkmark, a circled option, a "
        "highlighted box, etc.) and wrong answers marked differently (red X, etc.). "
        "For each labeled section (" + ", ".join(labels) + "), identify which option letter "
        "(A/B/C/D, or however many options are shown) is marked as correct. "
        "Respond ONLY with JSON: {\"<label>\": \"<letter>\", ...} -- if a section's correct "
        "answer truly cannot be determined, use null for that label. No other text."
    )

    resp = requests.post(
        f"https://generativelanguage.googleapis.com/v1/models/{MODEL}:generateContent?key={API_KEY}",
        json={
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/png", "data": b64}},
                ],
            }],
            "generationConfig": {"maxOutputTokens": 2000},
        },
        timeout=180,
    )
    data = resp.json()
    if "error" in data:
        return {"error": data["error"]}
    try:
        raw = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        return {"error": f"unexpected response shape: {json.dumps(data)[:400]}"}
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(raw[start:end + 1])
            except json.JSONDecodeError:
                pass
        return {"error": f"unparseable response: {raw[:400]}"}

if __name__ == "__main__":
    page_paths = sys.argv[1:]
    labels = [f"PAGE_{i+1}" for i in range(len(page_paths))]
    img = composite(page_paths, labels)
    result = call_gemini(img, labels)
    print(json.dumps(result, indent=2))
