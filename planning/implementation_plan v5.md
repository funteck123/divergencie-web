# DivergenCIE Coaching — Implementation Plan (Phase 3: Database Schema Completion)

This document outlines the implementation plan for Phase 3, focused on achieving 100% database schema completeness by adding the remaining 30 models specified in the ground truth **ERD v23** into our Prisma schema.

---

## User Review Required

> [!IMPORTANT]
> - **Strict ERD Naming:** We will adhere strictly to the exact naming conventions specified in ERD v23. We will implement all log tables with their exact `...ChangeLog` names (e.g., `AcademicSessionStatusChangeLog`, `AmbassadorCommissionItemStatusChangeLog`, etc.) rather than mapping them to the codebase's existing `...History` conventions.
> - **Permissions & Roles Lookup:** All roles (`UserType`), departments (`Department`), and permissions (`PortalPermission`) will be added as specified in the ERD to satisfy schema completeness and support potential future dynamic config.
> - **Zero Type Mismatches:** After adding these tables, we will run `npx prisma generate` and verify that the workspace remains free of any TypeScript compiler errors.

---

## Proposed Database Changes (ERD v23 Alignment)

We will modify [schema.prisma](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/prisma/schema.prisma) to add the following models and relations:

### 1. Lookup & System Config Models
- **`Department`**: Name of the internal department.
- **`StaffRole`**: Staff positions.
- **`UserType`**: Lookup of system user types.
- **`PortalPermission`**: Mapping roles/departments to access levels.

### 2. Marketing & Scheduling Entities
- **`MarketingSchedule`**: Recurrence schedules for marketing campaigns.
- **`MarketingScheduleOccurrence`**: Generated instances of marketing schedules.
- **`MarketingPostSlot`**: Scheduled slots for content posts.

### 3. Syllabus & Recording Extensions
- **`SyllabusChapter`**: Syllabus chapters.
- **`ChapterRecordingList`**: Group of recordings mapped to chapters.
- **`ChapterRecordingItem`**: Individual recordings within the list.

### 4. Ambassador Service Additions
- **`AmbassadorService`**: Lookup of public services offered by ambassadors.
- **`AmbassadorProgrammeContentList`**: Modules and contents inside the ambassador programme.

### 5. Metric & Report Tables
- **`MetricSnapshot`**: Snapshots of system performance (finance, tickets, attendance).
- **`ProgressReport`**: Generated PDF/markdown student progress files.

### 6. Granular Change Logs (Exact ERD Names)
Status change log tables for tracking state transitions (preserving the exact `ChangeLog` names from the ERD):
- `AcademicSessionStatusChangeLog`
- `AmbassadorCommissionItemStatusChangeLog`
- `AmbassadorEnrolmentItemStatusChangeLog`
- `AmbassadorMeetingStatusChangeLog`
- `AmbassadorProgrammeTimelineListStatusChangeLog`
- `AmbassadorScheduleOccurrenceStatusChangeLog`
- `AmbassadorTestListStatusChangeLog`
- `CourseTimelineListStatusChangeLog`
- `GeneralMeetingStatusChangeLog`
- `MeetingStatusChangeLog`
- `MockListStatusChangeLog`
- `SyllabusListStatusChangeLog`
- `TaskListStatusChangeLog`
- `StaffEnrolmentItemStatusChangeLog`
- `StaffScheduleOccurrenceStatusChangeLog`
- `StudentEnrolmentItemStatusChangeLog`
- `TeacherEnrolmentItemStatusChangeLog`
- `RateItemStatusChangeLog`

---

## Verification Plan

### Automated Checks
- Run `node ./node_modules/typescript/bin/tsc --noEmit` to confirm no TypeScript compilation errors exist.
- Run `npx prisma generate` and verify client compilation.
