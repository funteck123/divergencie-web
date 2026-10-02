/** Fields of a user record as GET /api/users returns them (credentials joined in; the password is never sent back). */
export interface UserRecord {
  UserID: string;
  UserType: string;
  Name: string;
  Status: string;
  Username?: string;
  Password?: string;
  ConvertedToUserID?: string;
  Email?: string;
  ParentEmail?: string;
  WhatsAppNumber?: string;
  ParentWhatsAppNumber?: string;
  School?: string;
  Location?: string;
  Notes?: string;
  Course?: string;
  Batch?: string;
  Timezone?: string;
  Currency?: string;
  Role?: string;
  Department?: string;
  PassportNumber?: string;
  TimesheetURL?: string;
  ProgressTrackerURL?: string;
  WorkFolderURL?: string;
  GroupSent?: boolean;
  GCRSent?: boolean;
  ScheduleSent?: boolean;
  StudentIDs?: string[];
  UiPreference?: string;
  [key: string]: unknown;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface ServiceRate {
  RateID: string;
  Currency: string;
  Rate: number | string;
  Description?: string;
  BillingType?: string;
  Group?: string;
}
export interface ServiceOccurrence {
  OccuranceID: string;
  Day: string;
  Time: string;
  Duration: number | string;
  Facilitator: string;
  FacilitatorUserID?: string;
  Timezone?: string;
}
export interface ServiceBatch {
  BatchID: string;
  BatchName?: string;
  StartDate?: string;
  EndDate?: string;
  Rates?: ServiceRate[];
  OccuranceList?: ServiceOccurrence[];
}
export interface ServiceComponent {
  ComponentID: string;
  ComponentName?: string;
  Batches?: ServiceBatch[];
}
/** A service as GET /api/services returns it. Cohort services (Student, Teacher) carry components with batches; role services carry flat Rates and OccuranceList. */
export interface ServiceRecord {
  ServiceID: string;
  Name: string;
  Type: string;
  Group: string | string[];
  Board?: string;
  Course?: string;
  SubjectCode?: string;
  SubjectName?: string;
  RecordingsLink?: string;
  SyllabusLink?: string;
  WorksheetsLink?: string;
  GCRLink?: string;
  StartDate?: string;
  EndDate?: string;
  Role?: string;
  Department?: string;
  University?: string;
  Country?: string;
  Links?: { LinkID: string; Name: string; Url: string }[];
  OptionalComponents?: ServiceComponent[];
  Rates?: ServiceRate[];
  OccuranceList?: ServiceOccurrence[];
  [key: string]: unknown;
}

export interface EnrollmentRecord {
  EnrolmentID: string;
  UserID: string;
  ServiceID: string;
  BatchID?: string;
  RateID?: string;
  Currency?: string;
  StartDate?: string;
  EndDate?: string;
  [key: string]: unknown;
}

export interface BillLineItem {
  ServiceID: string;
  BatchID?: string;
  ScheduledHours?: number | string | null;
  AttendedHours?: number | string | null;
  Amount: number | string;
  Currency?: string;
  Note?: string;
}

/** An invoice (student) or a paycheck (staff). Both share this shape; the person and paid-flag keys differ. */
export interface BillRecord {
  Status: string;
  Year: number;
  Month: number;
  Amount: number | string;
  INRAmount: number | string;
  INRDue: number | string;
  Currency?: string;
  SentAt?: string;
  PaidAt?: string;
  ReceivedAt?: string;
  PaymentProofPath?: string;
  LineItems?: BillLineItem[];
  ServiceID?: string;
  BatchID?: string;
  DiscountPercent?: number;
  CustomDiscount?: number;
  CouponCode?: string;
  CouponPercent?: number;
  [key: string]: unknown;
}

export interface GuideRecord {
  GuideID: string;
  Name: string;
  Url: string;
  UserTypes?: string[];
}

export interface TicketNote {
  By: string;
  At: string;
  Text: string;
}
export interface TicketRecord {
  TicketID: string;
  SenderUserID: string;
  Message: string;
  AttachmentURL?: string;
  CreatedAt: string;
  ClosedAt?: string;
  CloseMessage?: string;
  OnHold?: boolean;
  OnHoldReason?: string;
  Notes?: TicketNote[];
  [key: string]: unknown;
}

export interface ScheduleItem {
  ScheduleID: string;
  ServiceID?: string;
  ServiceName?: string;
  ServiceType?: string;
  ServiceGroup?: string | string[];
  Date: string;
  Time: string;
  Timezone?: string;
  Duration: number | string;
  Facilitator?: string;
  OccuranceID?: string | null;
  RescheduledDate?: string;
  RescheduledTime?: string;
  [key: string]: unknown;
}

export interface AttendanceItem {
  AttendanceID: string;
  ScheduleItemID: string;
  UserID: string;
  Status: string;
  LoggedDuration: number | string;
  LoggedBy: string;
  LoggedAt?: string;
  Date?: string;
  AcceptedForBilling?: boolean;
  TopicName?: string;
  RecordingLink?: string;
}

export interface RescheduleRequest {
  RescheduleRequestID: string;
  ScheduleItemID: string;
  RequesterName: string;
  RequestedDate: string;
  RequestedTime: string;
  Slot?: ScheduleItem;
}

export interface RosterPerson {
  userId: string;
  name: string;
  userType: string;
}

export interface RegForm {
  RegFormID: string;
  Name: string;
  RequestedType: string;
  Status: string;
  Username?: string;
  Email?: string;
  WhatsAppNumber?: string;
  ParentContactNumber?: string;
  ParentEmail?: string;
  Gender?: string;
  Location?: string;
  SchoolName?: string;
  Studying?: string;
  HelpWanted?: string;
  Subjects?: string;
  ReferrerName?: string;
  HeardAbout?: string;
  CouponCode?: string;
  ScoreAStar?: string;
  [key: string]: unknown;
}

export interface LeadRecord {
  LeadID: string;
  Name: string;
  Email: string;
  WhatsAppNumber?: string;
  Country?: string;
  Notes?: string;
  CreatedAt: string;
}

export interface PendingRequest {
  TrialID?: string;
  InterviewID?: string;
  ServiceID: string;
  RequesterName: string;
  RequesterType?: string;
  [key: string]: unknown;
}

/** What GET /api/me?userId= returns. Which parts are filled depends on the account type. */
export interface MeBundle {
  user: UserRecord;
  enrollments?: EnrollmentRecord[];
  services?: ServiceRecord[];
  scheduleItems?: ScheduleItem[];
  attendanceItems?: AttendanceItem[];
  rescheduleRequests?: RescheduleRequest[];
  invoices?: BillRecord[];
  paychecks?: BillRecord[];
  guides?: GuideRecord[];
  children?: {
    student?: UserRecord;
    schedule: ScheduleItem[];
    attendance: AttendanceItem[];
    invoices: BillRecord[];
    enrollments: EnrollmentRecord[];
    rescheduleRequests?: RescheduleRequest[];
  }[];
  trialItems?: import("@/ui2/features/pipeline/pipelineLogic").TrialItem[];
  interviewItems?: import("@/ui2/features/pipeline/pipelineLogic").InterviewItem[];
}
