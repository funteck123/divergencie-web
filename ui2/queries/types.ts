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
