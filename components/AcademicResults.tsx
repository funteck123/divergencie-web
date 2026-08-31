"use client";

const resultsData = [
  { subject: "Mathematics", percent: 96, label: "A*–A" },
  { subject: "Physics", percent: 92, label: "A*–A" },
  { subject: "Chemistry", percent: 89, label: "A*–A" },
  { subject: "Economics", percent: 94, label: "A*–A" },
  { subject: "English Language", percent: 88, label: "A*–A" },
  { subject: "IELTS", percent: 91, label: "Band 7.5+" },
];

export default function AcademicResults() {
  return (
    <section id="results" className="py-24 bg-[var(--bg-primary)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-20 items-start mb-20">
          <div>
            <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
              THE PROOF
            </p>
            <h2 className="text-7xl md:text-9xl font-black text-[var(--navy)] dark:text-white leading-[0.85] mb-8">
              OUR<br /><span className="text-[var(--gold)]">RESULTS.</span>
            </h2>
            <p className="text-sm font-black tracking-[0.2em] text-[var(--text-muted)] uppercase">
              2025–26 COHORT. REAL STUDENTS. REAL A*S. NO AIRBRUSHING.
            </p>
          </div>

          <div className="space-y-10">
            {resultsData.map((res, idx) => (
              <div key={idx} className="group">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-wider">{res.subject}</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-[var(--navy)] dark:text-white">{res.percent}%</span>
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{res.label}</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-none overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--sky)] to-[var(--gold)] rounded-none transition-all duration-1000 group-hover:brightness-110" 
                    style={{ width: `${res.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
