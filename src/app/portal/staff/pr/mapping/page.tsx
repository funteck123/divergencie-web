"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  BookOpen, 
  UserCheck, 
  Hash, 
  Trash2, 
  Plus, 
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Zap,
  AlertCircle
} from "lucide-react";
import { createMapping, getMappings, deleteMapping, getTeachersAndStudents } from "@/lib/actions/mapping";

export default function PRMappingPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    const [mappingData, userLists] = await Promise.all([
      getMappings(),
      getTeachersAndStudents()
    ]);
    setEnrollments(mappingData);
    setTeachers(userLists.teachers);
    setStudents(userLists.students);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await createMapping(formData);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (enrollment: any) => {
    const [groupId, studentId] = enrollment.id.split('-');
    if (confirm(`Remove ${enrollment.student} from ${enrollment.batch}?`)) {
      await deleteMapping(groupId, studentId);
      fetchData();
    }
  };

  // Group by batch for overview
  const batches = enrollments.reduce((acc: any[], curr) => {
    const existing = acc.find(b => b.code === curr.batch);
    if (existing) {
      existing.size += 1;
    } else {
      acc.push({ 
        code: curr.batch, 
        subject: curr.subject, 
        teacher: curr.teacher, 
        size: 1, 
        max: curr.batch.startsWith('C') ? 1 : 8, 
        status: curr.batch.startsWith('C') ? 'Full' : 'Open' 
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Batch Mapping</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Assign students to teachers and manage enrollment capacity.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Assignment Form */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-8">
            <UserPlus size={20} className="text-[var(--gold)]" />
            <h2 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">New Assignment</h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <form className="space-y-5" action={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Select Student</label>
              <select name="studentEmail" className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)] cursor-pointer" required>
                <option value="">Choose student...</option>
                {students.map(s => (
                  <option key={s.email} value={s.email}>{s.name} ({s.email})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subject</label>
                <select name="subject" className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)]" required>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Economics">Economics</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Teacher</label>
                <select name="teacherEmail" className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)] cursor-pointer" required>
                  <option value="">Choose teacher...</option>
                  {teachers.map(t => (
                    <option key={t.email} value={t.email}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Batch Code (B=Annual, C=1on1, T=On-Demand)</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                <input name="batchCode" type="text" placeholder="e.g. B8, C2, T5" className="w-full p-4 pl-12 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] uppercase" required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--gold)]/20 disabled:opacity-50">
              {loading ? "Processing..." : "Confirm Assignment"}
            </button>
          </form>
        </div>

        {/* Batch Overview */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Zap size={16} className="text-[var(--gold)]" /> Active Batches
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-6 py-4">Batch</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {batches.length > 0 ? batches.map((b, i) => (
                  <tr key={i} className="text-xs group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5 font-black text-[var(--gold)] uppercase text-[10px]">{b.code}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--navy)] dark:text-white">{b.subject}</span>
                        <span className="text-[9px] text-[var(--text-muted)] font-medium mt-0.5">{b.teacher}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--navy)] dark:text-white">{b.size} / {b.max}</span>
                        <div className="w-12 h-1 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full ${b.size >= b.max ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${(b.size/b.max)*100}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        b.size >= b.max ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                      }`}>
                        {b.size >= b.max ? 'Full' : 'Open'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[10px] font-black text-[var(--text-muted)] uppercase italic">No active batches.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Master Log */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Master Enrollment Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Teacher</th>
                <th className="px-6 py-4">Batch</th>
                <th className="px-6 py-4">Date Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {enrollments.length > 0 ? enrollments.map((m, i) => (
                <tr key={i} className="text-xs group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--gold)]"></div>
                      <span className="font-black uppercase text-[10px]">{m.student}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-bold uppercase text-[9px] text-[var(--text-muted)]">{m.subject}</td>
                  <td className="px-6 py-5 font-bold uppercase text-[9px] text-[var(--text-muted)]">{m.teacher}</td>
                  <td className="px-6 py-5 font-black text-[var(--gold)] uppercase text-[10px]">{m.batch}</td>
                  <td className="px-6 py-5 text-[var(--text-muted)] font-black text-[10px] uppercase">{m.date}</td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(m)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 rounded-lg transition-all" title="Remove Enrollment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[10px] font-black text-[var(--text-muted)] uppercase italic">No mapping records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
