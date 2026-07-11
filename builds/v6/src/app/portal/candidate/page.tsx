"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Video, 
  Upload as UploadIcon, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { submitCandidateDocs, requestInterview, getCandidateByEmail } from "@/lib/actions/candidate";

export default function CandidatePortal() {
  const { data: session } = useSession();
  const email = session?.user?.email;
  
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cvLink, setCvLink] = useState("");
  const [docsLink, setDocsLink] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (email) {
      fetchCandidate();
    } else {
      setLoading(false);
    }
  }, [email]);

  async function fetchCandidate() {
    if (!email) return;
    try {
      const data = await getCandidateByEmail(email) as any;
      setCandidate(data);
      if (data) {
        setCvLink(data.cvLink || "");
        setDocsLink(data.docsLink || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUploadDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      await submitCandidateDocs({ email, cvLink, docsLink });
      setMessage({ type: "success", text: "Documents updated successfully!" });
      fetchCandidate();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update documents." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !interviewDate) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      await requestInterview(email, new Date(interviewDate));
      setMessage({ type: "success", text: "Interview request submitted!" });
      fetchCandidate();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to submit interview request." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] dark:bg-[#0a0a0a]">
        <Loader2 className="w-12 h-12 text-[var(--gold)] animate-spin" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] dark:bg-[#0a0a0a]">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Candidate profile not found. Contact HR.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] dark:bg-[#0a0a0a] p-6 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--navy)] rounded-xl flex items-center justify-center text-[var(--gold)] font-black text-xl">DC</div>
            <div>
              <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Candidate Portal</h1>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Hello, {session?.user?.name || "Applicant"}</p>
            </div>
          </div>
          {candidate && (
            <div className="px-4 py-2 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${candidate.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">Status: {candidate.status}</span>
            </div>
          )}
        </div>

        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
            message.type === "success" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30"
          }`}>
            {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Section 1: Upload Documents */}
          <section className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl flex flex-col space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
                <UploadIcon size={20} />
              </div>
              <h2 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Document Submission</h2>
            </div>
            
            <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
              Please provide the latest version of your CV and any supporting documents (Portfolio, Certificates, or ID).
            </p>

            <form onSubmit={handleUploadDocs} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Resume / CV Link</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                  <input 
                    type="url" 
                    placeholder="Google Drive or Dropbox link"
                    value={cvLink}
                    onChange={(e) => setCvLink(e.target.value)}
                    className="w-full p-4 pl-12 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Supporting Docs Link</label>
                <div className="relative">
                  <UploadIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                  <input 
                    type="url" 
                    placeholder="Folder link for certifications"
                    value={docsLink}
                    onChange={(e) => setDocsLink(e.target.value)}
                    className="w-full p-4 pl-12 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all"
                  />
                </div>
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full py-4 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {isSubmitting ? "Uploading..." : "Save Documents"}
                <ArrowRight size={14} />
              </button>
            </form>
          </section>

          {/* Section 2: Interview Request */}
          <section className="bg-[var(--navy)] text-white rounded-3xl p-8 shadow-xl flex flex-col space-y-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[var(--gold)]/20 text-[var(--gold)] rounded-lg">
                  <Video size={20} />
                </div>
                <h2 className="text-lg font-black uppercase tracking-tight">Interview Scheduling</h2>
              </div>

              <p className="text-xs text-white/60 font-medium leading-relaxed mb-8">
                Request a preferred time slot for your initial interview. Our HR team will review and confirm via email.
              </p>

              {candidate?.interviewRequestedAt ? (
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="text-[var(--gold)]" size={20} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Current Request</p>
                      <p className="text-xl font-black">
                        {candidate.interviewRequestedAt ? new Date(candidate.interviewRequestedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Date TBD"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg w-fit">
                    <Loader2 size={12} className="animate-spin" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Pending HR Confirmation</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRequestInterview} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Preferred Date & Time</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                      <input 
                        required
                        type="datetime-local" 
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        className="w-full p-4 pl-12 bg-white/5 border border-white/10 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all text-white"
                      />
                    </div>
                  </div>
                  <button 
                    disabled={isSubmitting}
                    className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? "Submitting..." : "Request Interview Slot"}
                  </button>
                </form>
              )}
            </div>
            
            {/* Background Accent */}
            <div className="absolute -right-24 -bottom-24 w-64 h-64 bg-[var(--gold)] opacity-5 rounded-full blur-3xl"></div>
          </section>

        </div>

        {/* Status Notice */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShieldCheck size={20} className="text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Verified DivergenCIE Hiring Pipeline</p>
          </div>
          <button className="text-[10px] font-black text-[var(--gold)] uppercase tracking-widest hover:underline">View Privacy Policy</button>
        </div>

      </div>
    </div>
  );
}
