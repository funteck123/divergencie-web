import type { Metadata } from "next";
import LegalPage, { LegalSection, COMPANY, CONTACT_EMAIL, CONTACT_WHATSAPP } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | DivergenCIE Coaching",
  description: "What personal information DivergenCIE Coaching collects from students, parents and staff, why, who handles it for us, and how to ask us to see, correct or delete it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage eyebrow="Your data" title="Privacy Policy" intro="What we collect, why we collect it, who helps us handle it, and how you can ask us to change or delete it.">
      <LegalSection title="Who we are">
        <p>{COMPANY} runs DivergenCIE Coaching: online classes, study resources and the DivergenCIE portal at divergencie.co.uk. We decide what personal information we collect and why. In this policy, &quot;we&quot; means {COMPANY}.</p>
        <p>Contact us about anything in this policy at <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> or on WhatsApp at {CONTACT_WHATSAPP}.</p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p><strong>When you contact us or apply.</strong> Your name, email address, WhatsApp number, country and the message you write. For student admissions we may also ask for the student&apos;s school, the level and subjects they study, and a parent or guardian&apos;s contact details. For teacher and staff applications we collect what the application form asks for, such as contact details and experience.</p>
        <p><strong>When you have a portal account.</strong> Your name, username, role (student, parent, teacher, staff or management), email, WhatsApp number, location, time zone, course and batch. For students this can include the school and the parent&apos;s email and WhatsApp number. Your password is stored in a scrambled (hashed) form, never as plain text.</p>
        <p><strong>What you do in the portal.</strong> Class schedules and attendance, reschedule requests, support tickets, Question Solver answers and scores, and which syllabus topics you have marked as done.</p>
        <p><strong>Billing.</strong> Enrolments, invoices, payments and the payment details staff record to receive or send money.</p>
        <p><strong>Technical data.</strong> A sign-in cookie that keeps you logged in, and error reports that include technical details such as your browser type and the page where the error happened. We do not use advertising cookies.</p>
      </LegalSection>

      <LegalSection title="Why we use it">
        <ul className="list-disc pl-6 space-y-2">
          <li>To answer enquiries and run admissions.</li>
          <li>To teach: schedule classes, record attendance and give feedback.</li>
          <li>To bill: issue invoices, record payments and pay teachers and staff.</li>
          <li>To run the portal: keep accounts secure, answer support tickets, mark Question Solver answers and show progress.</li>
          <li>To find and fix faults in the website.</li>
        </ul>
        <p>We do not sell personal information.</p>
      </LegalSection>

      <LegalSection title="Who handles data for us">
        <p>We use these services to run DivergenCIE. They process data on our behalf, only to provide their service to us.</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Supabase</strong>: stores our database, including accounts, schedules, attendance, invoices and Question Solver scores.</li>
          <li><strong>Vercel</strong>: hosts the website and the portal.</li>
          <li><strong>Google</strong>: Google Drive holds our study resources and timesheets, and Gmail sends our emails.</li>
          <li><strong>OpenRouter and Google (Gemini), with the AI models they run</strong>: when you submit a written answer in the Question Solver, your typed answer, the question text and the official mark scheme image are sent to an AI model so it can mark the answer. We do not send your name or contact details with it.</li>
          <li><strong>Sentry</strong>: receives error reports so we can fix faults.</li>
          <li><strong>Cloudflare</strong>: carries traffic between the portal and our Question Solver and Syllabus Viewer services.</li>
        </ul>
        <p>We may also share information when the law requires it.</p>
      </LegalSection>

      <LegalSection title="Children and parents">
        <p>Many of our students are under 18. A parent or guardian can ask to see, correct or delete their child&apos;s information at any time by contacting us. We use a parent&apos;s contact details to reach them about their child&apos;s classes and fees.</p>
      </LegalSection>

      <LegalSection title="Security">
        <p>The site uses HTTPS. Passwords are hashed. Each account sees only what its role allows: a student sees their own schedule, attendance and scores, a parent sees their linked children, and management sees what it needs to run the school. No system is perfectly secure, so please keep your password private and tell us at once if you think someone else has used your account.</p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>We keep your information while your account is active and for as long as we need it for billing, accounting and legal records. When you ask us to delete an account, we delete it, except for records we must keep for those purposes.</p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>You can ask us to show you the information we hold about you, correct it, or delete it. Depending on where you live, local law may give you more rights, and we will respect them. To make a request, email <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> from the address on your account, or message us on WhatsApp. We may ask you to prove who you are before we act on a request.</p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>If we change this policy, we post the new version on this page and update the date at the top. If a change is significant, we also tell account holders in the portal or by email.</p>
      </LegalSection>
    </LegalPage>
  );
}
