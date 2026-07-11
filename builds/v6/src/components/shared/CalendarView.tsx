"use client";

import { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Layers, 
  Check, 
  RefreshCw,
  Info,
  CalendarCheck,
  List
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarItem {
  id: string;
  entityType: string;
  entityId: string;
  userId: string;
  startTime: string;
  endTime: string;
  title: string;
  colour: string | null;
  status: string;
  addedToGCal: boolean;
  gCalSyncedAt: string | null;
  gCalEventId: string | null;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  ACADEMIC_SESSION: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900/50",
    dot: "bg-blue-500",
  },
  MEETING: {
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-900/50",
    dot: "bg-indigo-500",
  },
  AMBASSADOR_MEETING: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900/50",
    dot: "bg-amber-500",
  },
  GENERAL_MEETING: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-900/50",
    dot: "bg-purple-500",
  },
  TASK_DUE: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-900/50",
    dot: "bg-rose-500",
  },
  MOCK: {
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-900/30",
    dot: "bg-yellow-500",
  },
};

const DEFAULT_COLOR = {
  bg: "bg-gray-50 dark:bg-gray-900/30",
  text: "text-gray-700 dark:text-gray-400",
  border: "border-gray-200 dark:border-gray-800",
  dot: "bg-gray-500",
};

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendarItems = async () => {
    try {
      setLoading(true);
      // Fetch calendar items for the current month plus safety bounds
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month + 2, 0).toISOString();
      const res = await fetch(`/api/calendar?start=${start}&end=${end}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch calendar items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarItems();
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToggleGCal = async (item: CalendarItem) => {
    try {
      setSyncingId(item.id);
      const res = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          addedToGCal: !item.addedToGCal,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
        if (selectedItem?.id === item.id) {
          setSelectedItem(updated);
        }
      }
    } catch (err) {
      console.error("Failed to toggle GCal sync:", err);
    } finally {
      setSyncingId(null);
    }
  };

  // Helper arrays for building the calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday...
  
  // Align grid starting with Monday
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const gridCells = [];
  // Previous month padding days
  for (let i = startOffset - 1; i >= 0; i--) {
    gridCells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month padding days to complete a 6-week grid (42 cells)
  const remainingCells = 42 - gridCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    gridCells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const getItemsForDate = (date: Date) => {
    return items.filter((item) => {
      const itemDate = new Date(item.startTime);
      return (
        itemDate.getDate() === date.getDate() &&
        itemDate.getMonth() === date.getMonth() &&
        itemDate.getFullYear() === date.getFullYear() &&
        (selectedType === "ALL" || item.entityType === selectedType)
      );
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const uniqueTypes = ["ALL", ...Array.from(new Set(items.map((x) => x.entityType)))];

  const filteredListItems = items.filter((item) => {
    const itemDate = new Date(item.startTime);
    const isSameMonth = itemDate.getMonth() === month && itemDate.getFullYear() === year;
    return isSameMonth && (selectedType === "ALL" || item.entityType === selectedType);
  });

  return (
    <div className="bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold-light-bg)] dark:bg-white/5 flex items-center justify-center text-[var(--gold)]">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--navy)] dark:text-white leading-none">
              {monthNames[month]} {year}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Manage classes, sessions, and meetings
            </p>
          </div>
        </div>

        {/* View mode toggle & month controls */}
        <div className="flex items-center gap-3">
          <div className="flex border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-white dark:bg-[var(--bg-primary)]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-all ${
                viewMode === "grid"
                  ? "bg-[var(--gold)] text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5"
              }`}
              title="Grid view"
            >
              <CalendarIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-all ${
                viewMode === "list"
                  ? "bg-[var(--gold)] text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5"
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1 border border-[var(--border-subtle)] rounded-lg bg-white dark:bg-[var(--bg-primary)] p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 text-[var(--text-muted)] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded transition-all"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 text-[var(--text-muted)] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and stats row */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-secondary)] flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mr-2 flex items-center gap-1">
          <Layers size={12} />
          Filter:
        </span>
        {uniqueTypes.map((type) => {
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                isSelected
                  ? "bg-[var(--gold)] text-white border-[var(--gold)] shadow-md shadow-[var(--gold)]/10"
                  : "bg-white dark:bg-[var(--bg-primary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5"
              }`}
            >
              {type.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* Main Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
          {/* Day Names */}
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 dark:bg-[var(--bg-primary)]/10"
            >
              {day}
            </div>
          ))}

          {/* Grid Cells */}
          {gridCells.map(({ date, isCurrentMonth }, idx) => {
            const dateItems = getItemsForDate(date);
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div
                key={idx}
                className={`min-h-[120px] p-2 border-r border-t border-[var(--border-subtle)] flex flex-col justify-between transition-colors ${
                  isCurrentMonth 
                    ? "bg-white dark:bg-[var(--bg-secondary)]" 
                    : "bg-gray-50/50 dark:bg-gray-950/20 text-gray-400"
                } ${isToday ? "ring-2 ring-[var(--gold)] ring-inset" : ""}`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? "bg-[var(--gold)] text-white"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {dateItems.length > 0 && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--gold)] bg-[var(--gold-light-bg)] dark:bg-white/5 border border-[var(--border-subtle)] px-1 rounded-sm">
                      {dateItems.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 mt-2 space-y-1 overflow-hidden max-h-[80px]">
                  {dateItems.slice(0, 3).map((item) => {
                    const styling = TYPE_COLORS[item.entityType] || DEFAULT_COLOR;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`w-full text-left px-2 py-1 rounded border ${styling.bg} ${styling.text} ${styling.border} transition-all duration-150 hover:brightness-95 active:scale-[0.98] block`}
                      >
                        <p className="text-[10px] font-bold truncate leading-tight">
                          {item.title}
                        </p>
                      </button>
                    );
                  })}
                  {dateItems.length > 3 && (
                    <button
                      onClick={() => setSelectedItem({ ...dateItems[3], title: `+ ${dateItems.length - 3} more items` })}
                      className="w-full text-center py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-colors block"
                    >
                      + {dateItems.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Agenda View */
        <div className="divide-y divide-[var(--border-subtle)] max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-[var(--gold)]" />
            </div>
          ) : filteredListItems.length === 0 ? (
            <div className="text-center py-16 px-4">
              <CalendarIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
              <p className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">
                No Events Found
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                There are no scheduled items for this filter in the current month.
              </p>
            </div>
          ) : (
            filteredListItems.map((item) => {
              const styling = TYPE_COLORS[item.entityType] || DEFAULT_COLOR;
              const date = new Date(item.startTime);
              return (
                <div
                  key={item.id}
                  className="p-5 flex items-start justify-between gap-4 hover:bg-[var(--bg-secondary)]/50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col items-center justify-center p-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        {date.toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <span className="text-base font-black text-[var(--navy)] dark:text-white leading-none mt-0.5">
                        {date.getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${styling.bg} ${styling.text} ${styling.border}`}>
                          {item.entityType.replace("_", " ")}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded-sm">
                          {item.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white mt-2">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} - {new Date(item.endTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleGCal(item)}
                      disabled={syncingId === item.id}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                        item.addedToGCal
                          ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/40"
                          : "bg-white dark:bg-[var(--bg-primary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5"
                      }`}
                    >
                      {syncingId === item.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : item.addedToGCal ? (
                        <>
                          <Check size={12} />
                          Synced
                        </>
                      ) : (
                        <>
                          <CalendarCheck size={12} />
                          Sync GCal
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="p-2 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-colors"
                    >
                      <Info size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal for Event Details */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]/40 flex justify-between items-start">
                <div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${TYPE_COLORS[selectedItem.entityType]?.bg || DEFAULT_COLOR.bg} ${TYPE_COLORS[selectedItem.entityType]?.text || DEFAULT_COLOR.text} ${TYPE_COLORS[selectedItem.entityType]?.border || DEFAULT_COLOR.border}`}>
                    {selectedItem.entityType.replace("_", " ")}
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--navy)] dark:text-white mt-2 leading-tight">
                    {selectedItem.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-black dark:hover:text-white transition-all"
                >
                  <ChevronRight className="rotate-45" size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      Start Time
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)] mt-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-[var(--gold)]" />
                      {new Date(selectedItem.startTime).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      End Time
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)] mt-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-[var(--gold)]" />
                      {new Date(selectedItem.endTime).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-4 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      Status
                    </span>
                    <span className="block text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white mt-1">
                      {selectedItem.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      Google Calendar
                    </span>
                    <span className={`block text-xs font-bold mt-1 ${selectedItem.addedToGCal ? "text-green-600" : "text-[var(--text-muted)]"}`}>
                      {selectedItem.addedToGCal ? "Synced" : "Not Synced"}
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]/50 p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    This is an org-wide calendar item tied to {selectedItem.entityType.toLowerCase().replace("_", " ")} record. Updates to the source entity will keep this view synchronized.
                  </p>
                  
                  <button
                    onClick={() => handleToggleGCal(selectedItem)}
                    disabled={syncingId === selectedItem.id}
                    className={`w-full py-2.5 rounded-lg border text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      selectedItem.addedToGCal
                        ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/40 hover:bg-green-100"
                        : "bg-[var(--navy)] text-white border-transparent hover:brightness-110"
                    }`}
                  >
                    {syncingId === selectedItem.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : selectedItem.addedToGCal ? (
                      <>
                        <Check size={14} />
                        Remove from Google Calendar
                      </>
                    ) : (
                      <>
                        <CalendarCheck size={14} />
                        Sync to Google Calendar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
