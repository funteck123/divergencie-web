import type { Metadata } from "next";
import LegalPage, { LegalSection, COMPANY, CONTACT_EMAIL } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | DivergenCIE Coaching",
  description: "The rules for using the DivergenCIE website, portal, Question Solver and study materials, plus our copyright and trademark notices.",
  alternates: { canonical: "/tos" },
};

export default function TermsOfServicePage() {
  return (
    <LegalPage eyebrow="The rules" title="Terms of Service" intro="How you may use the DivergenCIE website, portal, Question Solver and study materials, and who owns what.">
      <LegalSection title="Using the site and portal">
        <p>By using divergencie.co.uk and the DivergenCIE portal you agree to these terms. {COMPANY} (&quot;we&quot;) provides online coaching, study resources and the portal. If you are under 18, a parent or guardian should read these terms with you.</p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>We create your account and give you a username and password. Keep them private. Do not share an account or sign in as someone else. You are responsible for what happens under your account. Tell us at once if you think someone else has used it.</p>
      </LegalSection>

      <LegalSection title="How to use it">
        <ul className="list-disc pl-6 space-y-2">
          <li>Use the portal and Question Solver for your own study.</li>
          <li>Do not try to get into other accounts, data or systems, and do not disrupt the service.</li>
          <li>Do not copy, resell, record or share our worksheets, recordings, schedules or other materials outside your own study.</li>
          <li>Be respectful to teachers, staff and other students in classes and in support tickets.</li>
        </ul>
        <p>We may suspend an account that breaks these rules.</p>
      </LegalSection>

      <LegalSection title="Classes, fees and payments">
        <p>Your schedule, fees, payment dates and any credit for missed classes are set out in your enrolment, your invoices and the student guide we give you. Those documents apply together with these terms.</p>
      </LegalSection>

      <LegalSection title="AI marking and study tools">
        <p>The Question Solver marks written answers with an AI model against the official mark scheme. The marks and feedback are guidance for your practice. They are not official Cambridge marks, and they can be wrong. If a mark looks wrong, tell your teacher or raise a ticket in the portal and we will look at it.</p>
      </LegalSection>

      <LegalSection title="Copyright">
        <p>© 2026 {COMPANY}. All rights reserved. The website, the portal, our worksheets, notes, recordings, schedules, logos and designs belong to us or to the people who license them to us. You may use them for your own study. You may not copy or distribute them without our written permission.</p>
        <p>Past papers, mark schemes and syllabuses that appear in our study tools were written by Cambridge University Press &amp; Assessment, the College Board and other exam boards, who own the copyright in them. We use them to help students practise.</p>
      </LegalSection>

      <LegalSection title="Trademarks">
        <p>Cambridge, Cambridge International Education, CAIE, IGCSE, and AS &amp; A Level are names of Cambridge University Press &amp; Assessment. AP and SAT are trademarks of the College Board. IELTS and TOEFL belong to their owners. DivergenCIE is an independent coaching provider. We are not part of, approved by or endorsed by any of these organisations.</p>
      </LegalSection>

      <LegalSection title="Our responsibility">
        <p>We work to keep the website and portal available and accurate, but we provide them as they are. We cannot promise they will always work without interruption, and we do not guarantee exam results. Nothing in these terms limits any right you have under the law that cannot be limited.</p>
      </LegalSection>

      <LegalSection title="Privacy">
        <p>Our <a href="/privacy-policy" className="underline">Privacy Policy</a> explains what personal information we collect and how we use it.</p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>We may update these terms. The newest version is always on this page, with its date at the top. Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
