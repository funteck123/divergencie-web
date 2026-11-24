import TimePicker from "./TimePicker";

// 24 Nov 2026: the public time picker (no login, nothing stored). Also served at schedule.divergencie.co.uk.
export const metadata = {
  title: "Choose your class times | DivergenCIE Coaching",
  description: "Pick the days and times that suit you, copy a ready message and send it to DivergenCIE on WhatsApp.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/slots" },
};

export default function SlotsPage() {
  return <TimePicker />;
}
