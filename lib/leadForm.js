// TKT-0261: the public student form (/admissions) and the contact form both end in POST /api/leads. This file holds the pure rules, so they can be tested:
// clean and cap every field, drop bot posts (honeypot), build the readable Notes the team sees, and find a repeat submission.

export const TEXT_LIMIT = 300;
export const LONG_TEXT_LIMIT = 2000;
export const LIST_LIMIT = 60;
export const DUPLICATE_DAYS = 30;
export const ADMISSIONS_SOURCE = "Web Admissions Form";

const text = (v, n = TEXT_LIMIT) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n) : "");
const list = (v) => (Array.isArray(v) ? v.map((x) => text(x, 80)).filter(Boolean).slice(0, LIST_LIMIT) : []);
export const digits = (s) => String(s || "").replace(/\D/g, "");
// "0060 12 345 6789" and "+60 12 345 6789" are the same number: a leading "00" is the international prefix, written as "+" elsewhere.
export const phoneKey = (s) => { const raw = String(s || "").trim(); const d = digits(raw); return !raw.startsWith("+") && d.startsWith("00") ? d.slice(2) : d; };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A phone number is kept as typed; it needs at least 7 digits to be a number at all.
const validPhone = (s) => digits(s).length >= 7 && digits(s).length <= 16;

/** Returns { honeypot: true } for a bot post, { error } for a bad one, or { lead } with the cleaned fields. */
export function parseLeadBody(b) {
  const body = b && typeof b === "object" ? b : {};
  if (text(body.website, 50)) return { honeypot: true };   // a hidden field no person fills in
  const name = text(body.name, 120), email = text(body.email, 200).toLowerCase();
  if (!name || !email) return { error: "name and email are required." };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address." };
  const source = text(body.source, 80) || "Web Contact Form";
  const whatsapp = text(body.whatsapp, 40), phone = text(body.phone, 40), parentPhone = text(body.parentPhone, 40);
  if (whatsapp && !validPhone(whatsapp)) return { error: "Enter a WhatsApp number with the country code, for example +44 7700 900123." };
  const full = source === ADMISSIONS_SOURCE;
  const details = {
    gender: text(body.gender, 30), location: text(body.location, 120), school: text(body.school, 150),
    parentPhone, parentEmail: text(body.parentEmail, 200).toLowerCase(),
    level: text(body.level, 80), help: list(body.help), subjects: list(body.subjects), otherSubjects: text(body.otherSubjects, 200),
    referrer: text(body.referrer, 120), heardAbout: text(body.heardAbout, 60), coupon: text(body.coupon, 60).toUpperCase(),
    scoreAStar: ["Yes", "No"].includes(body.scoreAStar) ? body.scoreAStar : "",
    utmSource: text(body.utmSource, 80), utmMedium: text(body.utmMedium, 80), utmCampaign: text(body.utmCampaign, 120),
  };
  if (full) {
    if (body.consent !== true) return { error: "Please tick the box to agree to our Privacy Policy." };
    if (!whatsapp) return { error: "WhatsApp number with the country code is required." };
    if (!details.parentPhone || !validPhone(details.parentPhone)) return { error: "A parent or guardian contact number is required (if you are over 18, enter your own)." };
    if (details.parentEmail && !EMAIL.test(details.parentEmail)) return { error: "Enter a valid parent email address, or leave it empty." };
    if (!details.level) return { error: "Choose what you are studying." };
    if (!details.heardAbout) return { error: "Tell us how you heard about us." };
  }
  return {
    lead: {
      name, email, whatsapp, phone, country: text(body.country, 80), source, message: text(body.notes, LONG_TEXT_LIMIT),
      details, consent: full ? true : undefined,
    },
  };
}

/** The readable text the team sees in the Inquiries table and the email (both views already show Notes). */
export function leadNotes(lead) {
  const d = lead.details || {};
  const lines = [];
  if (lead.message) lines.push(lead.message);
  const row = (label, v) => { if (v && (!Array.isArray(v) || v.length)) lines.push(`${label}: ${Array.isArray(v) ? v.join(", ") : v}`); };
  row("Student", [d.gender, d.location, d.school && `school ${d.school}`].filter(Boolean).join(", "));
  row("Parent/guardian", [d.parentPhone, d.parentEmail].filter(Boolean).join(", "));
  row("Studying", d.level);
  row("Wants", d.help);
  row("Subjects", [...(d.subjects || []), d.otherSubjects && `other: ${d.otherSubjects}`].filter(Boolean));
  row("Heard about us", [d.heardAbout, d.referrer && `via ${d.referrer}`].filter(Boolean).join(" "));
  row("Coupon", d.coupon);
  row("Can score A* with proper guidance", d.scoreAStar);
  row("Campaign", [d.utmSource, d.utmMedium, d.utmCampaign].filter(Boolean).join(" / "));
  return lines.join("\n");
}

/** An earlier lead from the same email or WhatsApp number in the last DUPLICATE_DAYS days, or null. */
export function findDuplicate(leads, { email, whatsapp }, now = Date.now()) {
  const wa = phoneKey(whatsapp), cutoff = now - DUPLICATE_DAYS * 86400000;
  for (const l of [...(leads || [])].reverse()) {
    if (new Date(l.CreatedAt).getTime() < cutoff) continue;
    if (email && String(l.Email || "").toLowerCase() === email) return l;
    if (wa.length >= 7 && phoneKey(l.WhatsAppNumber) === wa) return l;
  }
  return null;
}
