# Sibling tables meant to align need table-layout:fixed + shared widths

**Commit:** `f4b521a`. **Reported by the user** ("fix the first table
student and 2nd table student alignment. align each col to start f same
pos for both tables").

The MCQ leaderboard's "By average score" and "By total correct" tables are
two separate `<table>` elements stacked directly below each other, meant to
read as one comparison block. Plain HTML tables auto-size their own columns
from their own content independently — since one table's 3rd column says
"Avg %" and the other's says "Total correct" (different text width), the
two tables' "Student" columns did not start at the same x position even
though they're visually adjacent.

Fixed with `table-layout: fixed` plus identical `nth-child` width rules
shared by every `.lb-table` of the same column count:

```css
.lb-table { table-layout: fixed; }
.lb-table th:nth-child(2), .lb-table td:nth-child(2) { width: 45%; }
```

Verified by measuring, not just eyeballing: `boundingBox().x` on the
"Student" header in both tables came back identically `161px` after the
fix.

**When this pattern recurs**: searched the whole app (Management dashboard's
19 tables, Student dashboard's 3) for the same bug class afterward — found
none. Every other table in the app is either fully standalone with its own
unique columns, or shares a CSS class with another table that lives on a
different tab and is never shown simultaneously. This specific bug only
exists where two tables with the *same* column shape are deliberately
stacked to be read together — check for that specific condition before
assuming a "table alignment" bug report applies more broadly than it does.
