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
