import { greetingForTimezone } from "@/lib/billing";
import { normalizeTimezone } from "@/lib/timezones";
import type { Credentials, UserRecord } from "@/ui2/queries/types";

// TKT-0435: the message Management pastes (WhatsApp, email) to give a new person their Study Portal link, username and password. Same style as the invoice
// message in billingLogic.ts: plain text, a greeting for the person's time zone, a header line, then the details. Only what the portal really has is promised.

/** One line about the person's first look at their own page, for the kind of account they have. */
export function firstLookStep(userType: string): string {
  switch (userType) {
    case "Student":
      return "Check your Schedule for your next class, then open Resources for recordings and practice.";
    case "Parent":
      return "Check your child's Schedule and My Invoices.";
    case "Teacher":
    case "Staff":
      return "Check your Schedule and your Guides.";
    default:
      return "Have a look around your page; everything you need is there.";
  }
}

/** The one witty line. It is the team's own promise, with a wink. Change it here, in one place. */
export const WELCOME_WITTY_LINE = "Welcome to the team. We do not just teach the syllabus, we teach you to think like the examiner. Please do not tell the examiner.";

export function buildWelcomeMessage(user: Pick<UserRecord, "Name" | "UserID" | "UserType" | "Timezone">, creds: Credentials, origin: string, now: Date = new Date()): string {
  return [
    `${greetingForTimezone(normalizeTimezone(user.Timezone), now)}! Welcome to DivergenCIE. 😊`,
    "",
    "Your Study Portal account is ready.",
    "",
    "DivergenCIE Account Details",
    "",
    `Name: ${user.Name || user.UserID}`,
    `Account type: ${user.UserType}`,
    `Portal link: ${origin}/login`,
    `Username: ${creds.username}`,
    `Password: ${creds.password}`,
    "",
    "First steps:",
    "1. Open the portal link and sign in with the details above.",
    `2. ${firstLookStep(user.UserType)}`,
    "3. Press Report an Issue at the top of any page if something looks wrong. We read every one.",
    "",
    WELCOME_WITTY_LINE,
    "",
    "The DivergenCIE Team",
  ].join("\n");
}
