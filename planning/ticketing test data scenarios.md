### 🟢 Normal Tests (The Everyday Drama)

**Scenario 1: The Missing Tuition Saga**
*Narrative: Mrs. Smith is furious because her son got locked out of the university portal despite her paying the bill. She contacts Finance, who must coordinate with the Accounting and IT teams to fix the issue.*

*   **Step 1:**
    *   **Source:** Parent
    *   **Action:** Create
    *   **Target:** FIN
    *   **Message:** "I paid Jason’s tuition three days ago! Attached is my receipt. Why is his portal locked? Check `pay.university.edu/receipt/TXN-9982`."
    *   **Result:** Pass *(Rule 19)*
*   **Step 2:**
    *   **Source:** Fin Manager
    *   **Action:** Assign
    *   **Target:** Acct. Assistant
    *   **Message:** "Please verify the payment at `internal.ledger.edu/TXN-9982` and clear the balance."
    *   **Result:** Pass *(Rule 434)*
*   **Step 3:**
    *   **Source:** Acct. Assistant
    *   **Action:** Forward
    *   **Target:** IT Manager
    *   **Message:** "Payment cleared on our end. Can you lift the academic hold on Jason's portal account?"
    *   **Result:** Pass *(Rule 217)*
*   **Step 4:**
    *   **Source:** IT Manager
    *   **Action:** Assign
    *   **Target:** IT Assistant
    *   **Message:** "Run the sync script on the student database to lift the suspension."
    *   **Result:** Pass *(Rule 437)*
*   **Step 5:**
    *   **Source:** IT Assistant
    *   **Action:** Close
    *   **Target:** CLOSED
    *   **Message:** "Sync complete. Account active. Closing ticket."
    *   **Result:** Pass *(Rule 450)*

**Scenario 2: The Candidate's Second Chance**
*Narrative: Alex’s application was closed due to missing documents, but he finally got his official transcripts. He requests a reopening, and HR guides him through the upload.*

*   **Step 1:**
    *   **Source:** Candidate
    *   **Action:** Request
    *   **Target:** REOPENED
    *   **Message:** "I finally received my official transcripts from the state! Please reconsider my application."
    *   **Result:** Pass *(Rule 22)*
*   **Step 2:**
    *   **Source:** REOPENED
    *   **Action:** Back to workflow
    *   **Target:** HR Assistant
    *   **Message:** "[System Auto-Msg] Candidate #8493 has requested a review. Ticket returned to your queue."
    *   **Result:** Pass *(Rule 467)*
*   **Step 3:**
    *   **Source:** HR Assistant
    *   **Action:** Forward
    *   **Target:** Candidate
    *   **Message:** "Hi Alex, please upload your documents directly to `hiring.university.edu/upload/8493`."
    *   **Result:** Pass *(Rule 33)*
*   **Step 4:**
    *   **Source:** Candidate
    *   **Action:** Create
    *   **Target:** HR
    *   **Message:** "Files uploaded successfully! See `drive.google.com/dummy/transcripts-alex`."
    *   **Result:** Pass *(Rule 1)*
*   **Step 5:**
    *   **Source:** HR Assistant
    *   **Action:** Close
    *   **Target:** CLOSED
    *   **Message:** "Documents verified and added to file. Proceeding to interview stage. Closing support ticket."
    *   **Result:** Pass *(Rule 441)*

**Scenario 3: The PR Crisis Delegation**
*Narrative: A negative article just dropped about the university dorms. Upper management bypasses the usual chain to assign cleanup directly to the PR and Social Media teams.*

*   **Step 1:**
    *   **Source:** Management
    *   **Action:** Assign
    *   **Target:** PR Assistant
    *   **Message:** "Draft a response to this local news article immediately: `dailynews.local/university-dorms-scandal`. I want it live in an hour."
    *   **Result:** Pass *(Rule 426)*
*   **Step 2:**
    *   **Source:** PR Assistant
    *   **Action:** Forward
    *   **Target:** SM Manager
    *   **Message:** "Draft approved by legal. Need this scheduled across all platforms ASAP. Draft here: `docs.univ.edu/pr-statement-v2`."
    *   **Result:** Pass *(Rule 253)*
*   **Step 3:**
    *   **Source:** SM Manager
    *   **Action:** Assign
    *   **Target:** SM Assistant
    *   **Message:** "Queue this up on Hootsuite for Twitter, Insta, and FB. `hootsuite.com/dashboard/queue`."
    *   **Result:** Pass *(Rule 433)*
*   **Step 4:**
    *   **Source:** SM Assistant
    *   **Action:** Close
    *   **Target:** CLOSED
    *   **Message:** "Posts are live and pinned. Monitoring comments. Closing task."
    *   **Result:** Pass *(Rule 443)*

**Scenario 4: The Associate PM's Iron Fist**
*Narrative: Midterms just finished. A professor's scanner breaks, so the Associate Product Manager (who handles course software) forces the Teaching Assistant to manually input 200 grades.*

*   **Step 1:**
    *   **Source:** Teacher
    *   **Action:** Create
    *   **Target:** IT
    *   **Message:** "The scantron machine in building B is broken. I can't upload the midterm grades to `canvas.university.edu/course-101`."
    *   **Result:** Pass *(Rule 10)*
*   **Step 2:**
    *   **Source:** IT Manager
    *   **Action:** Forward
    *   **Target:** Assoc. PM
    *   **Message:** "Hardware replacement will take 3 days. Can your team handle a manual grade upload for Course 101?"
    *   **Result:** Pass *(Rule 309)*
*   **Step 3:**
    *   **Source:** Assoc. PM
    *   **Action:** Assign
    *   **Target:** Teaching Asst.
    *   **Message:** "I need all 200 midterm scans manually processed and inputted by midnight. Hop to it. Files are at `shared-drive.local/midterms-raw`."
    *   **Result:** Pass *(Rule 436)*
*   **Step 4:**
    *   **Source:** Teaching Asst.
    *   **Action:** Close
    *   **Target:** CLOSED
    *   **Message:** "Grades manually entered. My hands hurt. Closing ticket."
    *   **Result:** Pass *(Rule 448)*

---

### 🟡 Extreme / Boundary Tests (Pushing the Limits)

**Scenario 5: The Intern's Big Discovery**
*Narrative: An AI Intern spots a critical vulnerability. It goes up the chain rapidly, pulling in the SWE intern, before escalating all the way to the top board.*

*   **Step 1:**
    *   **Source:** AI Intern
    *   **Action:** Forward
    *   **Target:** IT Manager
    *   **Message:** "Boss, the anomaly detection model flagged a massive data leak at `logs.datadog.com/query/q=auth_bypass`. Looks like a zero-day."
    *   **Result:** Pass *(Rule 363)*
*   **Step 2:**
    *   **Source:** IT Manager
    *   **Action:** Assign
    *   **Target:** SWE Intern
    *   **Message:** "Drop whatever you are doing. Patch the auth endpoint at `github.internal/repo/auth-service` immediately."
    *   **Result:** Pass *(Rule 439)*
*   **Step 3:**
    *   **Source:** SWE Intern
    *   **Action:** Forward
    *   **Target:** Management
    *   **Message:** "Patch deployed. We need to alert the board about the data exposure scope. Incident report: `confluence.internal/inc-992`."
    *   **Result:** Pass *(Rule 393)*
*   **Step 4:**
    *   **Source:** Management
    *   **Action:** Close
    *   **Target:** CLOSED
    *   **Message:** "Received. Legal is taking over. Good catch, interns. Closing ticket."
    *   **Result:** Pass *(Rule 528)*

**Scenario 6: The "Takebacks" Incident**
*Narrative: The HR Manager closed a candidate's file, but the background check software suddenly flagged a criminal record. HR frantically rips the ticket back open.*

*   **Step 1:**
    *   **Source:** HR Manager
    *   **Action:** Close
    *   **Target:** CLOSED
    *   **Message:** "Offer letter signed. Welcome aboard. `onboarding.local/new-hire/88`."
    *   **Result:** Pass *(Rule 440)*
*   **Step 2:**
    *   **Source:** HR Manager
    *   **Action:** Trigger
    *   **Target:** REOPENED
    *   **Message:** "Wait! The API at `checkr.com/report/11x9` just updated with a felony flag. Stop the onboarding!"
    *   **Result:** Pass *(Rule 453)*
*   **Step 3:**
    *   **Source:** REOPENED
    *   **Action:** Back to workflow
    *   **Target:** Candidate
    *   **Message:** "[System Auto-Msg] Your onboarding process has been paused. Immediate action required. See `portal.university.edu/compliance-hold`."
    *   **Result:** Pass *(Rule 479)*
*   **Step 4:**
    *   **Source:** HR Manager
    *   **Action:** Close
    *   **Target:** CLOSED
    *   **Message:** "Offer rescinded based on compliance failure. Permanently closing."
    *   **Result:** Pass *(Rule 440)*

**Scenario 7: An Intern Wants to Get Paid**
*Narrative: Even the lowest level software intern can open a direct formal ticket with the Finance department if their paycheck is short, proving cross-department access for staff.*

*   **Step 1:**
    *   **Source:** SWE Intern
    *   **Action:** Create
    *   **Target:** FIN
    *   **Message:** "Hi, my intern stipend for this month is short by $50. Check my timesheet at `workday.internal/timesheets/swe-01`."
    *   **Result:** Pass *(Rule 656)*
*   **Step 2:**
    *   **Source:** Fin Manager
    *   **Action:** Assign
    *   **Target:** Acct. Assistant
    *   **Message:** "Audit timesheet `swe-01` and issue an out-of-cycle correction if valid."
    *   **Result:** Pass *(Rule 434)*
*   **Step 3:**
    *   **Source:** Acct. Assistant
    *   **Action:** Forward
    *   **Target:** SWE Intern
    *   **Message:** "Found the discrepancy. $50 will hit your account tomorrow. Receipt: `bank-receipt.local/txn/99201`."
    *   **Result:** Pass *(Rule 223)*
*   **Step 4:**
    *   **Source:** Acct. Assistant
    *   **Action:** Close
    *   **Target:** CLOSED
    *   **Message:** "Payment issued. Ticket closed."
    *   **Result:** Pass *(Rule 445)*

---

### 🔴 Invalid Tests (The "You Can't Do That" Scenarios)

**Scenario 8: The Bossy Student**
*Narrative: A student thinks they can dictate who works on their IT issues and tries to forcefully assign their broken laptop to the head of the IT department.*

*   **Step 1:**
    *   **Source:** Student
    *   **Action:** Create
    *   **Target:** IT
    *   **Message:** "My WiFi isn't working on campus. `network.edu/diagnostics` says it's an IP conflict."
    *   **Result:** Pass *(Rule 5)*
*   **Step 2:**
    *   **Source:** Student
    *   **Action:** Assign
    *   **Target:** IT Manager
    *   **Message:** "I have class in 10 minutes. I am assigning this directly to the IT Manager to fix it right now."
    *   **Result:** **Fail / Blocked**. *(Reason: Students can only `Create` tickets to general departments, not `Assign` to specific managers. "Assign" is reserved for internal management).*

**Scenario 9: Upward Delegation (The Lazy Assistant)**
*Narrative: The Social Media Assistant is overwhelmed with TikTok drafts and tries to pawn the work back off onto their boss.*

*   **Step 1:**
    *   **Source:** SM Manager
    *   **Action:** Assign
    *   **Target:** SM Assistant
    *   **Message:** "Please edit the campus tour footage. Assets are at `frame.io/proj-tour`."
    *   **Result:** Pass *(Rule 433)*
*   **Step 2:**
    *   **Source:** SM Assistant
    *   **Action:** Assign
    *   **Target:** SM Manager
    *   **Message:** "I'm way too busy with Instagram today. I'm assigning this video edit back to you."
    *   **Result:** **Fail / Blocked**. *(Reason: The `Assign` action is strictly top-down. Assistants can `Forward` info up, but cannot forcefully `Assign` tasks upward to their managers).*

**Scenario 10: The Impatient Ambassador**
*Narrative: A brand ambassador wants to skip the marketing team entirely and demand a bigger budget directly from the executive board.*

*   **Step 1:**
    *   **Source:** Ambassador
    *   **Action:** Create
    *   **Target:** MKT
    *   **Message:** "Hey Marketing, the upcoming energy drink promo needs a bigger budget. See my proposal: `dropbox.com/promo-budget`."
    *   **Result:** Pass *(Rule 13)*
*   **Step 2:**
    *   **Source:** Ambassador
    *   **Action:** Create
    *   **Target:** Management
    *   **Message:** "Marketing is taking too long to reply. I'm coming straight to the Board of Management. Approve my budget now!"
    *   **Result:** **Fail / Blocked**. *(Reason: External users like Ambassadors are restricted to `Create` actions targeting departments [HR, MKT, FIN, IT, PR]. They have no direct line to `Create` to Management).*
