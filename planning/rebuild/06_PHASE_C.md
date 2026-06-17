# Rebuild — Phase C: Attendance & Curriculum (depend on Scheduling)

| # | Module | Owns | Notes |
|---|---|---|---|
| C1 | `attendance` | SessionAttendance, MeetingAttendance, strikes | No-show strike automation (ISSUE-041) as a pure `core` rule + scheduled job. Thresholds: student=4, staff=3, ambassador=3 (handoff §26.22). |
| C2 | `curriculum` | Syllabus/Task/Mock/CourseTimeline + Ambassador mirror | TaskItem -> auto TaskSubmission per assigned student (handoff §26.30); chapter/recording links (§36). |
| C3 | `calendar` | CalendarItem | Populated by Scheduling + Meetings via events (ISSUE-042). One row per involved user; GCal sync flag (§26.8). |
