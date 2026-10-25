"""TKT-0359: the Occurrences cell of My Enrollments shows one chip per session and the teacher once. All data is fake (harness)."""
import copy, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import portals_journey as P

AKHTAR = "Mohammad Shahid Akhtar"
TWO_SAME_TEACHER = [
    {"OccuranceID": "O1", "Day": "Sunday", "Time": "20:30", "Duration": 1, "Facilitator": AKHTAR, "FacilitatorUserID": "TCH-0001", "Timezone": "Asia/Kolkata"},
    {"OccuranceID": "O2", "Day": "Saturday", "Time": "20:30", "Duration": 1, "Facilitator": AKHTAR, "FacilitatorUserID": "TCH-0001", "Timezone": "Asia/Kolkata"},
]
THREE_TWO_TEACHERS = TWO_SAME_TEACHER + [{"OccuranceID": "O3", "Day": "Tuesday", "Time": "17:30", "Duration": 2, "Facilitator": "Dr Harem Mir", "FacilitatorUserID": "TCH-0002", "Timezone": "Asia/Kolkata"}]


def run(width, occurrences, label, out):
    user = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    svc = copy.deepcopy(P.SVC)
    svc[0]["OptionalComponents"][0]["Batches"][0]["OccuranceList"] = occurrences
    base = P.handler_for(user, "student")

    def h(method, path, body, st):
        if path.startswith("/api/me"):
            b = P.bundle(user, "student"); b["services"] = svc; return 200, b
        return base(method, path, body, st)

    with Session(user=user, state={}, width=width, height=900) as s:
        s.on(r"^/api/", h)
        s.goto("/v2/student")
        cell = s.page.locator(".u2-sessions").first
        cell.wait_for(timeout=60000)
        chips = s.page.locator(".u2-sessions__chip")
        out[f"{label}_chips"] = [t.strip().replace("\n", " ") for t in chips.all_inner_texts()]
        out[f"{label}_teachers"] = [t.strip() for t in s.page.locator(".u2-sessions__who").all_inner_texts()]
        # nothing is cut off: every chip sits inside the card, and the page does not scroll sideways
        out[f"{label}_chip_inside"] = s.page.evaluate("""() => [...document.querySelectorAll('.u2-sessions__chip')].every(c => { const r = c.getBoundingClientRect(), w = c.closest('.u2-sessions').getBoundingClientRect(); return r.left >= w.left - 1 && r.right <= w.right + 1 && r.width > 0; })""")
        out[f"{label}_hscroll"] = s.hscroll()
        os.makedirs("snapshots", exist_ok=True)
        cell.scroll_into_view_if_needed()
        s.page.screenshot(path=f"snapshots/v2-portal-sessions-{label}.png", full_page=True)
        out[f"{label}_errors"] = s.errors[:3]


def main():
    out = {}
    run(1280, TWO_SAME_TEACHER, "desk", out)
    run(390, THREE_TWO_TEACHERS, "phone", out)
    for k, v in out.items(): print(k, v)
    assert out["desk_chips"] == ["Sunday 20:30 1h", "Saturday 20:30 1h"], out["desk_chips"]
    assert out["desk_teachers"] == [AKHTAR], "the teacher must appear once, not after each session"
    assert out["phone_chips"] == ["Sunday 20:30 1h", "Saturday 20:30 1h", "Tuesday 17:30 2h"], out["phone_chips"]
    assert out["phone_teachers"] == [AKHTAR, "Dr Harem Mir"], out["phone_teachers"]
    for lab in ("desk", "phone"):
        assert out[f"{lab}_chip_inside"] is True and out[f"{lab}_hscroll"] == 0 and out[f"{lab}_errors"] == [], lab


if __name__ == "__main__":
    main()
