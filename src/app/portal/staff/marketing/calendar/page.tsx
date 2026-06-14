"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import {
  getMarketingPosts, createMarketingPost, updatePostStatus, getMarketingStats,
  getCampaigns, createCampaign, getOutreachItems, createOutreachItem,
  getExhibitionItems, createExhibitionItem, getMarketingSchedules,
} from "@/lib/actions/marketing";
import { Calendar, Plus, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600", DRAFT: "bg-slate-100 text-slate-600",
  scheduled: "bg-sky-100 text-sky-700", SCHEDULED: "bg-sky-100 text-sky-700",
  published: "bg-emerald-100 text-emerald-700", PUBLISHED: "bg-emerald-100 text-emerald-700",
  ACTIVE: "bg-emerald-100 text-emerald-700", PLANNED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-purple-100 text-purple-700", CANCELLED: "bg-red-100 text-red-700",
};

const TABS = ["Posts", "Campaigns", "Outreach", "Exhibitions", "Schedules", "Stats"];
const PLATFORM_OPTIONS = ["INSTAGRAM","FACEBOOK","TIKTOK","LINKEDIN","WHATSAPP","YOUTUBE","X"];
const POST_TYPE_OPTIONS = ["CAROUSEL","REEL","STORY","STATIC_IMAGE","VIDEO","THREAD","ARTICLE"];
const CAMPAIGN_TAGS = ["ADMISSIONS","EXAM_PREP","BRAND_AWARENESS","AMBASSADOR_DRIVE","REFERRAL","RESULTS_DAY","SEASONAL","SUBJECT_SPOTLIGHT"];
const OUTREACH_TYPES = ["SCHOOL_VISIT","UNIVERSITY_FAIR","WEBINAR","COMMUNITY_EVENT","CAREERS_DAY"];
const EXHIBITION_TYPES = ["EDUCATION_FAIR","CAREER_EXPO","OPEN_DAY","SHOWCASE","CONFERENCE"];

export default function MarketingCalendarPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [tab, setTab] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [outreach, setOutreach] = useState<any[]>([]);
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ platform: "INSTAGRAM", postType: "REEL", caption: "", mediaUrl: "", campaignTag: "ADMISSIONS", scheduledDate: "" });
  const [postSaving, setPostSaving] = useState(false);

  const [showCampForm, setShowCampForm] = useState(false);
  const [campForm, setCampForm] = useState({ name: "", description: "", status: "PLANNED", startDate: "", endDate: "" });
  const [campSaving, setCampSaving] = useState(false);

  const [showOtrForm, setShowOtrForm] = useState(false);
  const [otrForm, setOtrForm] = useState({ outreachTypeName: "SCHOOL_VISIT", title: "", targetAudience: "", plannedDate: "", notes: "" });
  const [otrSaving, setOtrSaving] = useState(false);

  const [showExhForm, setShowExhForm] = useState(false);
  const [exhForm, setExhForm] = useState({ exhibitionTypeName: "EDUCATION_FAIR", title: "", venue: "", location: "", plannedDate: "", notes: "" });
  const [exhSaving, setExhSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, c, o, e, s, st] = await Promise.all([
      getMarketingPosts(), getCampaigns(), getOutreachItems(), getExhibitionItems(),
      getMarketingSchedules(), getMarketingStats(),
    ]);
    setPosts(p); setCampaigns(c); setOutreach(o); setExhibitions(e); setSchedules(s); setStats(st);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setPostSaving(true);
    await createMarketingPost({ ...postForm, scheduledDate: postForm.scheduledDate ? new Date(postForm.scheduledDate).toISOString() : undefined } as any);
    setShowPostForm(false); setPostForm({ platform: "INSTAGRAM", postType: "REEL", caption: "", mediaUrl: "", campaignTag: "ADMISSIONS", scheduledDate: "" });
    await load(); setPostSaving(false);
  };

  const handleCampSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setCampSaving(true);
    await createCampaign(campForm);
    setShowCampForm(false); setCampForm({ name: "", description: "", status: "PLANNED", startDate: "", endDate: "" });
    await load(); setCampSaving(false);
  };

  const handleOtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setOtrSaving(true);
    await createOutreachItem({ ...otrForm, assignedToUserId: user?.id ?? "" });
    setShowOtrForm(false); setOtrForm({ outreachTypeName: "SCHOOL_VISIT", title: "", targetAudience: "", plannedDate: "", notes: "" });
    await load(); setOtrSaving(false);
  };

  const handleExhSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setExhSaving(true);
    await createExhibitionItem({ ...exhForm, assignedToUserId: user?.id ?? "" });
    setShowExhForm(false); setExhForm({ exhibitionTypeName: "EDUCATION_FAIR", title: "", venue: "", location: "", plannedDate: "", notes: "" });
    await load(); setExhSaving(false);
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-[var(--bg-secondary)]" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Marketing</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Marketing Hub</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Posts, campaigns, outreach, exhibitions, and schedules.</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border-subtle)] overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
              tab === i ? "border-b-2 border-[var(--gold)] text-[var(--gold)]" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setShowPostForm(!showPostForm)} className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90">
              <Plus size={14} /> New Post
            </button>
          </div>
          {showPostForm && (
            <form onSubmit={handlePostSubmit} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">New Marketing Post</p>
              <div className="grid grid-cols-2 gap-4">
                {[["platform", "Platform", PLATFORM_OPTIONS],["postType","Post Type",POST_TYPE_OPTIONS],["campaignTag","Campaign Tag",CAMPAIGN_TAGS]].map(([k,label,opts]:any)=>(
                  <div key={k}><label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">{label}</label>
                  <select value={(postForm as any)[k]} onChange={e=>setPostForm(f=>({...f,[k]:e.target.value}))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                    {opts.map((o:string)=><option key={o}>{o}</option>)}</select></div>
                ))}
                <div><label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Scheduled Date</label>
                  <input type="datetime-local" value={postForm.scheduledDate} onChange={e=>setPostForm(f=>({...f,scheduledDate:e.target.value}))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
                <div className="col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Caption</label>
                  <textarea value={postForm.caption} onChange={e=>setPostForm(f=>({...f,caption:e.target.value}))} rows={3} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)] resize-none"/></div>
                <div className="col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Media URL</label>
                  <input value={postForm.mediaUrl} onChange={e=>setPostForm(f=>({...f,mediaUrl:e.target.value}))} placeholder="https://..." className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={postSaving} className="px-5 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2">{postSaving&&<Loader2 size={12} className="animate-spin"/>}Save</button>
                <button type="button" onClick={()=>setShowPostForm(false)} className="px-5 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)]">Cancel</button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {posts.length===0?<p className="text-[var(--text-muted)] text-sm text-center py-8">No posts yet.</p>:posts.map((p:any)=>(
              <div key={p.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[p.status]??"bg-gray-100 text-gray-600"}`}>{p.status}</span>
                    <span className="text-xs font-bold text-[var(--navy)] dark:text-white">{p.platform}</span>
                    <span className="text-xs text-[var(--text-muted)]">{p.postType}</span>
                    {p.campaignTag&&<span className="text-xs text-[var(--text-muted)]">#{p.campaignTag}</span>}
                  </div>
                  {p.caption&&<p className="text-xs text-[var(--text-muted)] truncate max-w-md">{p.caption}</p>}
                  {p.scheduledDate&&<p className="text-xs text-[var(--text-muted)] mt-0.5">{new Date(p.scheduledDate).toLocaleDateString("en-GB")}</p>}
                </div>
                <select value={p.status} onChange={e=>updatePostStatus(p.id,e.target.value).then(load)} className="text-xs border border-[var(--border-subtle)] bg-transparent rounded-lg px-2 py-1 outline-none shrink-0">
                  {["draft","scheduled","published"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab===1&&(
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={()=>setShowCampForm(!showCampForm)} className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90"><Plus size={14}/>New Campaign</button>
          </div>
          {showCampForm&&(
            <form onSubmit={handleCampSubmit} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">New Campaign</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><input required value={campForm.name} onChange={e=>setCampForm(f=>({...f,name:e.target.value}))} placeholder="Name *" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
                <div><select value={campForm.status} onChange={e=>setCampForm(f=>({...f,status:e.target.value}))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                  {["PLANNED","ACTIVE","COMPLETED","CANCELLED"].map(s=><option key={s}>{s}</option>)}</select></div>
                <div><input type="date" value={campForm.startDate} onChange={e=>setCampForm(f=>({...f,startDate:e.target.value}))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
                <div className="col-span-2"><textarea value={campForm.description} onChange={e=>setCampForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Description" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)] resize-none"/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={campSaving} className="px-5 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2">{campSaving&&<Loader2 size={12} className="animate-spin"/>}Save</button>
                <button type="button" onClick={()=>setShowCampForm(false)} className="px-5 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)]">Cancel</button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {campaigns.length===0?<p className="text-[var(--text-muted)] text-sm text-center py-8">No campaigns yet.</p>:campaigns.map((c:any)=>(
              <div key={c.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[c.status]??"bg-gray-100 text-gray-600"}`}>{c.status}</span>
                      <span className="text-sm font-black text-[var(--navy)] dark:text-white">{c.name}</span>
                    </div>
                    {c.description&&<p className="text-xs text-[var(--text-muted)]">{c.description}</p>}
                    <p className="text-xs text-[var(--text-muted)] mt-1">{c.items?.length??0} items</p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] shrink-0">{c.startDate?new Date(c.startDate).toLocaleDateString("en-GB"):"—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab===2&&(
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={()=>setShowOtrForm(!showOtrForm)} className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90"><Plus size={14}/>New Event</button>
          </div>
          {showOtrForm&&(
            <form onSubmit={handleOtrSubmit} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><select value={otrForm.outreachTypeName} onChange={e=>setOtrForm(f=>({...f,outreachTypeName:e.target.value}))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                  {OUTREACH_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><input type="date" required value={otrForm.plannedDate} onChange={e=>setOtrForm(f=>({...f,plannedDate:e.target.value}))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
                <div className="col-span-2"><input required value={otrForm.title} onChange={e=>setOtrForm(f=>({...f,title:e.target.value}))} placeholder="Title *" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
                <div className="col-span-2"><input value={otrForm.targetAudience} onChange={e=>setOtrForm(f=>({...f,targetAudience:e.target.value}))} placeholder="Target audience" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={otrSaving} className="px-5 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2">{otrSaving&&<Loader2 size={12} className="animate-spin"/>}Save</button>
                <button type="button" onClick={()=>setShowOtrForm(false)} className="px-5 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)]">Cancel</button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {outreach.length===0?<p className="text-[var(--text-muted)] text-sm text-center py-8">No outreach events yet.</p>:outreach.map((o:any)=>(
              <div key={o.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[o.status]??"bg-gray-100 text-gray-600"}`}>{o.status}</span>
                      <span className="text-sm font-black text-[var(--navy)] dark:text-white">{o.title}</span>
                      <span className="text-xs text-[var(--text-muted)]">{o.outreachType?.name}</span>
                    </div>
                    {o.targetAudience&&<p className="text-xs text-[var(--text-muted)]">{o.targetAudience}</p>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] shrink-0">{new Date(o.plannedDate).toLocaleDateString("en-GB")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab===3&&(
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={()=>setShowExhForm(!showExhForm)} className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90"><Plus size={14}/>New Exhibition</button>
          </div>
          {showExhForm&&(
            <form onSubmit={handleExhSubmit} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><select value={exhForm.exhibitionTypeName} onChange={e=>setExhForm(f=>({...f,exhibitionTypeName:e.target.value}))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                  {EXHIBITION_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><input type="date" required value={exhForm.plannedDate} onChange={e=>setExhForm(f=>({...f,plannedDate:e.target.value}))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
                <div className="col-span-2"><input required value={exhForm.title} onChange={e=>setExhForm(f=>({...f,title:e.target.value}))} placeholder="Title *" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
                <div><input value={exhForm.venue} onChange={e=>setExhForm(f=>({...f,venue:e.target.value}))} placeholder="Venue" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
                <div><input value={exhForm.location} onChange={e=>setExhForm(f=>({...f,location:e.target.value}))} placeholder="Location/City" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]"/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={exhSaving} className="px-5 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2">{exhSaving&&<Loader2 size={12} className="animate-spin"/>}Save</button>
                <button type="button" onClick={()=>setShowExhForm(false)} className="px-5 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)]">Cancel</button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {exhibitions.length===0?<p className="text-[var(--text-muted)] text-sm text-center py-8">No exhibitions yet.</p>:exhibitions.map((ex:any)=>(
              <div key={ex.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[ex.status]??"bg-gray-100 text-gray-600"}`}>{ex.status}</span>
                      <span className="text-sm font-black text-[var(--navy)] dark:text-white">{ex.title}</span>
                      <span className="text-xs text-[var(--text-muted)]">{ex.exhibitionType?.name}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{ex.venue}{ex.location?` · ${ex.location}`:""}</p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] shrink-0">{new Date(ex.plannedDate).toLocaleDateString("en-GB")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab===4&&(
        <div className="space-y-4">
          {schedules.length===0?(
            <div className="text-center py-12 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
              <Calendar size={28} className="mx-auto text-[var(--text-muted)] mb-2"/>
              <p className="text-[var(--text-muted)] text-sm">No marketing schedules. Contact management to create one.</p>
            </div>
          ):schedules.map((s:any)=>(
            <div key={s.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5">
              <p className="font-black text-sm text-[var(--navy)] dark:text-white mb-2">{s.name}</p>
              <p className="text-xs text-[var(--text-muted)] mb-3">By {s.createdBy?.name??"—"} · {s.occurrences?.length??0} occurrences</p>
              {s.occurrences?.slice(0,3).map((occ:any)=>(
                <div key={occ.id} className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[occ.status]??"bg-gray-100 text-gray-600"}`}>{occ.status}</span>
                  <span>{occ.recurrenceType}</span>
                  {occ.dayOfWeek&&<span>{occ.dayOfWeek}</span>}
                  <span>Quota: {occ.quotaPerPeriod}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab===5&&(
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats&&Object.entries(stats).map(([k,v]:any)=>(
            <div key={k} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{k.replace(/([A-Z])/g," $1").trim()}</p>
              <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{v}</p>
            </div>
          ))}
          {[["Campaigns",campaigns.length],["Outreach",outreach.length],["Exhibitions",exhibitions.length]].map(([k,v]:any)=>(
            <div key={k} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{k}</p>
              <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
