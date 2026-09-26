"use strict";
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const D=JSON.parse($("#data").textContent);
const arrow='<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const flagI='<svg class="i" viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
const pauseI='<svg class="i" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>';
const playI='<svg class="i" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>';

/* ---------- papers with real content ---------- */
const PAPERS={
 "mcq-motion":{id:"mcq-motion",kind:"mcq",board:"IGCSE",subject:"Physics",chapter:"1.2 Motion",title:"Ch1.2 Motion (MCQ) Worksheet 1",sub:"Paper 2: Multiple Choice (Extended)",qs:D.papers["top:Physics:Ch1.2 Motion (MCQ) Worksheet 1"].q},
 "0625_s26_42":{id:"0625_s26_42",kind:"theory",board:"IGCSE",subject:"Physics",chapter:"Paper 42",title:"Physics May/June 2026 Paper 42",sub:"Paper 4: Theory (Extended)",qs:D.papers["0625_s26_42"].qs},
 "0625_m26_62":{id:"0625_m26_62",kind:"practical",board:"IGCSE",subject:"Physics",chapter:"Paper 62",title:"Physics Feb/March 2026 Paper 62",sub:"Paper 6: Alternative to Practical",qs:D.papers["0625_m26_62"].qs}
};
const KINDLAB={mcq:"Multiple choice",theory:"Theory",practical:"Practical"};
const kindOf=c=>/multiple choice/i.test(c)?"mcq":/practical|planning/i.test(c)?"practical":/theory|structured/i.test(c)?"theory":"other";
const minutesFor=p=>p.kind==="mcq"?Math.ceil(p.qs.length*1.5):p.qs.reduce((t,q)=>t+(q.marks||0),0);

/* ---------- storage ---------- */
const KEY="dcs-preview-v2";
let S;try{S=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){S=null}
if(!S)S={theme:"light",instant:true,attempts:[],mistakes:[],saves:{},nextId:1};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
document.documentElement.dataset.theme=S.theme;
const EX=[ /* labelled examples, replaced by real attempts */
 {ex:1,paperId:"mcq-motion",paper:"Ch1.2 Motion (MCQ) Worksheet 1",subject:"Physics",chapter:"1.2 Motion",mode:"test",score:9,total:15,secs:812,at:Date.now()-864e5*9},
 {ex:1,paperId:"0625_s26_42",paper:"Physics May/June 2026 Paper 42",subject:"Physics",chapter:"Paper 42",mode:"test",score:36,total:73,secs:5100,at:Date.now()-864e5*5},
 {ex:1,paperId:"mcq-motion",paper:"Ch1.2 Motion (MCQ) Worksheet 1",subject:"Physics",chapter:"1.2 Motion",mode:"test",score:12,total:15,secs:640,at:Date.now()-864e5*2}
];

/* ---------- helpers ---------- */
const app=$("#app");
let run=null,timerId=null;
const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return(h?h+":"+String(m).padStart(2,"0"):String(m).padStart(2,"0"))+":"+String(s%60).padStart(2,"0")};
const ago=t=>{const d=Math.round((Date.now()-t)/864e5);return d<1?"Today":d===1?"Yesterday":d+" days ago"};
function setNav(k){document.querySelectorAll("#links a").forEach(a=>{a.removeAttribute("aria-current");if(a.dataset.nav===k)a.setAttribute("aria-current","page")})}
function crumbs(l){return '<div class="crumbs">'+l.map((c,i)=>(i?'<span class="sep">/</span>':'')+(c[1]?`<a href="${c[1]}">${esc(c[0])}</a>`:`<span>${esc(c[0])}</span>`)).join("")+'</div>'}
function go(html,k){clearInterval(timerId);app.innerHTML=html;setNav(k||"");window.scrollTo(0,0);app.focus({preventScroll:true})}
function ask(title,text,yes,no){return new Promise(r=>{$("#dlgT").textContent=title;$("#dlgP").textContent=text;$("#dlgYes").textContent=yes||"OK";$("#dlgNo").textContent=no||"Cancel";const d=$("#dlg");d.showModal();$("#dlgNo").onclick=()=>{d.close();r(false)};$("#dlgYes").onclick=()=>{d.close();r(true)}})}
const G=(pid,n)=>D.grades[pid+":"+n];

/* ---------- grade result renderer (the auto-grader) ---------- */
function gradeHtml(g,opts={}){
  const a=g.marksAwarded,t=g.marksAvailable;
  const pips=(g.markBreakdown||[]).map(m=>`<i class="${m.awarded?"":"lost"}" title="${esc(m.markLabel)}"></i>`).join("");
  return `<div class="gscore"><div class="score">${a}<small>/${t}</small></div><div><p class="label">${a===t?"Full marks":"Marks awarded"}</p><p class="remark">${esc(g.remark)}</p></div></div>
  <div class="marks" aria-hidden="true">${pips}</div>
  <h3 style="font-size:14px;letter-spacing:.2em;color:var(--gold);margin:8px 0 0">Mark by mark</h3>
  <div style="border-top:2px solid var(--head);margin-top:12px">${(g.markBreakdown||[]).map(m=>`<div class="mk ${m.awarded?"ok":"lost"}"><div><span class="lab">${esc(m.markLabel)}</span><span class="st">${m.awarded?"Awarded":"Not awarded"}</span></div><div>${m.evidence?`<q>${esc(m.evidence)}</q>`:'<span class="label">Nothing in your answer for this mark</span>'}${!m.awarded&&m.whatWasNeeded?`<div class="need"><b class="label">Needed</b> ${esc(m.whatWasNeeded)}</div>`:""}</div></div>`).join("")}</div>
  ${(g.lineFeedback||[]).filter(l=>!l.correct).map(l=>`<div class="lf"><b>Your line</b> ${esc(l.step)}<br><b style="color:var(--coral)">Problem</b> ${esc(l.mistake)}${l.correctAlternative?`<br><b style="color:var(--sky)">Better</b> ${esc(l.correctAlternative)}`:""}</div>`).join("")}
  <details><summary>What a full-mark answer looks like</summary><p>${esc(g.fullMarkAnswer||"")}</p></details>`;
}

/* ---------- home ---------- */
function vHome(){
  go(`<section><div class="wrap">
   <p class="eyebrow">Question Solver</p>
   <h1>Write it.<br><span>Get marked.</span></h1>
   <p class="sub">Theory and practical answers marked mark by mark against the real Cambridge mark scheme.</p>
   <div class="actions" style="justify-content:flex-start;margin-top:40px"><a class="btn btn-gold" href="#/grader">Try the auto-grader ${arrow}</a><a class="btn btn-line" href="#pick">Browse papers</a></div>
  </div></section>
  <section style="background:var(--bg);border-top:1px solid var(--line);padding:56px 0"><div class="wrap"><div class="trio">
    <div><h3>1. Write</h3><p>Answer a real past paper question in your own words, with your working, just as you would in the exam.</p></div>
    <div><h3>2. Marked</h3><p>Every mark on the scheme is checked against your answer. You see the exact words that earned it.</p></div>
    <div><h3>3. Fix</h3><p>For each lost mark you see what was needed. Missed questions are saved to redo later.</p></div>
  </div></div></section>
  <section id="pick"><div class="wrap">
   <p class="eyebrow">Library</p><h2>Pick a <span>paper.</span></h2>
   <p class="sub">Three papers are loaded in this preview. The full library is listed below.</p>
   <div class="tiles" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
     ${Object.values(PAPERS).map(p=>`<a class="tile big" href="#/paper/${p.id}"><span class="label" style="color:var(--gold)">${KINDLAB[p.kind]}</span><span class="name" style="font-size:clamp(26px,3vw,36px)">${esc(p.title)}</span><span class="meta"><span>${p.qs.length} questions${p.kind!=="mcq"?", "+p.qs.reduce((t,q)=>t+q.marks,0)+" marks":""}</span><span class="go">${arrow}</span></span></a>`).join("")}
   </div>
   <div class="panel" style="margin-top:48px" id="picker"></div>
  </div></section>`,"home");
  picker();
}

/* library picker built from the real library */
function picker(){
  const P=$("#picker");const L=D.lib;
  const st={b:"IGCSE",s:"Physics",c:"Paper 4: Theory (Extended)",t:"yr",y:"",se:"",p:""};
  const opt=(arr,cur,f=x=>x)=>arr.map(x=>`<option value="${esc(Array.isArray(x)?x[0]:x)}" ${(Array.isArray(x)?x[0]:x)==cur?"selected":""}>${esc(f(Array.isArray(x)?x[1]:x))}</option>`).join("");
  function draw(){
    const subs=Object.keys(L[st.b]);if(!L[st.b][st.s])st.s=subs[0];
    const comps=Object.entries(L[st.b][st.s]).filter(([c,v])=>kindOf(c)!=="other"&&(v.top.length||v.yr.length)).map(([c])=>c);
    if(!comps.includes(st.c))st.c=comps[0];
    const cv=L[st.b][st.s][st.c]||{top:[],yr:[]};
    const both=cv.top.length&&cv.yr.length;
    if(!both)st.t=cv.yr.length?"yr":"top";
    let paperSel="";
    if(st.t==="top"){
      const list=cv.top.slice().sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));if(!list.includes(st.p))st.p=list[0]||"";
      paperSel=`<div class="fld"><label class="label" for="fp">Paper</label><select id="fp">${opt(list,st.p)}</select></div>`;
    }else{
      const ys=[...new Set(cv.yr.map(x=>x[0]))].sort((a,b)=>b-a);if(!ys.includes(+st.y))st.y=ys[0];
      const ses=[...new Set(cv.yr.filter(x=>x[0]==st.y).map(x=>x[1]))];if(!ses.includes(st.se))st.se=ses[0];
      const vs=cv.yr.filter(x=>x[0]==st.y&&x[1]==st.se);if(!vs.some(x=>x[3]==st.p))st.p=vs[0][3];
      paperSel=`<div class="fld"><label class="label" for="fy">Year</label><select id="fy">${opt(ys,+st.y)}</select></div><div class="fld"><label class="label" for="fs">Session</label><select id="fs">${opt(ses,st.se)}</select></div><div class="fld"><label class="label" for="fp">Paper</label><select id="fp">${opt(vs.map(x=>[x[3],"Paper "+x[2]]),st.p)}</select></div>`;
    }
    const key=st.t==="top"?null:st.p;
    const hit=Object.values(PAPERS).find(p=>st.t==="yr"?p.id===st.p:(st.s==="Physics"&&p.kind==="mcq"&&st.p===p.title));
    P.innerHTML=`<div class="sel-grid" style="margin-top:0">
      <div class="fld"><label class="label" for="fb">Board</label><select id="fb">${opt(Object.keys(L),st.b)}</select></div>
      <div class="fld"><label class="label" for="fsu">Subject</label><select id="fsu">${opt(subs,st.s)}</select></div>
      <div class="fld"><label class="label" for="fc">Component</label><select id="fc">${opt(comps,st.c)}</select></div>
      ${both?`<div class="fld"><label class="label" for="ft">Paper type</label><select id="ft">${opt([["top","Topical worksheets"],["yr","Past papers"]],st.t)}</select></div>`:""}
      ${paperSel}</div>
      <div class="actions" style="justify-content:flex-start;margin-top:28px">${hit?`<a class="btn btn-gold" href="#/paper/${hit.id}">Open this paper ${arrow}</a>`:`<button class="btn btn-gold" disabled>Open this paper</button><span class="status">Not loaded in this preview. The live tool opens it.</span>`}</div>`;
    const on=(id,f)=>{const e=$("#"+id,P);if(e)e.onchange=()=>{f(e.value);draw()}};
    on("fb",v=>{st.b=v;st.c="";st.p=""});on("fsu",v=>{st.s=v;st.c="";st.p=""});on("fc",v=>{st.c=v;st.p=""});on("ft",v=>{st.t=v;st.p=""});
    on("fy",v=>{st.y=v;st.se="";st.p=""});on("fs",v=>{st.se=v;st.p=""});on("fp",v=>{st.p=v});
  }
  draw();
}

/* ---------- auto-grader page ---------- */
let gSel="theory";
function vGrader(kind){
  if(kind)gSel=kind;
  const p=PAPERS[gSel==="theory"?"0625_s26_42":"0625_m26_62"],qn="4",q=p.qs.find(x=>x.n===qn),g=G(p.id,qn);
  go(`<section><div class="wrap">${crumbs([["Solver","#/"],["Auto-grader"]])}
   <p class="eyebrow">Auto-grader</p><h2>Marked like an <span>examiner.</span></h2>
   <p class="sub">Real question. Real mark scheme. Real output from the live grader.</p>
   <div class="tabs" role="tablist" style="margin-top:40px"><button role="tab" aria-selected="${gSel==="theory"}" data-k="theory">Theory</button><button role="tab" aria-selected="${gSel==="practical"}" data-k="practical">Practical</button></div>
   <div class="split">
     <div><span class="label">${esc(p.title)}, question ${qn}, ${q.marks} marks</span><img class="qimg" style="margin-top:12px" alt="Question ${qn} from ${esc(p.title)}" src="${q.img}"></div>
     <div><label class="label" for="ga">Your answer</label><textarea id="ga" style="margin-top:12px;min-height:280px">${esc(g._answer)}</textarea>
       <div class="actions" style="justify-content:flex-start"><button class="btn btn-gold" id="gb">Mark my answer</button><span class="status" id="gs">This is a real answer we already marked. Edit it and the note below explains what the preview can do.</span></div></div>
   </div>
   <div id="gout" style="margin-top:56px" aria-live="polite"></div>
  </div></section>`,"grader");
  app.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>vGrader(b.dataset.k));
  $("#gb").onclick=()=>{
    const out=$("#gout");
    if($("#ga").value.trim()!==g._answer.trim()){out.innerHTML=`<div class="note"><span>The preview holds the saved marking for the sample answer only. The live Question Solver marks any answer you write. Restore the sample to see its full marking.</span><button id="rs">Restore sample</button></div>`;$("#rs").onclick=()=>{$("#ga").value=g._answer;out.innerHTML=""};return}
    out.innerHTML='<p class="label">Marking against the mark scheme<span class="dots"><i></i><i></i><i></i></span></p>';
    setTimeout(()=>{out.innerHTML=gradeHtml(g);out.scrollIntoView({behavior:"smooth",block:"start"})},1100);
  };
}

/* ---------- paper: mode choice ---------- */
function vPaper(id){
  const p=PAPERS[id];if(!p)return vHome();
  const sv=S.saves[id];
  go(`<section><div class="wrap">${crumbs([["Solver","#/"],[p.board,"#/"],[p.subject,"#/"],[p.title]])}
   <p class="eyebrow">${KINDLAB[p.kind]}, ${esc(p.sub)}</p><h2>${esc(p.title)}</h2>
   <p class="sub">${p.qs.length} questions${p.kind!=="mcq"?", "+p.qs.reduce((t,q)=>t+q.marks,0)+" marks":""}</p>
   ${sv?`<div class="note" style="margin-top:32px"><span>You have an unfinished ${sv.mode} saved ${ago(sv.at).toLowerCase()}.</span><button id="rsm">Resume it</button></div>`:""}
   <div class="modes">
    <button class="mode" data-mode="practice"><span class="label">No timer, no score</span><span class="n">Practice</span><p>${p.kind==="mcq"?"Read each question, then reveal the correct answer.":"Read each question, then open the mark scheme crop beside it."}</p><span class="btn btn-navy sm" style="align-self:flex-start">Start practice ${arrow}</span></button>
    <button class="mode" data-mode="test"><span class="label">Timed, one submission</span><span class="n">Test</span><p>${p.kind==="mcq"?"Choose A to D. Your score and the review come at the end.":"Write every answer. Each one is auto-graded mark by mark."}</p><span class="btn btn-gold sm" style="align-self:flex-start">Start test ${arrow}</span></button>
   </div></div></section>`,"home");
  app.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{location.hash="#/run/"+id+"/"+b.dataset.mode});
  const r=$("#rsm");if(r)r.onclick=()=>{location.hash="#/run/"+id+"/"+sv.mode+"/resume"};
}

/* ---------- run ---------- */
function startRun(id,mode,resume){
  const p=id==="mistakes"?mistakesPaper():PAPERS[id];if(!p)return vHome();
  const n=p.qs.length,sv=S.saves[id];
  run={p,mode,ans:p.qs.map(()=>null),flag:p.qs.map(()=>false),graded:{},tab:p.qs.map(()=>"q"),paused:false,elapsed:0,last:Date.now(),checked:{}};
  if(resume&&sv&&sv.mode===mode){run.ans=sv.ans;run.flag=sv.flag;run.elapsed=sv.elapsed}
  vRun();
  timerId=setInterval(tick,1000);
  window.onpagehide=persist;
}
function tick(){if(!run||run.paused)return;run.elapsed++;const t=$("#tm");if(t)t.textContent=fmt(run.elapsed);if(run.elapsed%5===0)persist()}
function persist(){if(!run||run.p.id==="mistakes"||run.mode!=="test"&&!run.ans.some(a=>a!=null))return;S.saves[run.p.id]={mode:run.mode,ans:run.ans,flag:run.flag,elapsed:run.elapsed,at:Date.now()};save()}
function mistakesPaper(){
  const qs=S.mistakes.filter(m=>PAPERS[m.paperId]&&PAPERS[m.paperId].kind==="mcq").map(m=>({...PAPERS[m.paperId].qs.find(q=>q.n===m.n),_m:m.key}));
  return {id:"mistakes",kind:"mcq",board:"",subject:"Mixed",chapter:"",title:"Mistakes Mode",sub:"Questions you missed",qs}
}
function cardHtml(i){
  const r=run,p=r.p,q=p.qs[i],test=r.mode==="test",mcq=p.kind==="mcq";
  const head=`<div class="qhead"><span class="label">Question ${esc(q.n)}${!mcq?", "+q.marks+" marks":""}</span>${test?`<button class="flagbtn" data-flag="${i}" aria-pressed="${r.flag[i]}">${flagI} ${r.flag[i]?"Flagged":"Flag"}</button>`:""}</div>`;
  let body="";
  if(mcq){
    if(test){
      const chk=r.checked[i];
      body=`<img class="qimg" alt="Question ${esc(q.n)}" src="${q.img}"><div class="opts row4" style="margin-top:16px" role="group" aria-label="Answer">${"ABCD".split("").map(L=>`<button class="opt${r.ans[i]===L?" sel":""}${chk&&L===q.ans?" right":""}${chk&&r.ans[i]===L&&L!==q.ans?" wrong":""}" data-a="${i}:${L}"><span class="k">${L}</span></button>`).join("")}</div>
      ${S.instant?`<div style="margin-top:12px"><button class="btn btn-line sm" data-chk="${i}">Check answer</button></div>`:""}
      ${chk?`<div class="verdict ${r.ans[i]===q.ans?"ok":"no"}">${r.ans[i]==null?"Select an answer first":r.ans[i]===q.ans?"Correct":"Not quite. The answer is "+q.ans}</div>`:""}`;
    }else{
      body=`<div class="tabs" role="tablist"><button role="tab" aria-selected="${r.tab[i]==="q"}" data-tab="${i}:q">Question</button><button role="tab" aria-selected="${r.tab[i]==="a"}" data-tab="${i}:a">Answer</button></div>${r.tab[i]==="q"?`<img class="qimg" alt="Question ${esc(q.n)}" src="${q.img}">`:`<div class="panel" style="padding:24px"><span class="label">Correct answer</span><div class="score" style="font-size:72px;margin-top:8px">${q.ans}</div></div>`}`;
    }
  }else{
    if(test){
      const g=G(p.id,q.n),done=r.graded[i];
      body=`<img class="qimg" alt="Question ${esc(q.n)}" src="${q.img}">
       <label class="label" for="ta${i}" style="display:block;margin-top:20px">Write your full working here</label>
       <textarea id="ta${i}" data-ta="${i}" placeholder="Type your answer. Include every step and give units.">${esc(r.ans[i]||"")}</textarea>
       <div class="actions" style="justify-content:flex-start;margin-top:12px"><button class="btn btn-gold sm" data-sub="${i}">Submit answer</button>${g?`<button class="btn btn-line sm" data-sample="${i}">Use sample answer</button>`:""}<span class="status">${done?(done==="stale"?"Answer changed since last submit":"Marked"):"Not submitted yet"}</span></div>
       <div id="gr${i}" style="margin-top:28px">${done==="ok"?gradeHtml(g):done==="pending"?'<p class="label">Marking<span class="dots"><i></i><i></i><i></i></span></p>':done==="note"?'<div class="note"><span>The preview holds real marking for question 4 only. The live tool marks every question.</span></div>':""}</div>`;
    }else{
      body=`<div class="tabs" role="tablist"><button role="tab" aria-selected="${r.tab[i]==="q"}" data-tab="${i}:q">Question</button><button role="tab" aria-selected="${r.tab[i]==="a"}" data-tab="${i}:a">Mark scheme</button></div>${r.tab[i]==="q"||!q.ms?`<img class="qimg" alt="Question ${esc(q.n)}" src="${q.img}">${r.tab[i]==="a"&&!q.ms?'<p class="status" style="margin-top:12px">Mark scheme crop unavailable for this question</p>':""}`:`<img class="qimg" alt="Mark scheme for question ${esc(q.n)}" src="${q.ms}">`}`;
    }
  }
  return `<article class="panel qcard${r.flag[i]?" flagged":""}" id="q${i}">${head}${body}</article>`;
}
function stickyHtml(){
  const r=run,p=r.p,test=r.mode==="test";
  const flagged=r.flag.map((f,i)=>f?i:-1).filter(i=>i>=0);
  return `<div class="sticky"><div class="wrap" style="max-width:960px;padding:0"><div class="runbar" style="margin:0"><div><span class="label">${test?"Test":"Practice"}, ${esc(p.title)}</span><div class="timer" id="tm" aria-label="Time">${fmt(r.elapsed)}</div></div>
   <div class="grp"><button class="btn btn-line sm" id="pz">${r.paused?playI+" Resume":pauseI+" Pause"}</button>${test?`<button class="btn btn-gold sm" id="done">Submit ${p.kind==="mcq"?"quiz":"test"}</button>`:`<button class="btn btn-navy sm" id="done">Done practicing</button>`}<button class="btn btn-line sm" id="cx">Cancel</button></div></div>
   <div class="chips" aria-label="Questions">${p.qs.map((q,i)=>`<a href="#q${i}" data-jump="${i}" class="${r.ans[i]?"done":""}${r.flag[i]?" flag":""}">${esc(q.n)}</a>`).join("")}</div>
   ${flagged.length?`<p class="status" style="margin-top:10px">Flagged for review: ${flagged.map(i=>`<a href="#q${i}" data-jump="${i}" style="color:var(--coral)">Q${esc(p.qs[i].n)}</a>`).join(", ")}</p>`:""}</div></div>`;
}
function vRun(keepScroll){
  const r=run,p=r.p,y=window.scrollY;
  go(`<section style="padding-top:24px"><div class="wrap" style="max-width:960px">${stickyHtml()}
    ${p.kind==="mcq"&&r.mode==="test"?`<label class="tglrow" style="margin-bottom:20px"><input type="checkbox" id="inst" ${S.instant?"checked":""}> Show if I am right after each question</label>`:""}
    ${r.paused?`<div class="pause"><div><h2 style="font-size:40px">Paused</h2><p class="sub">Your time is stopped and the questions are hidden.</p><button class="btn btn-gold" id="pz2" style="margin-top:24px">Resume</button></div></div>`:""}
    <div id="cards">${p.qs.map((_,i)=>cardHtml(i)).join("")}</div>
  </div></section>`,"home");
  if(keepScroll)window.scrollTo(0,y);
  wire();
}
function wire(){
  const r=run,q=r.p.qs;
  const rerender=()=>vRun(true);
  const pz=()=>{r.paused=!r.paused;rerender()};
  $("#pz").onclick=pz;const p2=$("#pz2");if(p2)p2.onclick=pz;
  $("#cx").onclick=async()=>{if(await ask("Cancel this attempt?","Nothing is saved to your progress.","Cancel attempt","Keep going")){delete S.saves[r.p.id];save();run=null;location.hash="#/paper/"+r.p.id}};
  $("#done").onclick=async()=>{if(r.mode==="test"){const open=r.ans.filter(a=>!a).length;if(!(await ask("Submit your "+(r.p.kind==="mcq"?"quiz":"test")+"?",open?open+" unanswered. Unanswered questions score zero.":"Every question has an answer.","Submit","Keep going")))return}finish()};
  const i=$("#inst");if(i)i.onchange=()=>{S.instant=i.checked;save();rerender()};
  app.querySelectorAll("[data-jump]").forEach(a=>a.onclick=e=>{e.preventDefault();document.getElementById("q"+a.dataset.jump).scrollIntoView({behavior:"smooth",block:"start"})});
  app.querySelectorAll("[data-flag]").forEach(b=>b.onclick=()=>{r.flag[+b.dataset.flag]=!r.flag[+b.dataset.flag];persist();rerender()});
  app.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{const[k,L]=b.dataset.a.split(":");r.ans[+k]=L;persist();rerender()});
  app.querySelectorAll("[data-chk]").forEach(b=>b.onclick=()=>{r.checked[+b.dataset.chk]=true;rerender()});
  app.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{const[k,t]=b.dataset.tab.split(":");r.tab[+k]=t;rerender()});
  app.querySelectorAll("[data-ta]").forEach(t=>t.oninput=()=>{const k=+t.dataset.ta;r.ans[k]=t.value;if(r.graded[k]==="ok")r.graded[k]="stale";persist()});
  app.querySelectorAll("[data-sample]").forEach(b=>b.onclick=()=>{const k=+b.dataset.sample;r.ans[k]=G(r.p.id,q[k].n)._answer;rerender()});
  app.querySelectorAll("[data-sub]").forEach(b=>b.onclick=()=>{
    const k=+b.dataset.sub,g=G(r.p.id,q[k].n),ta=$("#ta"+k);r.ans[k]=ta.value;
    if(!ta.value.trim())return;
    if(g&&ta.value.trim()===g._answer.trim()){r.graded[k]="pending";rerender();setTimeout(()=>{if(run){r.graded[k]="ok";rerender()}},1100)}
    else{r.graded[k]="note";rerender()}
  });
}
function finish(){
  const r=run;if(!r)return;clearInterval(timerId);
  const p=r.p,n=p.qs.length;let score=0,total=0;const review=[];
  p.qs.forEach((q,i)=>{
    if(p.kind==="mcq"){total++;const ok=r.ans[i]===q.ans;if(ok){score++;if(q._m)S.mistakes=S.mistakes.filter(m=>m.key!==q._m)}else if(r.mode==="test"&&!q._m&&r.ans[i]){const key=p.id+":"+q.n;if(!S.mistakes.some(m=>m.key===key))S.mistakes.push({key,paperId:p.id,n:q.n,subject:p.subject,chapter:p.chapter})}review.push({n:q.n,you:r.ans[i],right:q.ans,ok})}
    else{total+=q.marks;const g=G(p.id,q.n),graded=r.graded[i]==="ok"&&g;const m=graded?g.marksAwarded:0;score+=m;review.push({n:q.n,marks:q.marks,got:graded?m:null,ans:r.ans[i]})}
  });
  if(r.mode==="test"||p.kind!=="mcq"||true){
    const at={id:S.nextId++,paperId:p.id,paper:p.title,subject:p.subject,chapter:p.chapter,mode:r.mode,kind:p.kind,score:r.mode==="test"?score:null,total,secs:r.elapsed,at:Date.now(),review};
    S.attempts.push(at);delete S.saves[p.id];save();run=null;location.hash="#/result/"+at.id;
  }
}
function vResult(id){
  const a=S.attempts.find(x=>x.id===+id);if(!a)return vProgress();
  const test=a.mode==="test",pct=a.total?Math.round((a.score||0)/a.total*100):0;
  go(`<section><div class="wrap" style="max-width:860px">${crumbs([["Solver","#/"],["Result"]])}
   <p class="eyebrow">${esc(a.paper)}</p>
   ${test?`<div class="score">${a.score}<small>/${a.total}</small></div>`:`<h2>Practice <span>saved.</span></h2>`}
   <div class="stats">${test?`<div><b>${pct}%</b><span class="label">Score</span></div>`:""}<div><b>${fmt(a.secs)}</b><span class="label">Time taken</span></div><div><b>${test?"Test":"Practice"}</b><span class="label">Mode</span></div></div>
   ${a.kind!=="mcq"&&test?`<p class="status" style="margin-bottom:24px">Only the questions you submitted and that were marked count. The preview marks question 4.</p>`:""}
   <div class="actions" style="justify-content:flex-start;margin:0 0 48px"><a class="btn btn-gold" href="#/progress">See my progress</a><a class="btn btn-line" href="#/">Back to solver</a></div>
   <h3 style="font-size:14px;letter-spacing:.2em;color:var(--gold)">Review</h3>
   <div class="review">${a.review.map(r=>a.kind==="mcq"||!a.kind?`<div class="rv"><span class="n">${esc(r.n)}</span><div><div class="a"><em class="${r.ok?"ok":"no"}">${r.ok?"Correct":r.you?"Not quite":"Not answered"}</em> &nbsp; ${r.you?"You chose "+r.you+". ":""}${r.ok?"":"Answer: "+r.right+"."}</div></div></div>`:`<div class="rv"><span class="n">${esc(r.n)}</span><div><div class="q">${r.got==null?"Not marked":r.got+" of "+r.marks+" marks"}</div><div class="a">${r.ans?esc(r.ans).slice(0,160)+(r.ans.length>160?"...":""):"No answer"}</div></div></div>`).join("")}</div>
  </div></section>`,"home");
}

/* ---------- progress ---------- */
let pf={subject:"",chapter:""};
function vProgress(){
  const real=S.attempts.filter(a=>a.mode==="test"),ex=!real.length;
  let all=(ex?EX:real).slice();
  const subs=[...new Set(all.map(a=>a.subject))],chs=[...new Set(all.filter(a=>!pf.subject||a.subject===pf.subject).map(a=>a.chapter))];
  if(pf.subject&&!subs.includes(pf.subject))pf.subject="";if(pf.chapter&&!chs.includes(pf.chapter))pf.chapter="";
  const view=all.filter(a=>(!pf.subject||a.subject===pf.subject)&&(!pf.chapter||a.chapter===pf.chapter));
  const W=760,H=260,pl=44,pb=34,pt=20,pr=20;
  const xy=(i,v,n)=>[pl+(n<2?(W-pl-pr)/2:i*(W-pl-pr)/(n-1)),H-pb-(H-pb-pt)*v/100];
  const pts=view.map((a,i)=>xy(i,a.score/a.total*100,view.length));
  const cohort=view.map((a,i)=>xy(i,55+((i*17)%13),view.length));
  const path=ps=>ps.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const grid=[0,50,100].map(v=>{const y=H-pb-(H-pb-pt)*v/100;return `<line class="grid" x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}"/><text x="${pl-8}" y="${y+4}" text-anchor="end">${v}</text>`}).join("");
  const mc={};(ex?[{chapter:"1.2 Motion",subject:"Physics",n:5},{chapter:"1.1 Length & Time",subject:"Physics",n:2},{chapter:"Paper 42",subject:"Physics",n:3}]:S.mistakes.map(m=>({...m,n:1}))).forEach(m=>{mc[m.chapter]=(mc[m.chapter]||0)+m.n});
  const mmax=Math.max(1,...Object.values(mc));
  go(`<section><div class="wrap">${crumbs([["Solver","#/"],["Progress"]])}
   <p class="eyebrow">Progress</p><h2>Your <span>scores.</span></h2>
   ${ex?`<div class="note" style="margin-top:32px"><span>These are example scores, not yours. Finish a test and they are replaced.</span></div>`:""}
   <div class="sel-grid" style="max-width:640px"><div class="fld"><label class="label" for="pfs">Subject</label><select id="pfs"><option value="">All subjects</option>${subs.map(s=>`<option ${s===pf.subject?"selected":""}>${esc(s)}</option>`).join("")}</select></div><div class="fld"><label class="label" for="pfc">Chapter</label><select id="pfc" ${pf.subject?"":"disabled"}><option value="">All chapters</option>${chs.map(s=>`<option ${s===pf.chapter?"selected":""}>${esc(s)}</option>`).join("")}</select></div></div>
   <div class="kpis"><div><b>${view.length}</b><span class="label">Test attempts</span></div><div><b>${view.length?Math.round(view.reduce((t,a)=>t+a.score/a.total,0)/view.length*100):0}%</b><span class="label">Average</span></div><div><b>${view.length?Math.round(Math.max(...view.map(a=>a.score/a.total))*100):0}%</b><span class="label">Best</span></div></div>
   <svg class="linechart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Score percentage for each test attempt">${grid}${view.length>1?`<path class="all" d="${path(cohort)}"/>`:""}<path class="me" d="${path(pts)}"/>${pts.map(p=>`<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="5"/>`).join("")}</svg>
   <p class="status" style="margin-top:8px">Solid line: you. Dashed line: everyone else, average score.</p>
   <h3 style="font-size:14px;letter-spacing:.2em;color:var(--gold);margin-top:56px">Attempt history</h3>
   <div class="hist"><table><thead><tr><th>Paper</th><th>Mode</th><th>Chapter</th><th>Score</th><th>%</th><th>Time</th><th>When</th></tr></thead><tbody>${(view.length?view:[]).slice().reverse().map(a=>`<tr><td>${esc(a.paper)}</td><td>${a.mode==="test"?"Test":"Practice"}</td><td>${esc(a.chapter)}</td><td>${a.score}/${a.total}</td><td>${Math.round(a.score/a.total*100)}%</td><td>${fmt(a.secs)}</td><td>${ago(a.at)}</td></tr>`).join("")||'<tr><td colspan="7">No attempts for this filter.</td></tr>'}</tbody></table></div>
   <h3 style="font-size:14px;letter-spacing:.2em;color:var(--gold);margin-top:56px">Mistakes by chapter</h3>
   <div style="margin-top:12px;border-top:2px solid var(--head)">${Object.keys(mc).map(c=>`<div class="bar-h"><span title="${esc(c)}">${esc(c)}</span><i style="width:${mc[c]/mmax*100}%"></i><span>${mc[c]}</span></div>`).join("")||'<p class="status" style="padding:16px 0">No mistakes saved yet.</p>'}</div>
   <h3 style="font-size:14px;letter-spacing:.2em;color:var(--gold);margin-top:56px">Leaderboard <span class="tag-new">Example names</span></h3>
   <div class="lb" style="margin-top:12px"><div><span class="label">By average score</span><table><tbody>${[["Student A","84%"],["Student B","79%"],["You",ex?"71%":Math.round(view.reduce((t,a)=>t+a.score/a.total,0)/Math.max(1,view.length)*100)+"%"]].map((r,i)=>`<tr><td>${i+1}</td><td>${r[0]}</td><td class="r">${r[1]}</td></tr>`).join("")}</tbody></table></div><div><span class="label">By questions correct</span><table><tbody>${[["Student B","212"],["Student A","190"],["You",ex?"46":String(view.reduce((t,a)=>t+a.score,0))]].map((r,i)=>`<tr><td>${i+1}</td><td>${r[0]}</td><td class="r">${r[1]}</td></tr>`).join("")}</tbody></table></div></div>
  </div></section>`,"progress");
  $("#pfs").onchange=e=>{pf.subject=e.target.value;pf.chapter="";vProgress()};$("#pfc").onchange=e=>{pf.chapter=e.target.value;vProgress()};
}
function vMistakes(){
  const list=S.mistakes.filter(m=>PAPERS[m.paperId]);
  go(`<section><div class="wrap" style="max-width:860px">${crumbs([["Solver","#/"],["Mistakes"]])}
   <p class="eyebrow">Mistakes</p><h2>Redo what <span>you missed.</span></h2>
   ${list.length?`<div class="actions" style="justify-content:flex-start;margin:32px 0 0"><a class="btn btn-gold" href="#/run/mistakes/test">Redo ${list.length} ${arrow}</a></div><div class="rows">${list.map(m=>`<div class="row"><div><div class="t">${esc(m.chapter)}, question ${esc(m.n)}</div><div class="m">${esc(PAPERS[m.paperId].title)}</div></div></div>`).join("")}</div>`:`<div class="empty"><p>Nothing saved yet. Answer a multiple choice test and the questions you miss land here. Getting one right in Mistakes Mode clears it.</p><a class="btn btn-navy sm" href="#/paper/mcq-motion">Open the Motion worksheet</a></div>`}
  </div></section>`,"mistakes");
}

/* ---------- router ---------- */
function route(){
  const raw=location.hash.replace(/^#\/?/,"").split("/").filter(Boolean).map(decodeURIComponent);
  $("#links").classList.remove("open");$("#menu").setAttribute("aria-expanded","false");
  const[a,b,c,d]=raw;
  if(!a||a==="pick")return vHome();
  if(a==="grader")return vGrader();
  if(a==="paper")return vPaper(b);
  if(a==="run")return startRun(b,c||"practice",d==="resume");
  if(a==="result")return vResult(b);
  if(a==="progress")return vProgress();
  if(a==="mistakes")return vMistakes();
  vHome();
}
window.addEventListener("hashchange",()=>{if(location.hash==="#pick")return;route()});
$("#theme").onclick=()=>{S.theme=S.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=S.theme;save()};
$("#menu").onclick=()=>{const l=$("#links"),o=l.classList.toggle("open");$("#menu").setAttribute("aria-expanded",o)};
route();
