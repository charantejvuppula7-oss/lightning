import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCalendarEvents } from './calendarApi.js';
import { useProjectSelection } from '../projects/useProjectSelection.js'

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatDateStr(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function withoutIcons(value = '') {
  if (value == null) return '';
  return String(value).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
}

function getVisibleRange(currentDate, viewMode) {
  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    return { start: '', end: '' };
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (viewMode === 'month') {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let startYear = year;
    let startMonth = month;
    let startDay = 1;
    if (firstDayIndex > 0) {
      startDay = daysInPrevMonth - firstDayIndex + 1;
      startMonth = month - 1;
      if (startMonth < 0) {
        startMonth = 11;
        startYear -= 1;
      }
    }
    const startDate = new Date(startYear, startMonth, startDay);

    const cellsSoFar = firstDayIndex + daysInMonth;
    const remaining = cellsSoFar > 35 ? 42 - cellsSoFar : 35 - cellsSoFar;
    let endYear = year;
    let endMonth = month + 1;
    if (endMonth > 11) {
      endMonth = 0;
      endYear += 1;
    }
    const endDate = new Date(endYear, endMonth, remaining);

    return {
      start: formatDateStr(startDate),
      end: formatDateStr(endDate),
    };
  } else {
    // Week view: Sunday to Saturday
    const dayOfWeek = currentDate.getDay();
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - dayOfWeek);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return {
      start: formatDateStr(startDate),
      end: formatDateStr(endDate),
    };
  }
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  // ── Filter State ──
  const [filters, setFilters] = useState({
    tasks: true,
    dependencies: true,
    blockers: true,
    all: true,
  });

  // ── Calendar Core State ──
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // ── Backend Calendar Events State ──
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeRequestRef = useRef(0);

  // ── Fetch Calendar Events by Visible Date Range ──
  const loadEvents = useCallback(async (date, mode, projId) => {
    const requestId = ++activeRequestRef.current;
    const range = getVisibleRange(date, mode);

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCalendarEvents({
        start: range.start,
        end: range.end,
        projectId: projId && projId !== 'all' ? projId : undefined,
      });

      // Avoid stale response overriding newer request
      if (requestId === activeRequestRef.current) {
        setEvents(data?.events || []);
      }
    } catch (err) {
      if (requestId === activeRequestRef.current) {
        console.error('Failed to fetch calendar events:', err);
        setError('Unable to load calendar events. Please check your connection.');
      }
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Trigger loading when date, view mode, or project changes
  useEffect(() => {
    const timer = setTimeout(() => loadEvents(currentDate, viewMode, selectedProjectId), 0);
    return () => clearTimeout(timer);
  }, [currentDate, viewMode, selectedProjectId, loadEvents]);

  // ── Filtered Events ──
  const eventsByDate = useMemo(() => {
    const grouped = new Map();
    for (const ev of events) {
      if (ev.category === 'tasks' && !filters.tasks) continue;
      if (ev.category === 'dependencies' && !filters.dependencies) continue;
      if (ev.category === 'blockers' && !filters.blockers) continue;
      if (!grouped.has(ev.dateKey)) grouped.set(ev.dateKey, []);
      grouped.get(ev.dateKey).push(ev);
    }
    return grouped;
  }, [events, filters]);

  // ── Calendar Calculations ──
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleMonthSelect = (mIndex) => {
    setCurrentDate(new Date(year, mIndex, 1));
    setShowMonthDropdown(false);
  };

  const isTodayCell = (dateObj) => {
    if (!dateObj) return false;
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  };

  // ── Filter Handlers ──
  const handleToggleFilter = (key) => {
    if (key === 'all') {
      const nextVal = !filters.all;
      setFilters({
        all: nextVal,
        tasks: nextVal,
        dependencies: nextVal,
        blockers: nextVal,
      });
    } else {
      const updated = { ...filters, [key]: !filters[key] };
      updated.all = updated.tasks && updated.dependencies && updated.blockers;
      setFilters(updated);
    }
  };

  const handleClearAll = () => {
    setFilters({
      all: false,
      tasks: false,
      dependencies: false,
      blockers: false,
    });
  };

  // ── Calendar Grid Cells Generation ──
  const calendarCells = (() => {
    if (viewMode === 'month') {
      const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      const cells = [];

      // Prev month padding cells
      for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const prevDate = new Date(year, month - 1, dayNum);
        cells.push({
          dayNumber: dayNum,
          isCurrentMonth: false,
          dateKey: formatDateStr(prevDate),
          dateObj: prevDate,
        });
      }

      // Current month cells
      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const curDate = new Date(year, month, dayNum);
        cells.push({
          dayNumber: dayNum,
          isCurrentMonth: true,
          dateKey: formatDateStr(curDate),
          dateObj: curDate,
        });
      }

      // Next month padding cells
      const totalCellsSoFar = cells.length;
      const remaining = totalCellsSoFar > 35 ? 42 - totalCellsSoFar : 35 - totalCellsSoFar;
      for (let dayNum = 1; dayNum <= remaining; dayNum++) {
        const nextDate = new Date(year, month + 1, dayNum);
        cells.push({
          dayNumber: dayNum,
          isCurrentMonth: false,
          dateKey: formatDateStr(nextDate),
          dateObj: nextDate,
        });
      }

      return cells;
    } else {
      // Week View: 7 days
      const dayOfWeek = currentDate.getDay();
      const sunday = new Date(currentDate);
      sunday.setDate(currentDate.getDate() - dayOfWeek);

      const cells = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        cells.push({
          dayNumber: d.getDate(),
          isCurrentMonth: d.getMonth() === month,
          dateKey: formatDateStr(d),
          dateObj: d,
        });
      }
      return cells;
    }
  })();

  // ── Category Styles matching screenshot ──
  const categoryStyles = {
    tasks: {
      bg: 'var(--color-success-bg, #DCFCE7)',
      color: 'var(--color-success-dark, #15803D)',
      border: '#86EFAC',
    },
    dependencies: {
      bg: '#F3E8FF',
      color: '#7E22CE',
      border: '#D8B4FE',
    },
    blockers: {
      bg: 'var(--color-danger-border, #FEE2E2)',
      color: '#B91C1C',
      border: '#FCA5A5',
    },
  };

  return (
    <div className="p-[24px_32px]! [background-color:#F9FBFF]! min-h-[100%]! box-border! flex! flex-col! gap-[16px]! [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_Helvetica,_Arial,_sans-serif]!">
      {/* ── Page Header matching screenshot ── */}
      <div className="[background-color:var(--color-white)]! rounded-[12px]! [border:1px_solid_var(--color-slate-200)]! p-[18px_24px]! [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.02)]!">
        <div className="flex! justify-between! items-center! flex-wrap! gap-[12px]!">
          <div>
            <h1 className="text-[22px]! font-extrabold! [color:var(--color-slate-900)]! m-[0_0_4px_0]! tracking-[-0.01em]!">Calendar</h1>
            <p className="text-[13px]! [color:var(--color-slate-500)]! m-0! font-normal!">
              See all the task, dependency and blockers all at once
            </p>
          </div>

        </div>
      </div>

      {error && (
        <div className="[background-color:#FEE2E2]! [border:1px_solid_#FCA5A5]! [color:#991B1B]! p-[10px_16px]! rounded-[8px]! flex! items-center! justify-between! text-[13px]! font-medium!" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadEvents(currentDate, viewMode, selectedProjectId)}
            className="[background-color:#991B1B]! [color:#ffffff]! border-0! p-[4px_10px]! rounded-[4px]! text-[12px]! font-semibold! cursor-pointer!"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main Calendar Card Container ── */}
      <div className="[background-color:var(--color-white)]! rounded-[12px]! [border:1px_solid_var(--color-slate-200)]! [box-shadow:0_1px_4px_rgba(0,_0,_0,_0.04)]! p-[20px_24px]! flex! flex-col! gap-[16px]!">
        {/* Header Toolbar: < Today >, Month Year ˅, Month | Week */}
        <div className="flex! justify-between! items-center! flex-wrap! gap-[12px]!">
          {/* Left: < Today > */}
          <div className="flex! items-center! gap-[6px]!">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous"
              aria-label="Previous"
              className="w-[32px]! h-[32px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! [background-color:var(--color-white)]! [color:var(--color-slate-700)]! text-[14px]! font-semibold! cursor-pointer! flex! items-center! justify-center!"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="p-[6px_14px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! [background-color:var(--color-white)]! [color:var(--color-slate-700)]! text-[13px]! font-semibold! cursor-pointer!"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next"
              aria-label="Next"
              className="w-[32px]! h-[32px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! [background-color:var(--color-white)]! [color:var(--color-slate-700)]! text-[14px]! font-semibold! cursor-pointer! flex! items-center! justify-center!"
            >
              &gt;
            </button>
          </div>

          {/* Center: Month & Year with dropdown arrow */}
          <div className="relative!">
            <button
              type="button"
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="[background:none]! border-0! cursor-pointer! flex! items-center! gap-[6px]! p-[4px_8px]! rounded-[6px]!"
              aria-label="Choose Month"
            >
              <span className="text-[18px]! font-extrabold! [color:var(--color-slate-900)]! tracking-[-0.01em]! flex! items-center! gap-[6px]!">
                {monthNames[month]} {year}
                {loading && (
                  <span
                    className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-primary)]! [animation:spin_1s_linear_infinite]!"}

                    aria-hidden="true"
                  >
                    autorenew
                  </span>
                )}
              </span>
              <span className="text-[13px]! [color:var(--color-slate-500)]! font-bold!" aria-hidden="true">
                {showMonthDropdown ? '▴' : '▾'}
              </span>
            </button>

            {showMonthDropdown && (
              <div className="absolute! top-[calc(100%_+_6px)]! left-[50%]! [transform:translateX(-50%)]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! [box-shadow:0_10px_25px_-5px_rgba(0,_0,_0,_0.1)]! z-[100]! w-[180px]! max-h-[220px]! overflow-y-auto! p-[4px]!">
                {monthNames.map((mName, idx) => (
                  <div
                    key={mName}
                    onClick={() => handleMonthSelect(idx)}
                    className="p-[8px_12px]! rounded-[4px]! text-[13px]! cursor-pointer!" style={{
  backgroundColor: idx === month ? 'var(--color-primary-subtle)' : 'transparent',
  fontWeight: idx === month ? '700' : '500',
  color: idx === month ? 'var(--color-primary)' : 'var(--color-slate-800)'
}}
                  >
                    {mName} {year}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: View Toggle (Month / Week) */}
          <div className="flex! [background-color:var(--color-slate-100)]! rounded-[8px]! p-[3px]! gap-[2px]! [border:1px_solid_var(--color-slate-200)]!">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className="border-0! p-[5px_14px]! rounded-[6px]! text-[12px]! cursor-pointer! [transition:all_0.15s_ease]!" style={{
  fontWeight: viewMode === 'month' ? '700' : '500',
  backgroundColor: viewMode === 'month' ? 'var(--color-white)' : 'transparent',
  color: viewMode === 'month' ? '#4F46E5' : 'var(--color-slate-500)',
  boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
}}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className="border-0! p-[5px_14px]! rounded-[6px]! text-[12px]! cursor-pointer! [transition:all_0.15s_ease]!" style={{
  fontWeight: viewMode === 'week' ? '700' : '500',
  backgroundColor: viewMode === 'week' ? 'var(--color-white)' : 'transparent',
  color: viewMode === 'week' ? '#4F46E5' : 'var(--color-slate-500)',
  boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
}}
            >
              Week
            </button>
          </div>
        </div>

        {/* Filter Bar: [✓] Tasks, [✓] Dependencies, [✓] Blockers, [✓] All, Clear all */}
        <div className="flex! justify-between! items-center! pb-[8px]! [border-bottom:1px_solid_var(--color-slate-100)]! flex-wrap! gap-[10px]!">
          <div className="flex! items-center! gap-[10px]! flex-wrap!">
            {/* Tasks Filter */}
            <label
              className="inline-flex! items-center! gap-[6px]! p-[4px_10px]! rounded-[6px]! text-[12px]! font-semibold! [border:1px_solid]! cursor-pointer! select-none! [transition:all_0.15s_ease]!" style={{
  backgroundColor: filters.tasks ? 'var(--color-success-bg, #DCFCE7)' : 'var(--color-slate-50)',
  color: filters.tasks ? 'var(--color-success-dark, #15803D)' : 'var(--color-slate-500)',
  borderColor: filters.tasks ? '#86EFAC' : 'var(--color-slate-200)'
}}
            >
              <input
                type="checkbox"
                checked={filters.tasks}
                onChange={() => handleToggleFilter('tasks')}
                className="hidden!"
              />
              <span
                className="w-[14px]! h-[14px]! rounded-[3px]! inline-flex! items-center! justify-center! [color:var(--color-white)]! text-[9px]! [font-weight:900]! shrink-0!" style={{
  backgroundColor: filters.tasks ? 'var(--color-success-dark, #15803D)' : 'var(--color-slate-300)'
}}
              >
                ✓
              </span>
              <span>Tasks</span>
            </label>

            {/* Dependencies Filter */}
            <label
              className="inline-flex! items-center! gap-[6px]! p-[4px_10px]! rounded-[6px]! text-[12px]! font-semibold! [border:1px_solid]! cursor-pointer! select-none! [transition:all_0.15s_ease]!" style={{
  backgroundColor: filters.dependencies ? '#F3E8FF' : 'var(--color-slate-50)',
  color: filters.dependencies ? '#7E22CE' : 'var(--color-slate-500)',
  borderColor: filters.dependencies ? '#D8B4FE' : 'var(--color-slate-200)'
}}
            >
              <input
                type="checkbox"
                checked={filters.dependencies}
                onChange={() => handleToggleFilter('dependencies')}
                className="hidden!"
              />
              <span
                className="w-[14px]! h-[14px]! rounded-[3px]! inline-flex! items-center! justify-center! [color:var(--color-white)]! text-[9px]! [font-weight:900]! shrink-0!" style={{
  backgroundColor: filters.dependencies ? '#7E22CE' : 'var(--color-slate-300)'
}}
              >
                ✓
              </span>
              <span>Dependencies</span>
            </label>

            {/* Blockers Filter */}
            <label
              className="inline-flex! items-center! gap-[6px]! p-[4px_10px]! rounded-[6px]! text-[12px]! font-semibold! [border:1px_solid]! cursor-pointer! select-none! [transition:all_0.15s_ease]!" style={{
  backgroundColor: filters.blockers ? 'var(--color-danger-border, #FEE2E2)' : 'var(--color-slate-50)',
  color: filters.blockers ? '#B91C1C' : 'var(--color-slate-500)',
  borderColor: filters.blockers ? '#FCA5A5' : 'var(--color-slate-200)'
}}
            >
              <input
                type="checkbox"
                checked={filters.blockers}
                onChange={() => handleToggleFilter('blockers')}
                className="hidden!"
              />
              <span
                className="w-[14px]! h-[14px]! rounded-[3px]! inline-flex! items-center! justify-center! [color:var(--color-white)]! text-[9px]! [font-weight:900]! shrink-0!" style={{
  backgroundColor: filters.blockers ? '#B91C1C' : 'var(--color-slate-300)'
}}
              >
                ✓
              </span>
              <span>Blockers</span>
            </label>

            {/* All Filter */}
            <label
              className="inline-flex! items-center! gap-[6px]! p-[4px_10px]! rounded-[6px]! text-[12px]! font-semibold! [border:1px_solid]! cursor-pointer! select-none! [transition:all_0.15s_ease]!" style={{
  backgroundColor: filters.all ? 'var(--color-primary-subtle, #eff6ff)' : 'var(--color-slate-50)',
  color: filters.all ? 'var(--color-primary, #2563eb)' : 'var(--color-slate-500)',
  borderColor: filters.all ? '#93C5FD' : 'var(--color-slate-200)'
}}
            >
              <input
                type="checkbox"
                checked={filters.all}
                onChange={() => handleToggleFilter('all')}
                className="hidden!"
              />
              <span
                className="w-[14px]! h-[14px]! rounded-[3px]! inline-flex! items-center! justify-center! [color:var(--color-white)]! text-[9px]! [font-weight:900]! shrink-0!" style={{
  backgroundColor: filters.all ? 'var(--color-primary, #2563eb)' : 'var(--color-slate-300)'
}}
              >
                ✓
              </span>
              <span>All</span>
            </label>
          </div>

          {/* Clear all link */}
          <button
            type="button"
            onClick={handleClearAll}
            className="[background:none]! border-0! [color:#7C3AED]! text-[12px]! font-semibold! cursor-pointer! p-[4px_8px]! rounded-[4px]!"
          >
            Clear all
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid! grid-cols-[repeat(7,_1fr)]! text-center! pb-[8px]! [border-bottom:1px_solid_var(--color-slate-200)]!">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <div key={dayName} className="text-[12px]! font-semibold! [color:var(--color-slate-500)]!">
              {dayName}
            </div>
          ))}
        </div>

        {/* ── Month Grid View ── */}
        {viewMode === 'month' ? (
          <div className="grid! grid-cols-[repeat(7,_1fr)]! gap-[1px]! [background-color:var(--color-slate-200)]! rounded-[8px]! overflow-hidden! [border:1px_solid_var(--color-slate-200)]!">
            {calendarCells.map((cell, idx) => {
              const isToday = isTodayCell(cell.dateObj);
              const cellEvents = eventsByDate.get(cell.dateKey) || [];

              return (
                <div
                  key={idx}
                  className="min-h-[100px]! p-[8px]! flex! flex-col! gap-[4px]! box-border! relative!" style={{
  backgroundColor: isToday ? 'var(--color-primary-subtle, #eff6ff)' : cell.isCurrentMonth ? 'var(--color-white)' : '#FAFAFA',
  opacity: cell.isCurrentMonth ? 1 : 0.5,
  boxShadow: isToday ? 'inset 0 0 0 2px var(--color-primary, #2563eb)' : 'none'
}}
                >
                  {/* Day Number */}
                  {isToday ? (
                    <div className="flex! items-center! mb-[2px]!">
                      <span className="[background-color:var(--color-primary,_#2563eb)]! [color:var(--color-white)]! rounded-[10px]! p-[2px_6px]! text-[10px]! font-extrabold! inline-flex! items-center! gap-[3px]! leading-[1.2]!">
                        {String(cell.dayNumber).padStart(2, '0')} • Today
                      </span>
                    </div>
                  ) : (
                    <div
                      className="text-[11px]! font-bold! mb-[2px]!" style={{
  color: cell.isCurrentMonth ? 'var(--color-slate-700)' : 'var(--color-slate-400)'
}}
                    >
                      {String(cell.dayNumber).padStart(2, '0')}
                    </div>
                  )}

                  {/* Events Container */}
                  <div className="flex! flex-col! gap-[4px]! overflow-y-auto! max-h-[120px]!">
                    {cellEvents.map((event) => {
                      const catConfig = categoryStyles[event.category] || categoryStyles.tasks;

                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                      title={`${withoutIcons(event?.fullTitle ?? event?.title ?? '')} • ${event?.project ?? 'General'} • ${event?.time ?? ''}`}
                          className="rounded-[5px]! p-[4px_6px]! [border:1px_solid]! cursor-pointer! flex! flex-col! gap-[2px]! [transition:transform_0.1s_ease,_box-shadow_0.1s_ease]!" style={{
  backgroundColor: catConfig.bg,
  color: catConfig.color,
  borderColor: catConfig.border
}}
                        >
                          <div className="flex! items-center! gap-[4px]! overflow-hidden!">
                            <span className="font-bold! whitespace-nowrap! overflow-hidden! text-ellipsis! text-[11px]! leading-[1.2]!">
                          {withoutIcons(event?.title ?? '')}
                            </span>
                          </div>
                          <div className="text-[9px]! font-semibold! opacity-[0.9]! leading-[1]!">
                        {event?.time ?? ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Week View ── */
          <div className="grid! grid-cols-[repeat(7,_1fr)]! gap-[8px]! rounded-[8px]!">
            {calendarCells.map((cell, idx) => {
              const isToday = isTodayCell(cell.dateObj);
              const cellEvents = eventsByDate.get(cell.dateKey) || [];

              return (
                <div
                  key={idx}
                  className="min-h-[320px]! [border:1px_solid]! rounded-[8px]! p-[10px]! flex! flex-col! gap-[8px]! box-border!" style={{
  backgroundColor: isToday ? 'var(--color-primary-subtle, #eff6ff)' : 'var(--color-white)',
  borderColor: isToday ? 'var(--color-primary, #2563eb)' : 'var(--color-slate-200)'
}}
                >
                  <div
                    className="text-[12px]! font-bold! pb-[6px]! [border-bottom:1px_solid_var(--color-slate-200)]!" style={{
  color: isToday ? 'var(--color-primary)' : 'var(--color-slate-800)'
}}
                  >
                    {cell.dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    {isToday && ' • Today'}
                  </div>

                  <div className="flex! flex-col! gap-[6px]! overflow-y-auto!">
                    {cellEvents.length === 0 ? (
                      <div className="text-[11px]! [color:var(--color-slate-400)]! [font-style:italic]! p-[4px_0]!">
                        No events
                      </div>
                    ) : (
                      cellEvents.map((event) => {
                        const catConfig = categoryStyles[event.category] || categoryStyles.tasks;
                        return (
                          <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="rounded-[5px]! p-[6px_8px]! [border:1px_solid]! cursor-pointer! flex! flex-col! gap-[2px]! [transition:transform_0.1s_ease,_box-shadow_0.1s_ease]!" style={{
  backgroundColor: catConfig.bg,
  color: catConfig.color,
  borderColor: catConfig.border
}}
                          >
                            <div className="flex! items-center! gap-[4px]!">
                              <span className="font-bold! whitespace-nowrap! overflow-hidden! text-ellipsis! text-[11px]! leading-[1.2]!">
                                {withoutIcons(event.fullTitle)}
                              </span>
                            </div>
                            <div className="text-[10px]! opacity-[0.9]!">
                              {event.time}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Event Detail Modal ── */}
      {selectedEvent && (
        <div onClick={() => setSelectedEvent(null)} className="fixed! top-[0]! left-[0]! right-[0]! bottom-[0]! [background-color:rgba(15,_23,_42,_0.4)]! flex! items-center! justify-center! z-[1000]! [backdrop-filter:blur(2px)]!">
          <div onClick={(e) => e.stopPropagation()} className="[background-color:var(--color-white)]! rounded-[12px]! [box-shadow:0_20px_25px_-5px_rgba(0,_0,_0,_0.15)]! w-[480px]! max-w-[90%]! overflow-hidden! [border:1px_solid_var(--color-slate-200)]!">
            {/* Modal Header */}
            <div className="p-[16px_20px]! [border-bottom:1px_solid_var(--color-slate-200)]! flex! items-center! justify-between! [background-color:var(--color-slate-50)]!">
              <h3 className="text-[16px]! font-bold! [color:var(--color-slate-900)]! m-0!">{withoutIcons(selectedEvent?.fullTitle ?? selectedEvent?.title ?? '')}</h3>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="[background:none]! border-0! text-[16px]! [color:var(--color-slate-500)]! cursor-pointer! p-[4px]! leading-[1]!"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-[20px]! flex! flex-col! gap-[12px]! text-[13px]! [color:var(--color-slate-700)]!">
              <div className="flex! justify-between! items-center!">
                <strong className="[color:var(--color-slate-600)]!">Project:</strong>
                <span className="inline-flex! items-center! gap-[4px]! font-semibold!">
                  <span className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-slate-500)]!"}  aria-hidden="true">
                    folder
                  </span>
                  {selectedEvent?.project || 'General'}
                </span>
              </div>

              <div className="flex! justify-between! items-center!">
                <strong className="[color:var(--color-slate-600)]!">Date:</strong>
                <span className="inline-flex! items-center! gap-[4px]!">
                  <span className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-slate-500)]!"}  aria-hidden="true">
                    calendar_today
                  </span>
                  {selectedEvent?.dateKey}
                </span>
              </div>

              <div className="flex! justify-between! items-center!">
                <strong className="[color:var(--color-slate-600)]!">Schedule:</strong>
                <span className="inline-flex! items-center! gap-[4px]!">
                  <span className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-slate-500)]!"}  aria-hidden="true">
                    schedule
                  </span>
                  {selectedEvent?.time}
                </span>
              </div>

              <div className="flex! justify-between! items-center!">
                <strong className="[color:var(--color-slate-600)]!">Category:</strong>
                <span
                  className="[text-transform:capitalize]! p-[3px_10px]! rounded-[12px]! font-bold! text-[12px]!" style={{
  backgroundColor: categoryStyles[selectedEvent.category]?.bg || 'var(--color-slate-100)',
  color: categoryStyles[selectedEvent.category]?.color || 'var(--color-slate-700)'
}}
                >
                  {selectedEvent?.category}
                </span>
              </div>

              <div className="flex! justify-between! items-center!">
                <strong className="[color:var(--color-slate-600)]!">Status:</strong>
                <span
                  className="[text-transform:uppercase]! text-[11px]! font-bold! p-[3px_8px]! rounded-[6px]! [background-color:var(--color-slate-100)]! [color:var(--color-slate-700)]!"
                >
                  {selectedEvent?.status}
                </span>
              </div>

              {selectedEvent?.assignedTo && (
                <div className="flex! justify-between! items-center!">
                  <strong className="[color:var(--color-slate-600)]!">Assigned To:</strong>
                  <span>👤 {selectedEvent.assignedTo}</span>
                </div>
              )}

              {selectedEvent?.description && (
                <div className="flex! flex-col! gap-[4px]! mt-[6px]! pt-[10px]! [border-top:1px_solid_var(--color-slate-100)]!">
                  <strong className="text-[12px]! [color:var(--color-slate-600)]!">Description:</strong>
                  <p className="m-0! text-[12.5px]! [color:var(--color-slate-700)]! leading-[1.5]! [white-space:pre-line]!">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-[12px]! flex! justify-end! gap-[8px]!">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="[background-color:var(--color-slate-100)]! [color:var(--color-slate-600)]! border-0! p-[8px_16px]! rounded-[8px]! text-[12.5px]! font-semibold! cursor-pointer!"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent(null);
                    navigate('/tasks');
                  }}
                  className="[background-color:var(--color-primary)]! [color:var(--color-white)]! border-0! p-[8px_16px]! rounded-[8px]! text-[12.5px]! font-bold! cursor-pointer! flex! items-center! gap-[6px]!"
                >
                  <span>View in Tasks</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
