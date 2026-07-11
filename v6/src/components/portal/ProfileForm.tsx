"use client";

import { useState, useEffect } from "react";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Shield, 
  GraduationCap, 
  BookOpen, 
  Target,
  Clock,
  Star,
  Save,
  Loader2
} from "lucide-react";
import { updateProfile } from "@/lib/actions/profile";

export function ProfileForm({ user }: { user: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [formData, setFormData] = useState({
    phone: user.phone || "",
    address: user.address || "",
    bio: user.bio || "",
    grade: user.grade || "",
    board: user.board || "",
    targetUni: user.targetUni || "",
    specialization: user.specialization || "",
    hourlyRate: user.hourlyRate || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const role = user.role.toLowerCase();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 rounded-3xl bg-[var(--navy)] flex items-center justify-center text-white text-4xl font-black shadow-2xl">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{user.name}</h1>
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                role === 'management' ? 'bg-purple-100 text-purple-700' :
                role === 'staff' ? 'bg-blue-100 text-blue-700' :
                role === 'teacher' ? 'bg-teal-100 text-teal-700' :
                role === 'student' ? 'bg-emerald-100 text-emerald-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {user.role}
              </span>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[var(--text-muted)]">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail size={16} /> {user.email}
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar size={16} /> Joined {mounted ? new Date(user.createdAt).toLocaleDateString() : "Loading..."}
              </div>
              {user.dept && (
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--gold)]">
                  <Shield size={16} /> {user.dept} Dept
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="px-6 py-3 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--gold)] hover:text-white transition-all shadow-lg"
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        </div>
        
        {/* Background Accent */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[var(--gold)] opacity-5 rounded-full blur-3xl"></div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-8">
        {/* Basic Info Section */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-lg text-[var(--navy)] dark:text-white">
              <UserIcon size={20} />
            </div>
            <h2 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Contact Information</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input 
                  type="tel" 
                  disabled={!isEditing}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+44 7000 000000"
                  className="w-full p-4 pl-12 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="City, Country"
                  className="w-full p-4 pl-12 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Bio / About Me</label>
              <textarea 
                disabled={!isEditing}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Role Specific Info Section */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-lg text-[var(--gold)]">
              {role === 'student' ? <GraduationCap size={20} /> : 
               role === 'teacher' ? <BookOpen size={20} /> : 
               <Briefcase size={20} />}
            </div>
            <h2 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">
              {role === 'student' ? 'Academic Details' : 
               role === 'teacher' ? 'Teaching Profile' : 
               'Professional Info'}
            </h2>
          </div>

          <div className="space-y-4">
            {role === 'student' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Year / Grade</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input 
                      type="text" 
                      disabled={!isEditing}
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: e.target.value})}
                      placeholder="Year 12 / Grade 11"
                      className="w-full p-4 pl-12 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Board (IGCSE / A-Level)</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <select 
                      disabled={!isEditing}
                      value={formData.board}
                      onChange={(e) => setFormData({...formData, board: e.target.value})}
                      className="w-full p-4 pl-12 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all appearance-none"
                    >
                      <option value="">Select Board</option>
                      <option value="IGCSE">IGCSE</option>
                      <option value="A-Level">A-Level</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Target University</label>
                  <div className="relative">
                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input 
                      type="text" 
                      disabled={!isEditing}
                      value={formData.targetUni}
                      onChange={(e) => setFormData({...formData, targetUni: e.target.value})}
                      placeholder="Oxford, MIT, etc."
                      className="w-full p-4 pl-12 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {role === 'teacher' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Specialization</label>
                  <div className="relative">
                    <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input 
                      type="text" 
                      disabled={!isEditing}
                      value={formData.specialization}
                      onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                      placeholder="A-Level Physics, Maths"
                      className="w-full p-4 pl-12 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Hourly Rate (£)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input 
                      type="number" 
                      disabled={!isEditing}
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value)})}
                      className="w-full p-4 pl-12 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {(role === 'staff' || role === 'management') && (
              <div className="space-y-6">
                <div className="p-6 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Employment Status</p>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded">Full Time</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-[var(--text-muted)]">Department</span>
                      <span className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{user.dept}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-[var(--text-muted)]">Role</span>
                      <span className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{user.supervisor ? 'Supervisor / HOD' : 'Member'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="lg:col-span-2 flex justify-end gap-4 animate-in slide-in-from-right-4 duration-500">
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-8 py-4 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-10 py-4 bg-[var(--gold)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
