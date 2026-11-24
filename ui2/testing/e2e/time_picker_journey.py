"""The public time picker /slots (24 Nov 2026): no login, nothing stored. Click, drag, whole day and whole time, half hours, the copied text, and a phone."""
import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def cell(page, day, label): return page.get_by_role("checkbox", name=f"{day} {label}")

def main():
    out = {}
    with Session(anon=True, width=1280, height=900) as s:
        s.on(r"^/api/", lambda m, p, b, st: (200, {}))
        s.goto("/slots"); s.page.get_by_role("heading", name="Choose your class times").wait_for(timeout=120000); s.page.wait_for_timeout(1500)
        s.page.add_style_tag(content="nextjs-portal { display: none !important; }")
        pg = s.page
        out["needs_login"] = "/login" in pg.url
        out["copy_disabled_at_start"] = pg.get_by_role("button", name="Copy message").is_disabled()
        out["rows_hourly"] = pg.locator(".u2-tp__time").count()
        # a click, then a mouse drag across Saturday 9 PM and 10 PM and Sunday 9 PM
        cell(pg, "Saturday", "9:00 PM").click()
        a = cell(pg, "Sunday", "9:00 PM").bounding_box(); b = cell(pg, "Sunday", "10:00 PM").bounding_box()
        pg.mouse.move(a["x"] + a["width"] / 2, a["y"] + a["height"] / 2); pg.mouse.down(); pg.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, steps=6); pg.mouse.up()
        out["click_on"] = cell(pg, "Saturday", "9:00 PM").get_attribute("aria-checked")
        out["drag_painted_two"] = [cell(pg, "Sunday", "9:00 PM").get_attribute("aria-checked"), cell(pg, "Sunday", "10:00 PM").get_attribute("aria-checked")]
        # a whole day, then a whole time row, then clear all
        pg.get_by_role("button", name=re.compile("^Monday, choose or clear the whole day")).click()
        out["monday_all_on"] = all(cell(pg, "Monday", t).get_attribute("aria-checked") == "true" for t in ("6:00 AM", "12:00 PM", "11:00 PM"))
        pg.get_by_role("button", name=re.compile("^Monday, choose or clear the whole day")).click()
        out["monday_cleared"] = cell(pg, "Monday", "12:00 PM").get_attribute("aria-checked") == "false"
        pg.get_by_role("button", name=re.compile("^8:00 PM, choose or clear this time")).click()
        out["row_8pm_all_days"] = all(cell(pg, d, "8:00 PM").get_attribute("aria-checked") == "true" for d in ("Monday", "Wednesday", "Sunday"))
        pg.get_by_role("button", name=re.compile("^8:00 PM, choose or clear this time")).click()
        # half hours: a half-hour cell turns the hourly cell into "mixed"
        pg.get_by_label("Show half hours").check(); out["rows_half"] = pg.locator(".u2-tp__time").count()
        cell(pg, "Saturday", "9:30 PM").click(); cell(pg, "Saturday", "10:00 PM").click()
        pg.get_by_label("Show half hours").uncheck()
        out["hourly_cell_mixed_or_on"] = [cell(pg, "Saturday", "9:00 PM").get_attribute("aria-checked"), cell(pg, "Saturday", "10:00 PM").get_attribute("aria-checked")]
        # fields and the message
        pg.get_by_label("Your name").fill("Thanishka Reddy"); pg.get_by_label("Subject or class").fill("AS Level Computer Science")
        pg.get_by_label("Time zone").select_option("Asia/Kolkata"); pg.get_by_label("I am a").select_option("Student")
        pg.get_by_label("Anything we should know?").fill("Not free in exam week")
        pg.get_by_role("button", name="Copy message").click(); pg.wait_for_timeout(400)
        text = pg.evaluate("navigator.clipboard.readText()"); out["copied"] = text
        out["button_says"] = pg.get_by_role("button", name=re.compile("Copied")).inner_text()
        out["network_calls_to_server_for_the_message"] = [c for c in s.calls if "slot" in c[1].lower() or "message" in c[1].lower()]
        out["storage_empty"] = pg.evaluate("localStorage.length === 0 && sessionStorage.length === 0")
        out["hscroll_1280"] = s.hscroll()
        pg.screenshot(path="snapshots/timepicker-desktop.png", full_page=True)
        out["errors"] = s.errors[:3]
    with Session(anon=True, width=360, height=800, touch=True) as s:
        s.on(r"^/api/", lambda m, p, b, st: (200, {}))
        s.goto("/slots"); s.page.get_by_role("heading", name="Choose your class times").wait_for(timeout=120000); s.page.wait_for_timeout(1500)
        s.page.add_style_tag(content="nextjs-portal { display: none !important; }")
        pg = s.page
        c = cell(pg, "Saturday", "9:00 PM"); c.scroll_into_view_if_needed(); c.tap()
        out["phone_tap_on"] = c.get_attribute("aria-checked"); c.tap(); out["phone_tap_off"] = c.get_attribute("aria-checked")
        out["hscroll_360"] = s.hscroll()
        box = pg.locator(".u2-tp__grid").bounding_box(); out["phone_grid_fits"] = box["x"] >= 0 and box["x"] + box["width"] <= 360
        out["phone_cell_size"] = [round(c.bounding_box()["width"]), round(c.bounding_box()["height"])]
        pg.screenshot(path="snapshots/timepicker-phone.png", full_page=False)
        out["errors_phone"] = s.errors[:3]
    print(json.dumps(out, indent=1, ensure_ascii=False))
    assert not out["needs_login"] and out["copy_disabled_at_start"] and out["rows_hourly"] == 18 and out["rows_half"] == 36, out
    assert out["click_on"] == "true" and out["drag_painted_two"] == ["true", "true"], out
    assert out["monday_all_on"] and out["monday_cleared"] and out["row_8pm_all_days"], out
    want = ["Hello DivergenCIE team! 😊", "", "DivergenCIE Preferred Class Times", "", "Name: Thanishka Reddy", "I am a: Student", "Subject: AS Level Computer Science", "Time zone: India, UTC+05:30", "", "Saturday: 9:00 PM to 10:30 PM, 10:00 PM to 10:30 PM"]
    assert "Sunday: 9:00 PM to 11:00 PM" in out["copied"] and out["copied"].startswith("\n".join(want[:8])), out["copied"]
    assert "(" not in out["copied"] and ")" not in out["copied"], out["copied"]
    assert "Notes: Not free in exam week" in out["copied"] and out["copied"].rstrip().endswith("We care! ✨"), out["copied"]
    assert out["storage_empty"] and not out["network_calls_to_server_for_the_message"], out
    assert out["phone_tap_on"] == "true" and out["phone_tap_off"] == "false" and out["phone_grid_fits"] and not out["hscroll_360"], out
    assert not out["errors"] and not out["errors_phone"], out
    print("JOURNEY OK")
if __name__ == "__main__": main()
