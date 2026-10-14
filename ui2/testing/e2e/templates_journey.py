"""TKT-0292: message templates. Management adds, edits, deletes and copies; a Teacher sees them read-only with Copy."""
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import portals_journey as P

def templates_handler(method, path, body, st):
    if not path.startswith("/api/templates"): return None
    rows = st.setdefault("templates", [{"TemplateID": "TPL-0001", "Name": "Payment acknowledged", "Body": "Thank you, we have received your payment.", "UpdatedBy": "MGT-0001"}])
    if method == "GET": return 200, {"templates": sorted(rows, key=lambda t: t["Name"].lower())}
    if method == "POST":
        if any(t["Name"].lower() == body["name"].strip().lower() for t in rows): return 400, {"error": "A template with this name already exists."}
        t = {"TemplateID": f"TPL-{len(rows) + 1:04d}", "Name": body["name"].strip(), "Body": body["body"].strip(), "UpdatedBy": "MGT-0001"}
        rows.append(t); return 200, {"template": t}
    if method == "PATCH":
        t = next(x for x in rows if x["TemplateID"] == body["templateId"]); t["Name"] = body["name"].strip(); t["Body"] = body["body"].strip(); return 200, {"template": t}
    if method == "DELETE":
        st["templates"] = [x for x in rows if x["TemplateID"] != body["templateId"]]; return 200, {"success": True}

def main():
    out = {}
    with Session(state={}) as s:
        s.on(r"^/api/templates", templates_handler)
        s.goto("/v2/management/templates")
        s.page.get_by_role("heading", name="All templates").wait_for()
        out["tab_present"] = s.page.get_by_role("link", name="Templates").count() + s.page.get_by_role("button", name="Templates").count()
        out["first_listed"] = s.page.get_by_role("article", name="Payment acknowledged").count()
        # add
        s.page.get_by_label("Template name").first.fill("Payment reminder")
        s.page.get_by_label("Text").first.fill("Dear parent,\nthe fee for this month is due.")
        s.page.get_by_role("button", name="Add template").click()
        s.page.get_by_role("article", name="Payment reminder").wait_for()
        out["added_sorted"] = [a.get_attribute("aria-label") for a in s.page.get_by_role("article").all()]
        # duplicate name shows the server's message and keeps the form
        s.page.get_by_label("Template name").first.fill("payment REMINDER")
        s.page.get_by_label("Text").first.fill("x")
        s.page.get_by_role("button", name="Add template").click()
        s.page.get_by_text("A template with this name already exists.").wait_for()
        out["duplicate_message"] = True
        s.page.get_by_label("Template name").first.fill(""); s.page.get_by_label("Text").first.fill("")
        # copy puts the exact text on the clipboard
        s.page.get_by_role("button", name="Copy Payment reminder").click()
        s.page.get_by_text("Copied Payment reminder.").wait_for()
        out["clipboard"] = s.page.evaluate("navigator.clipboard.readText()")
        # edit
        art = s.page.get_by_role("article", name="Payment acknowledged")
        art.get_by_role("button", name="Edit").click()
        form = s.page.get_by_role("form", name="Edit Payment acknowledged")
        form.get_by_label("Text").fill("Thank you. Your payment is received.")
        form.get_by_role("button", name="Save").click()
        s.page.get_by_text("Thank you. Your payment is received.").wait_for()
        out["edited"] = True
        # delete needs the confirm
        s.page.get_by_role("article", name="Payment reminder").get_by_role("button", name="Delete").click()
        s.page.get_by_role("dialog").get_by_role("button", name="Delete").click()
        s.page.get_by_role("article", name="Payment reminder").wait_for(state="detached")
        out["deleted_left"] = [a.get_attribute("aria-label") for a in s.page.get_by_role("article").all()]
        s.page.screenshot(path="snapshots/v2-templates.png")
        out["hscroll"] = s.hscroll(); out["errors"] = [e for e in s.errors if "status of 400" not in e][:3]  # the 400 is the deliberate duplicate name
        out["calls"] = [(m, p) for m, p, b in s.calls]
    # a Teacher: read-only, can copy
    user = {"UserID": "T", "UserType": "Teacher", "Name": "Test Teacher", "UiPreference": "next"}
    with Session(user=user, state={}) as s:
        s.on(r"^/api/templates", templates_handler)
        s.on(r"^/api/", P.handler_for(user, "teacher"))
        s.goto("/v2/teacher")
        s.page.get_by_role("heading", name="Message templates").wait_for(timeout=90000)
        s.page.get_by_role("article", name="Payment acknowledged").wait_for()
        card = s.page.get_by_role("article", name="Payment acknowledged")
        out["teacher_buttons"] = [b.inner_text() for b in card.get_by_role("button").all()]
        card.get_by_role("button", name="Copy").click()
        s.page.get_by_text("Copied Payment acknowledged.").wait_for()
        out["teacher_clipboard"] = s.page.evaluate("navigator.clipboard.readText()")
        out["teacher_hscroll"] = s.hscroll(); out["teacher_errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
