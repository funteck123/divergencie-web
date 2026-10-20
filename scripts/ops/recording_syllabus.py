#!/usr/bin/env python3
"""Syllabus chapter lookup for the recordings dataset (TKT-0358). Used by build_video_dataset.py and dataset_to_sheet.py.

Source: data/syllabus-digitizer/database.json (the Syllabus Viewer's data). A chapter is a top-level syllabus topic ("5 Chemical energetics"). For AS/A Level syllabuses the
component is "AS Level" until the syllabus says "A Level subject content", then "A Level (A2)"; for IGCSE it is "IGCSE".

This module only LOOKS UP chapters by subject code and chapter number. Which chapter a recording belongs to is decided by a person and kept in
docs/recording-chapter-assignments.json: nothing here guesses a chapter from words.
"""
import json, re
_cache = {}


def load():
    if "chapters" in _cache:
        return _cache
    db = json.load(open("data/syllabus-digitizer/database.json"))["subjects"]
    chapters = []  # {subject, level, code, component, chapter, title, text}
    for sub in db.values():
        if sub["code"] == "0500":
            for number, skill in (("R", "Reading"), ("W", "Writing"), ("SL", "Speaking and Listening")):
                chapters.append({"subject": sub["subject"], "level": sub["level"], "code": "0500", "component": "IGCSE", "chapter": number, "title": skill, "extra": []})
            continue
        if sub["code"] == "0510":  # English as a Second Language: the syllabus has no numbered topics, its content is the four skills
            for i, (skill, extra) in enumerate((("Reading", "read text comprehension passage understand factual information"), ("Writing", "write essay article email letter report review descriptive narrative composition"),
                                                ("Listening", "listen listening audio recording understand spoken"), ("Speaking", "speak speaking oral discussion conversation presentation"))):
                chapters.append({"subject": sub["subject"], "level": sub["level"], "code": "0510", "component": "IGCSE", "chapter": "RWLS"[i], "title": skill, "extra": [extra]})
            continue
        comp = "IGCSE" if sub["level"] == "IGCSE" else "AS Level"
        cur = None
        for t in sub["topics"]:
            title = (t.get("title") or "").strip()
            if re.match(r"^A Level subject content", title, re.I):
                comp = "A Level (A2)"; continue
            if re.match(r"^AS Level subject content", title, re.I):
                comp = "AS Level"; continue
            if t["depth"] == 0 and t.get("code") and t["code"] != "None" and not title.lower().startswith("subject content"):
                if cur and cur["chapter"] == t["code"]:
                    cur["extra"].append(title + " " + (t.get("content") or "")[:300]); continue
                cur = {"subject": sub["subject"], "level": sub["level"], "code": sub["code"], "component": comp, "chapter": t["code"], "title": title,
                       "extra": [(t.get("content") or "")[:600]]}
                chapters.append(cur)
            elif cur and t["depth"] == 1 and title:
                cur["extra"].append(title + " " + (t.get("content") or "")[:250])
    _cache["chapters"] = chapters
    return _cache


SPECIAL = {"X": "Exam practice (mixed chapters)", "O": "Outside the syllabuses on file (for example Additional or International Mathematics)", "?": None}


def chapter(code, number):
    """The syllabus chapter {subject, level, code, component, chapter, title} for a subject code and chapter number, or None."""
    for c in load()["chapters"]:
        if c["code"] == code and c["chapter"] == number:
            return c
    return None


def subject_info(code):
    """(subject, level) for a subject code, or None when the syllabus database does not have it."""
    for c in load()["chapters"]:
        if c["code"] == code:
            return c["subject"], c["level"]
    return None
