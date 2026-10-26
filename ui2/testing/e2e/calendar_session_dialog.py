"""TKT-0383: a session opened from a calendar day cell shows its detail in a dialog, never inside the cell (the cell is a small box that clips what is taller or wider).
Student portal, Calendar view, at 1280 and 390 px: click a session chip -> a dialog opens, it is inside the window, its status control is visible inside the dialog,
nothing is cut off sideways, no panel is left in the cell, and Close puts the calendar back."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import portals_journey as P

bad = []


def check(width):
    user = {"UserID": "STU-1", "UserType": "Student", "Name": "Test Student", "UiPreference": "next"}
    with Session(user=user, state={}, width=width, height=900) as s:
        s.on(r"^/api/", P.handler_for(user, "student")); s.goto("/v2/student"); s.page.wait_for_timeout(1200)
        s.page.get_by_role("button", name="Calendar").last.click(); s.page.wait_for_timeout(600)
        chip = s.page.locator(".u2-cal__cell .u2-chip:not([disabled])").first
        chip.scroll_into_view_if_needed(); chip.click(); s.page.wait_for_timeout(700)
        dlg = s.page.locator("[role=dialog]")
        if dlg.count() != 1: bad.append((width, "no dialog opened for the session")); return
        box = dlg.bounding_box(); vw = s.page.viewport_size["width"]; vh = s.page.viewport_size["height"]
        if box["x"] < -1 or box["x"] + box["width"] > vw + 1 or box["y"] < -1 or box["y"] + box["height"] > vh + 1: bad.append((width, f"dialog outside the window: {box}"))
        if s.page.evaluate("() => { const d = document.querySelector('[role=dialog]'); return d.scrollWidth > d.clientWidth + 1; }"): bad.append((width, "dialog content is cut off sideways"))
        s.page.screenshot(path=f"snapshots/calendar-session-dialog-{width}.png")
        ctl = dlg.locator("select, [role=combobox], button:has-text('Present'), button:has-text('Log'), input").first
        if ctl.count() == 0: bad.append((width, "no status control inside the dialog"))
        else:
            cb = ctl.bounding_box()
            if cb is None or cb["x"] < box["x"] - 1 or cb["x"] + cb["width"] > box["x"] + box["width"] + 1: bad.append((width, "status control not inside the dialog"))
        found = ctl.count() > 0
        if s.page.locator(".u2-cal__cell .u2-chip__panel").count(): bad.append((width, "a panel is still rendered inside the cell"))
        dlg.get_by_role("button", name="Close").first.click(); s.page.wait_for_timeout(400)
        if s.page.locator("[role=dialog]").count(): bad.append((width, "Close did not close the dialog"))
        print(f"{width}px: dialog {int(box['width'])}x{int(box['height'])}, status control {'found' if found else 'MISSING'}")


for w in (1280, 390): check(w)
print("problems:", len(bad))
for b in bad: print(" ", b)
sys.exit(1 if bad else 0)
