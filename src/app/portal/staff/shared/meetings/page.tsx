"use client";

import { useState } from "react";
import { 
  Users, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  Plus, 
  Video, 
  MapPin, 
  ArrowRight,
  MessageSquare,
  Search,
  MoreVertical,
  Bell
} from "lucide-react";
import { getMeetings, requestMeeting, updateMeetingStatus } from "@/lib/actions/meetings";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function StaffMeetingsPage() {
  const { data: session } = useSession();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ((session?.user as any)?.dept) {
      getMeetings((session?.user as any).dept).then(setMeetings);
    }
  }, [session]);

  const handleStatusUpdate = async (id: string, status: string) => {
    setLoading(true);
    await updateMeetingStatus(id, status);
    const updated = await getMeetings((session?.user as any)?.dept!);
    setMeetings(updated);
    setLoading(false);
  };

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("creatorId", session?.user?.email!);
    
    try {
      await requestMeeting(formData);
      const updated = await getMeetings((session?.user as any)?.dept!);
      setMeetings(updated);
      alert("Meeting request sent!");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      alert("Error sending request");
    } finally {
      setLoading(false);
    }
  };

  const UPCOMING = meetings.filter(m => m.status === 'confirmed' || m.status === 'pending');
  const REQUESTS = meetings.filter(m => m.status === 'pending' && m.dept === (session?.user as any)?.dept);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Interdept Meetings</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Coordinate synchronization sessions across departments.</p>
        </div>
        <button 
          onClick={() => document.getElementById('request-form')?.scrollIntoView({ behavior: 'smooth' })}
          className="px-6 py-3 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus size={14} /> Request Meeting
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Confirmed Sessions</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={12} />
                <input type="text" placeholder="Filter meetings..." className="pl-8 pr-4 py-1.5 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-lg text-[10px] font-black uppercase outline-none" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Meeting Title</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Target Dept</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {UPCOMING.map((m) => (
                    <tr key={m.id} className="text-xs group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{m.title}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-bold mt-0.5">{m.agenda}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-[var(--text-muted)] font-bold">
                          <Clock size={12} /> {new Date(m.dateTime).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2 py-0.5 bg-[var(--bg-secondary)] dark:bg-white/10 rounded text-[9px] font-black text-[var(--text-muted)] uppercase">{m.dept}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          m.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Bell size={16} />
              <h3 className="text-sm font-black uppercase tracking-widest">Incoming Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">From Dept</th>
                    <th className="px-6 py-4">Proposed Time</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {REQUESTS.map((r) => (
                    <tr key={r.id} className="text-xs group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{r.title}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-bold mt-0.5">{r.agenda}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-bold text-[var(--navy)] dark:text-white">{r.dept}</span>
                      </td>
                      <td className="px-6 py-5 font-bold text-[var(--text-muted)]">{new Date(r.dateTime).toLocaleString()}</td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleStatusUpdate(r.id, 'confirmed')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all">
                            <Check size={14} />
                          </button>
                          <button onClick={() => handleStatusUpdate(r.id, 'declined')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Meeting Request Form Card */}
        <div id="request-form" className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-8">
            <MessageSquare size={20} className="text-[var(--gold)]" />
            <h2 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Quick Request</h2>
          </div>
          <form onSubmit={handleRequest} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Meeting Title</label>
              <input name="title" required type="text" placeholder="e.g. Sales Sync" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Target Department</label>
              <select name="dept" className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]">
                <option value="PR">PR / Ops</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="IT">IT</option>
                <option value="All Staff">All Staff</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Date</label>
                <input name="date" required type="date" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Time</label>
                <input name="time" required type="time" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Agenda Highlights</label>
              <textarea name="agenda" placeholder="What will be discussed?" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] min-h-[80px]" />
            </div>
            <button disabled={loading} type="submit" className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--gold)]/20 disabled:opacity-50">
              {loading ? "Sending..." : "Send Meeting Request"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
