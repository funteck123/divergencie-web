"""TKT screenshot, picture, My tickets and replies. All data is fake (harness): the page's /api calls are answered here."""
import base64, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A

# a real 40x30 PNG made on the spot: small enough for a test, valid enough for the browser to decode
import io
from PIL import Image
_buf = io.BytesIO(); Image.new("RGB", (40, 30), (30, 90, 200)).save(_buf, "PNG"); PNG = _buf.getvalue()
PNG_URL = "data:image/png;base64," + base64.b64encode(PNG).decode()


def handler(method, path, body, st):
    if not path.startswith("/api/tickets"): return None
    if method == "GET" and "image=" in path: return 200, {"url": PNG_URL}
    if method == "GET" and "mine=1" in path: return 200, {"tickets": st["mine"]}
    if method == "GET": return 200, {"tickets": st["all"]}
    if method == "POST" and body.get("ticketId"):
        for pool, who in ((st["mine"], "You"),):
            t = next((x for x in pool if x["TicketID"] == body["ticketId"]), None)
            if t: t["Replies"].append({"At": "2026-10-24T12:00:00Z", "From": who, "Text": body["reply"]}); return 200, {"ticket": t}
        t = next(x for x in st["all"] if x["TicketID"] == body["ticketId"])
        t.setdefault("Replies", []).append({"At": "2026-10-24T12:05:00Z", "By": "MGT-0001", "ByType": "Management", "Text": body["reply"]})
        return 200, {"ticket": t}
    if method == "POST":
        t = {"TicketID": "TKT-9002", "Message": body["message"], "AttachmentURL": "", "HasImage": bool(body.get("image")), "CreatedAt": "2026-10-24T11:00:00Z", "ClosedAt": "", "CloseMessage": "", "OnHold": False, "Replies": []}
        st["mine"].insert(0, t)
        return 200, {"ticket": t, "imageSaved": True}
    return 200, {"ticket": {}}


def main():
    out = {}
    mine = [
        {"TicketID": "TKT-9001", "Message": "The solver is slow\nafter the last question", "AttachmentURL": "", "HasImage": True, "CreatedAt": "2026-10-23T08:00:00Z", "ClosedAt": "", "CloseMessage": "", "OnHold": False,
         "Replies": [{"At": "2026-10-23T09:00:00Z", "From": "Support", "Text": "We are looking at it."}]},
        {"TicketID": "TKT-9000", "Message": "Cannot log in", "AttachmentURL": "", "HasImage": False, "CreatedAt": "2026-10-20T08:00:00Z", "ClosedAt": "2026-10-21T08:00:00Z", "CloseMessage": "Fixed in the new version.", "OnHold": False, "Replies": []},
    ]
    all_t = [{"TicketID": "TKT-1", "SenderUserID": "STU-1001", "Message": "Page is blank", "CreatedAt": "2026-10-22T08:00:00Z", "HasImage": True,
              "Meta": {"client": {"page": "/v2/question-solver?paper=3", "viewport": "390x844", "dpr": 3, "theme": "light", "ui": "new", "lang": "en-GB", "tz": "Asia/Kuala_Lumpur"}, "server": {"userAgent": "Mozilla/5.0 TestBrowser", "build": "abc1234"}},
              "Replies": [{"At": "2026-10-22T09:00:00Z", "By": "MGT-0001", "ByType": "Management", "Text": "Which paper?"}, {"At": "2026-10-22T10:00:00Z", "By": "STU-1001", "ByType": "Sender", "Text": "Paper 3"}],
              "Notes": [{"By": "MGT-0001", "At": "2026-10-22T09:30:00Z", "Text": "internal thought"}]}]
    with Session(state={"users": A.mk_users(), "mine": mine, "all": all_t}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/tickets", handler)
        s.goto("/v2/management/tickets")
        s.page.get_by_role("table").wait_for(timeout=60000) if s.size["width"] >= 768 else s.page.wait_for_timeout(1500)

        # 1. the stealth screenshot button: one tap, the dialog opens ready for the description, with the picture of the screen already attached
        fab = s.page.get_by_role("button", name="Take a screenshot and report an issue")
        out["fab_visible"] = fab.is_visible()
        fab.click()
        dialog = s.page.get_by_role("dialog", name="Report an Issue")
        dialog.wait_for(timeout=90000)
        shot = dialog.get_by_role("img", name="Screenshot of the screen you were on")
        shot.wait_for(timeout=10000)
        src = shot.get_attribute("src") or ""
        out["shot_is_jpeg"] = src.startswith("data:image/jpeg;base64,") and len(src) > 2000
        out["description_focused"] = s.page.evaluate("document.activeElement && document.activeElement.tagName") == "TEXTAREA"
        # the screenshot must not contain the dialog or the button itself: they did not exist / were skipped at capture time
        dialog.get_by_label("What went wrong?").fill("The page looks wrong here")
        dialog.get_by_role("button", name="Send").click()
        s.page.get_by_text(re.compile("Sent\\. Thanks")).wait_for()
        create = [b for m, p, b in s.calls if m == "POST" and p == "/api/tickets" and b.get("message")]
        body = create[-1]
        out["post_has_image"] = str(body.get("image", "")).startswith("data:image/jpeg;base64,")
        meta = body.get("meta") or {}
        out["meta_keys"] = sorted(k for k in ("page", "viewport", "screen", "dpr", "lang", "tz", "theme", "ui", "capturedAt") if k in meta)
        out["meta_page_ok"] = meta.get("page", "").startswith("/v2/") and re.match(r"^\d+x\d+$", meta.get("viewport", "")) is not None and meta.get("ui") == "new"
        dialog.get_by_role("button", name="Close").click()

        # 2. a picture from a file, then removed, then pasted
        s.page.get_by_role("button", name=re.compile("Report (an )?[Ii]ssue")).first.click()
        dialog = s.page.get_by_role("dialog", name="Report an Issue"); dialog.wait_for()
        out["no_picture_at_start"] = dialog.get_by_role("img").count() == 0
        dialog.locator("input[type=file]").set_input_files({"name": "pic.png", "mimeType": "image/png", "buffer": PNG})
        pic = dialog.get_by_role("img", name="Picture to send with the ticket"); pic.wait_for(timeout=15000)
        out["file_picture_shown"] = (pic.get_attribute("src") or "").startswith("data:image/jpeg")
        dialog.get_by_role("button", name="Remove picture").click()
        out["removed"] = dialog.get_by_role("img").count() == 0
        dialog.get_by_label("What went wrong?").evaluate("""(el, b64) => {
            const bin = atob(b64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const dt = new DataTransfer(); dt.items.add(new File([bytes], 'p.png', { type: 'image/png' }));
            el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        }""", base64.b64encode(PNG).decode())
        dialog.get_by_role("img", name="Picture to send with the ticket").wait_for(timeout=15000)
        out["pasted_picture_shown"] = True
        dialog.get_by_label("What went wrong?").fill("Second report with a pasted picture")
        dialog.get_by_role("button", name="Send").click(); s.page.get_by_text(re.compile("Sent\\. Thanks")).wait_for()
        dialog.get_by_role("button", name="Close").click()

        # 3. My tickets: the list, a thread with support's reply, a closed ticket with its resolution and no reply box, and a reply from the sender
        s.page.get_by_role("button", name="My tickets").first.click() if s.size["width"] >= 640 else (s.page.get_by_role("button", name="Menu").click(), s.page.get_by_role("menuitem", name="My tickets").click())
        sheet = s.page.get_by_role("dialog").last; sheet.wait_for()  # its title changes to the ticket number once one is open
        sheet.get_by_text("TKT-9001").wait_for()
        out["list_count"] = sheet.locator("li").count()
        out["list_has_closed"] = sheet.get_by_text("Closed").count() >= 1
        sheet.get_by_text("TKT-9001").click()
        out["thread_support_reply"] = sheet.get_by_text("We are looking at it.").is_visible()
        try:
            sheet.get_by_label("Add a reply").wait_for(timeout=10000)
        except Exception:
            print("THREAD NOT SHOWN, sheet text:", sheet.inner_text()[:600].replace("\n", " | ")); raise
        sheet.get_by_label("Add a reply").fill("It happens on Paper 3")
        sheet.get_by_role("button", name="Send reply").click()
        sheet.get_by_text("It happens on Paper 3").wait_for()
        out["reply_in_thread"] = True
        sheet.get_by_role("button", name="Show my picture").click()
        sheet.get_by_role("img", name="Picture attached to TKT-9001").wait_for(timeout=10000)
        out["picture_in_thread"] = True
        sheet.get_by_role("button", name="All my tickets").click()
        sheet.get_by_text("TKT-9000").click()
        out["closed_has_resolution"] = sheet.get_by_text("Fixed in the new version.").is_visible()
        out["closed_has_no_reply_box"] = sheet.get_by_label("Add a reply").count() == 0
        out["internal_never_here"] = "internal" not in sheet.inner_text().lower()
        s.page.keyboard.press("Escape")

        # 4. Management: the conversation, the screenshot, the screen details, the internal note kept apart, and a reply
        s.page.get_by_role("button", name="Open").first.click()
        panel = s.page.get_by_role("dialog").last
        panel.get_by_text("Conversation (the sender sees this)").wait_for()
        out["admin_conversation"] = panel.get_by_text("Which paper?").is_visible() and panel.get_by_text("Paper 3").is_visible()
        out["admin_notes_labelled"] = panel.get_by_text("Internal notes (hidden from the sender)").is_visible()
        panel.get_by_role("button", name="Show screenshot").click()
        panel.get_by_role("img", name="Picture attached to TKT-1").wait_for(timeout=10000)
        out["admin_screenshot"] = True
        panel.get_by_text("Screen details").click()
        out["admin_details"] = panel.get_by_text("/v2/question-solver?paper=3").is_visible() and panel.get_by_text("abc1234").is_visible()
        panel.get_by_label(re.compile("^Reply to")).fill("Thanks, fixed now")
        panel.get_by_role("button", name="Send reply").click()
        s.page.get_by_text(re.compile("Reply sent")).wait_for()
        replies = [b for m, p, b in s.calls if m == "POST" and p == "/api/tickets" and b.get("reply")]
        out["admin_reply_posted"] = [(b["ticketId"], b["reply"]) for b in replies]
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)
    failed = [k for k, v in out.items() if v is False]
    assert not failed, f"checks failed: {failed}"


if __name__ == "__main__":
    main()
