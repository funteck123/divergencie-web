"use client";

import { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

// TKT-0180: real student/parent feedback (study/dc-feedbacks/), replacing
// the previous fabricated testimonials. Quotes are trimmed to a real,
// contiguous, self-contained excerpt from each -- no wording changed,
// nothing added. Badges deliberately say what's actually true (subject/
// role), not an invented grade outcome -- only Anas's parent explicitly
// confirms a result ("he passed his exam"), so that's the one badge tied
// to an outcome; the others don't claim one that wasn't stated.
const testimonials = [
  {
    quote: "I really love the way Mr. Akhtar teaches one concept. He doesn't just explain how we got the answer but also why we got the answer!",
    name: "Hamsini Uphadyayula",
    detail: "A Level Mathematics & Physics · DC Batch 8",
    initials: "HU",
    badge: "Student Feedback",
  },
  {
    quote: "There are no double thoughts about your teaching. I'm super happy with the way Ayaan has understood his topics and always praises you and says he loves learning from you.",
    name: "Ayaan Kanwar's Parent",
    detail: "IGCSE · DC Batch 4",
    initials: "AK",
    badge: "Parent Feedback",
  },
  {
    quote: "Anas joined IGCSE in 10th grade in the middle of the year, which was very tough for him, but with your dedication, he passed his exam. You are the best IGCSE teacher.",
    name: "Muhammad Anas's Parent",
    detail: "IGCSE · DC Batch 3",
    initials: "MA",
    badge: "Passed IGCSE",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((current + 1) % testimonials.length);
  const prev = () => setCurrent((current - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
    // `next` is recreated every render; including it below would restart
    // the interval on every unrelated re-render instead of only when
    // `current` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <section className="py-24 bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20">
          <div>
            <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
              THE RECEIPTS
            </p>
            <h2 className="text-4xl sm:text-6xl md:text-9xl font-black text-[var(--navy)] dark:text-white leading-[0.85] break-words w-full">
              DON&apos;T TAKE<br /><span className="text-[var(--gold)]">OUR WORD FOR IT.</span>
            </h2>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={prev}
              className="w-16 h-16 rounded-none border border-[var(--border-subtle)] flex items-center justify-center text-[var(--navy)] dark:text-white hover:bg-[var(--gold)] hover:text-white hover:border-[var(--gold)] transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={next}
              className="w-16 h-16 rounded-none border border-[var(--border-subtle)] flex items-center justify-center text-[var(--navy)] dark:text-white hover:bg-[var(--gold)] hover:text-white hover:border-[var(--gold)] transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div className="relative">
          <div 
            className="flex transition-transform duration-700 ease-in-out" 
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {testimonials.map((t, idx) => (
              <div key={idx} className="w-full flex-shrink-0 px-4">
                <div className="bg-white dark:bg-[var(--bg-secondary)] p-12 md:p-16 rounded-none shadow-[20px_20px_0px_var(--gold-light-bg)] dark:shadow-[20px_20px_0px_var(--gold)]/10 border border-[var(--border-subtle)] relative">
                  <Quote size={80} className="absolute top-10 right-10 text-[var(--gold)] opacity-10" />
                  
                  <div className="flex gap-1 mb-8">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} className="text-[var(--gold)] fill-[var(--gold)]" />
                    ))}
                  </div>

                  <blockquote className="text-2xl md:text-3xl font-black text-[var(--navy)] dark:text-white leading-tight mb-12">
                    &quot;{t.quote}&quot;
                  </blockquote>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-none bg-[var(--gold)] flex items-center justify-center text-white font-black text-xl">
                        {t.initials}
                      </div>
                      <div>
                        <p className="text-xl font-black text-[var(--navy)] dark:text-white">{t.name}</p>
                        <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">{t.detail}</p>
                      </div>
                    </div>
                    
                    <div className="px-6 py-3 rounded-none bg-[var(--gold-light-bg)] dark:bg-[var(--gold)]/20 border border-[var(--gold)] text-[var(--gold)] font-black text-xs uppercase tracking-[0.2em]">
                      {t.badge}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Indicators */}
        <div className="flex justify-center gap-3 mt-12">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-2 transition-all duration-300 rounded-none ${current === idx ? 'w-12 bg-[var(--gold)]' : 'w-2 bg-[var(--border-subtle)]'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
