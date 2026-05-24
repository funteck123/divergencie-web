"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  UserPlus, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare,
  Search
} from "lucide-react";
import { getLeads, createLead, updateLeadStatus, passLeadToPR } from "@/lib/actions/marketing";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

function MarketingLeadsPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", source: "Instagram", notes: "" });

  useEffect(() => {
    setLoading(true);
    getLeads(query).then(data => {
      setLeads(data);
      setLoading(false);
    });
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLead(formData);
    setIsModalOpen(false);
    setFormData({ name: "", email: "", phone: "", source: "Instagram", notes: "" });
    const updated = await getLeads(query);
    setLeads(updated);
  };

  const handleHandoff = async (id: string) => {
    if (confirm("Confirm student enrollment and handoff to PR/Ops?")) {
      await passLeadToPR(id, session?.user?.email || "");
      const updated = await getLeads(query);
      setLeads(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Lead Handoff</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Track conversions and transition students to PR/Operations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
        >
          <UserPlus size={16} /> New Lead
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="py-20 text-center uppercase tracking-widest text-xs font-black opacity-20">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="py-20 text-center uppercase tracking-widest text-xs font-black opacity-20">No leads in pipeline</div>
          ) : leads.map((lead) => (
            <div key={lead.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm group hover:border-[var(--gold)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-[var(--bg-secondary)] dark:bg-white/10 ${lead.passedToPR ? 'text-emerald-500' : 'text-[var(--gold)]'}`}>
                  {lead.passedToPR ? <CheckCircle2 size={24} /> : <MessageSquare size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{lead.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)] flex items-center gap-1">
                      <MessageSquare size={10} /> {lead.source}
                    </span>
                    <span className="w-1 h-1 bg-[var(--border-subtle)] rounded-full"></span>
                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">
                      {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${lead.status === 'enrolled' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {lead.status}
                  </span>
                </div>
                {!lead.passedToPR && (
                  <button 
                    onClick={() => handleHandoff(lead.id)}
                    className="px-4 py-2 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--gold)] hover:text-black transition-all flex items-center gap-2"
                  >
                    Enrol & Handoff <Send size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--navy)] text-white p-8 rounded-3xl shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Pipeline Stats</h3>
            <div className="space-y-6">
              <div>
                <p className="text-4xl font-black text-[var(--gold)]">{leads.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1">Total Active Leads</p>
              </div>
              <div className="h-px bg-white/10 w-full"></div>
              <div>
                <p className="text-4xl font-black text-emerald-400">{leads.filter(l => l.passedToPR).length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1">Conversions (To PR)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] p-6 rounded-3xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">UJM Goal</h3>
            <p className="text-xs font-medium leading-relaxed text-[var(--navy)] dark:text-white italic">
              "Journey 9: Marketing ensures every enrolled student is transitioned to Operations within 24 hours."
            </p>
          </div>
        </div>
      </div>

      {/* Lead Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl p-10 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-2">Capture Lead</h2>
              <p className="text-[var(--text-muted)] font-medium mb-8">Add a prospective student from a campaign.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Full Name</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. James Wilson"
                    className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--gold)] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Source</label>
                    <select 
                      value={formData.source}
                      onChange={(e) => setFormData({...formData, source: e.target.value})}
                      className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--gold)] transition-all text-sm font-medium"
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Word of Mouth">Referral</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Phone / WA</label>
                    <input 
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+44..."
                      className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--gold)] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Notes</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Interests, Grade level, etc..."
                    className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--gold)] transition-all min-h-[100px]"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg"
                  >
                    Create Lead
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MarketingLeadsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24 text-[var(--gold)] font-black uppercase tracking-widest animate-pulse">Loading...</div>}>
      <MarketingLeadsPageInner />
    </Suspense>
  );
}
