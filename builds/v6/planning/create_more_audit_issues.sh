#!/bin/bash
# Batch create additional GitHub issues from audit findings
# Each issue maps to a logic gap or authorization flaw found in the codebase

set -euo pipefail
source "$(dirname "$0")/../.env"
export GITHUB_PAT

REPO="funteck123/divergencie-web"
API="https://api.github.com/repos/$REPO/issues"

python3 << 'PYEOF'
import json, time, os, urllib.request

REPO = "funteck123/divergencie-web"
API = f"https://api.github.com/repos/{REPO}/issues"
PAT = os.environ.get("GITHUB_PAT")

def create_issue(title, body, labels=None):
    if labels is None:
        labels = ["logic-gap", "security", "audit-more-issues"]
    
    data = json.dumps({
        "title": title,
        "body": body,
        "labels": labels
    }).encode()
    
    req = urllib.request.Request(API, data=data, method="POST", headers={
        "Authorization": f"token {PAT}",
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
    })
    
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print(f"  ✓ #{result['number']} — {title}")
        return result['number']
    except Exception as e:
        print(f"  ✗ FAILED — {title}: {e}")
        return None
    finally:
        time.sleep(1.2)

issues = [
    {
        "title": "ISSUE-075 (Security-BOLA): Broken Object Level Authorization (BOLA) in getStudentFlags",
        "body": """## Security BOLA Defect

**File:** `src/lib/actions/tickets.ts` L187
**Endpoint:** `getStudentFlags(studentEmail: string)`

### Defect
The action retrieves warning and status flags for any student via their email address:
```typescript
export async function getStudentFlags(studentEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { email: studentEmail } });
  // ...
  return await prisma.studentFlag.findMany({ where: { studentId: user.id } });
}
```
It only checks if the user is authenticated, but fails to verify if `session.user.email === studentEmail` or if the user has `staff`, `management`, or matching `parent` roles. Any student can query flags for other students.

### Fix
Restrict lookup access to:
1. The student themselves.
2. Linked parent of the student.
3. Staff/Management.
"""
    },
    {
        "title": "ISSUE-076 (Security-BOLA): Broken Object Level Authorization (BOLA) in Candidate actions",
        "body": """## Security BOLA Defect

**File:** `src/lib/actions/candidate.ts`
**Endpoints:** `submitCandidateDocs`, `requestInterview`, `getCandidateByEmail`

### Defect
All candidate actions execute mutations/queries scoped by email parameter without verifying caller credentials:
- `submitCandidateDocs`: Creates/updates any email's CV/docs link.
- `requestInterview`: Schedules interview timings for any candidate email.
- `getCandidateByEmail`: Returns profile details of any candidate email.

### Fix
Enforce that:
1. The logged-in candidate can only view/modify their own record.
2. Staff/Management are permitted.
3. Throw `Forbidden` if actor mismatch occurs.
"""
    },
    {
        "title": "ISSUE-077 (Logic-Gap): Missing Lead to PR ticket linking (handoffTicketId not set) & update bypass",
        "body": """## Logic-Gap Defect

**File:** `src/lib/actions/marketing.ts` L55
**Endpoint:** `passLeadToPR`

### Defect
When `passLeadToPR` runs, it creates a Ticket for PR:
```typescript
await prisma.ticket.create({ data: { ... } });
```
However, the ID of the newly created Ticket is **never updated/linked back to the Lead record's `handoffTicketId`**, leaving the field null and breaking reference traceability.

Additionally, `updateLeadStatus` allows updating a lead to `enrolled` directly without creating the ticket handoff.

### Fix
1. Capture the created ticket's ID and update `Lead` to record `handoffTicketId: ticket.id`.
2. Ensure status transitions to `enrolled` route through `passLeadToPR` or trigger ticket creation automatically.
"""
    },
    {
        "title": "ISSUE-078 (Security-InfoDisclosure): Missing role-based access control on marketing campaign/outreach retrieval",
        "body": """## Security Information Disclosure Defect

**File:** `src/lib/actions/marketing.ts`
**Endpoints:** `getCampaigns`, `getOutreachItems`, `getExhibitionItems`, `getMarketingSchedules`

### Defect
These functions expose internal operational schedules, outreach campaigns, budgets, and marketing quotas to any authenticated user. There are no role checks, so students, parents, and candidates can call these actions.

### Fix
Enforce `requireMarketingAccess()` or similar role checks on all read actions containing internal operational data.
"""
    },
    {
        "title": "ISSUE-079 (Security-BOLA): Broken Object Level Authorization (BOLA) in getMonthlyStats",
        "body": """## Security BOLA Defect

**File:** `src/lib/actions/claims.ts` L234
**Endpoint:** `getMonthlyStats`

### Defect
Allows retrieving hourly rates and total calculated hours/amounts for any user by email parameter:
```typescript
export async function getMonthlyStats(userEmail: string, month: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // ...
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
}
```
No validation is performed to ensure the caller matches the email or is staff/finance.

### Fix
Verify caller identity or role before returning rate details.
"""
    },
    {
        "title": "ISSUE-080 (Logic-Gap): Unimplemented GeneralMeetingStatusChangeLog writing",
        "body": """## Logic-Gap Defect

**File:** `src/lib/actions/meetings.ts`
**Endpoint:** `updateMeetingStatus`

### Defect
Status changes on `GeneralMeeting` are updated in the database but **no log entry is written to `GeneralMeetingStatusChangeLog`**, rendering the change-log table defined in the Prisma schema empty.

### Fix
Write a `GeneralMeetingStatusChangeLog` entry inside `updateMeetingStatus` detailing the status transition, actor, and timestamp.
"""
    },
    {
        "title": "ISSUE-081 (Schema-Drift): MarketingPostSlot.missedTicketId missing Prisma relation definition",
        "body": """## Schema Drift Defect

**File:** `prisma/schema.prisma` L932
**Model:** `MarketingPostSlot`

### Defect
`missedTicketId String?` is defined as a plain string field. There is no `@relation` declared connecting it to the `Ticket` model, preventing referential integrity.

### Fix
Add the relation to `MarketingPostSlot`:
```prisma
missedTicketId String?
missedTicket   Ticket?  @relation(fields: [missedTicketId], references: [id])
```
"""
    }
]

print(f"Creating {len(issues)} additional GitHub issues...")
print("=" * 60)

created = []
for issue in issues:
    num = create_issue(issue["title"], issue["body"])
    if num:
        created.append(num)

print("=" * 60)
print(f"Done. Created {len(created)}/{len(issues)} issues.")
PYEOF
