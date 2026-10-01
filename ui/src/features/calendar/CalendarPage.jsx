import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCalendarEvents } from './calendarApi.js';
import { useProjectSelection } from '../projects/projectSelectionContext.js';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatDateStr(d) {
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function withoutIcons(value = '') {
  return value.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
}

function getVisibleRange(currentDate, viewMode) {
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
    <div style={styles.container}>
      {/* ── Page Header matching screenshot ── */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={styles.headerTitle}>Calendar</h1>
            <p style={styles.headerSubtitle}>
              See all the task, dependency and blockers all at once
            </p>
          </div>

        </div>
      </div>

      {error && (
        <div style={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadEvents(currentDate, viewMode, selectedProjectId)}
            style={styles.retryBtn}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main Calendar Card Container ── */}
      <div style={styles.mainCard}>
        {/* Header Toolbar: < Today >, Month Year ˅, Month | Week */}
        <div style={styles.toolbar}>
          {/* Left: < Today > */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous"
              aria-label="Previous"
              style={styles.navBtn}
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={handleToday}
              style={styles.todayBtn}
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next"
              aria-label="Next"
              style={styles.navBtn}
            >
              &gt;
            </button>
          </div>

          {/* Center: Month & Year with dropdown arrow */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              style={styles.monthTitleBtn}
              aria-label="Choose Month"
            >
              <span style={styles.monthTitleText}>
                {monthNames[month]} {year}
                {loading && (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '16px', color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}
                    aria-hidden="true"
                  >
                    autorenew
                  </span>
                )}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--color-slate-500)', fontWeight: '700' }} aria-hidden="true">
                {showMonthDropdown ? '▴' : '▾'}
              </span>
            </button>

            {showMonthDropdown && (
              <div style={styles.monthDropdownMenu}>
                {monthNames.map((mName, idx) => (
                  <div
                    key={mName}
                    onClick={() => handleMonthSelect(idx)}
                    style={{
                      ...styles.monthDropdownItem,
                      backgroundColor: idx === month ? 'var(--color-primary-subtle)' : 'transparent',
                      fontWeight: idx === month ? '700' : '500',
                      color: idx === month ? 'var(--color-primary)' : 'var(--color-slate-800)',
                    }}
                  >
                    {mName} {year}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: View Toggle (Month / Week) */}
          <div style={styles.viewToggleWrap}>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              style={{
                ...styles.viewToggleBtn,
                fontWeight: viewMode === 'month' ? '700' : '500',
                backgroundColor: viewMode === 'month' ? 'var(--color-white)' : 'transparent',
                color: viewMode === 'month' ? '#4F46E5' : 'var(--color-slate-500)',
                boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              style={{
                ...styles.viewToggleBtn,
                fontWeight: viewMode === 'week' ? '700' : '500',
                backgroundColor: viewMode === 'week' ? 'var(--color-white)' : 'transparent',
                color: viewMode === 'week' ? '#4F46E5' : 'var(--color-slate-500)',
                boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Week
            </button>
          </div>
        </div>

        {/* Filter Bar: [✓] Tasks, [✓] Dependencies, [✓] Blockers, [✓] All, Clear all */}
        <div style={styles.filterBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Tasks Filter */}
            <label
              style={{
                ...styles.filterPill,
                backgroundColor: filters.tasks ? 'var(--color-success-bg, #DCFCE7)' : 'var(--color-slate-50)',
                color: filters.tasks ? 'var(--color-success-dark, #15803D)' : 'var(--color-slate-500)',
                borderColor: filters.tasks ? '#86EFAC' : 'var(--color-slate-200)',
              }}
            >
              <input
                type="checkbox"
                checked={filters.tasks}
                onChange={() => handleToggleFilter('tasks')}
                style={{ display: 'none' }}
              />
              <span
                style={{
                  ...styles.checkIconBadge,
                  backgroundColor: filters.tasks ? 'var(--color-success-dark, #15803D)' : 'var(--color-slate-300)',
                }}
              >
                ✓
              </span>
              <span>Tasks</span>
            </label>

            {/* Dependencies Filter */}
            <label
              style={{
                ...styles.filterPill,
                backgroundColor: filters.dependencies ? '#F3E8FF' : 'var(--color-slate-50)',
                color: filters.dependencies ? '#7E22CE' : 'var(--color-slate-500)',
                borderColor: filters.dependencies ? '#D8B4FE' : 'var(--color-slate-200)',
              }}
            >
              <input
                type="checkbox"
                checked={filters.dependencies}
                onChange={() => handleToggleFilter('dependencies')}
                style={{ display: 'none' }}
              />
              <span
                style={{
                  ...styles.checkIconBadge,
                  backgroundColor: filters.dependencies ? '#7E22CE' : 'var(--color-slate-300)',
                }}
              >
                ✓
              </span>
              <span>Dependencies</span>
            </label>

            {/* Blockers Filter */}
            <label
              style={{
                ...styles.filterPill,
                backgroundColor: filters.blockers ? 'var(--color-danger-border, #FEE2E2)' : 'var(--color-slate-50)',
                color: filters.blockers ? '#B91C1C' : 'var(--color-slate-500)',
                borderColor: filters.blockers ? '#FCA5A5' : 'var(--color-slate-200)',
              }}
            >
              <input
                type="checkbox"
                checked={filters.blockers}
                onChange={() => handleToggleFilter('blockers')}
                style={{ display: 'none' }}
              />
              <span
                style={{
                  ...styles.checkIconBadge,
                  backgroundColor: filters.blockers ? '#B91C1C' : 'var(--color-slate-300)',
                }}
              >
                ✓
              </span>
              <span>Blockers</span>
            </label>

            {/* All Filter */}
            <label
              style={{
                ...styles.filterPill,
                backgroundColor: filters.all ? 'var(--color-primary-subtle, #eff6ff)' : 'var(--color-slate-50)',
                color: filters.all ? 'var(--color-primary, #2563eb)' : 'var(--color-slate-500)',
                borderColor: filters.all ? '#93C5FD' : 'var(--color-slate-200)',
              }}
            >
              <input
                type="checkbox"
                checked={filters.all}
                onChange={() => handleToggleFilter('all')}
                style={{ display: 'none' }}
              />
              <span
                style={{
                  ...styles.checkIconBadge,
                  backgroundColor: filters.all ? 'var(--color-primary, #2563eb)' : 'var(--color-slate-300)',
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
            style={styles.clearAllBtn}
          >
            Clear all
          </button>
        </div>

        {/* Days of Week Header */}
        <div style={styles.daysHeaderGrid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <div key={dayName} style={styles.dayColHeader}>
              {dayName}
            </div>
          ))}
        </div>

        {/* ── Month Grid View ── */}
        {viewMode === 'month' ? (
          <div style={styles.monthGrid}>
            {calendarCells.map((cell, idx) => {
              const isToday = isTodayCell(cell.dateObj);
              const cellEvents = eventsByDate.get(cell.dateKey) || [];

              return (
                <div
                  key={idx}
                  style={{
                    ...styles.monthCell,
                    backgroundColor: isToday
                      ? 'var(--color-primary-subtle, #eff6ff)'
                      : cell.isCurrentMonth
                      ? 'var(--color-white)'
                      : '#FAFAFA',
                    opacity: cell.isCurrentMonth ? 1 : 0.5,
                    boxShadow: isToday ? 'inset 0 0 0 2px var(--color-primary, #2563eb)' : 'none',
                  }}
                >
                  {/* Day Number */}
                  {isToday ? (
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={styles.todayCellBadge}>
                        {String(cell.dayNumber).padStart(2, '0')} • Today
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: cell.isCurrentMonth ? 'var(--color-slate-700)' : 'var(--color-slate-400)',
                        marginBottom: '2px',
                      }}
                    >
                      {String(cell.dayNumber).padStart(2, '0')}
                    </div>
                  )}

                  {/* Events Container */}
                  <div style={styles.cellEventsContainer}>
                    {cellEvents.map((event) => {
                      const catConfig = categoryStyles[event.category] || categoryStyles.tasks;

                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          title={`${withoutIcons(event.fullTitle)} • ${event.project} • ${event.time}`}
                          style={{
                            ...styles.eventPill,
                            backgroundColor: catConfig.bg,
                            color: catConfig.color,
                            borderColor: catConfig.border,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                            <span style={styles.eventTitleText}>
                              {withoutIcons(event.title)}
                            </span>
                          </div>
                          <div style={styles.eventTimeText}>
                            {event.time}
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
          <div style={styles.weekGrid}>
            {calendarCells.map((cell, idx) => {
              const isToday = isTodayCell(cell.dateObj);
              const cellEvents = eventsByDate.get(cell.dateKey) || [];

              return (
                <div
                  key={idx}
                  style={{
                    ...styles.weekCell,
                    backgroundColor: isToday ? 'var(--color-primary-subtle, #eff6ff)' : 'var(--color-white)',
                    borderColor: isToday ? 'var(--color-primary, #2563eb)' : 'var(--color-slate-200)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: isToday ? 'var(--color-primary)' : 'var(--color-slate-800)',
                      paddingBottom: '6px',
                      borderBottom: '1px solid var(--color-slate-200)',
                    }}
                  >
                    {cell.dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    {isToday && ' • Today'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                    {cellEvents.length === 0 ? (
                      <div style={{ fontSize: '11px', color: 'var(--color-slate-400)', fontStyle: 'italic', padding: '4px 0' }}>
                        No events
                      </div>
                    ) : (
                      cellEvents.map((event) => {
                        const catConfig = categoryStyles[event.category] || categoryStyles.tasks;
                        return (
                          <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            style={{
                              ...styles.eventPill,
                              padding: '6px 8px',
                              backgroundColor: catConfig.bg,
                              color: catConfig.color,
                              borderColor: catConfig.border,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={styles.eventTitleText}>
                                {withoutIcons(event.fullTitle)}
                              </span>
                            </div>
                            <div style={{ fontSize: '10px', opacity: 0.9 }}>
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
        <div onClick={() => setSelectedEvent(null)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={styles.modalCard}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{withoutIcons(selectedEvent.fullTitle)}</h3>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={styles.modalCloseBtn}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <strong style={{ color: 'var(--color-slate-600)' }}>Project:</strong>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-slate-500)' }} aria-hidden="true">
                    folder
                  </span>
                  {selectedEvent.project || 'General'}
                </span>
              </div>

              <div style={styles.modalRow}>
                <strong style={{ color: 'var(--color-slate-600)' }}>Date:</strong>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-slate-500)' }} aria-hidden="true">
                    calendar_today
                  </span>
                  {selectedEvent.dateKey}
                </span>
              </div>

              <div style={styles.modalRow}>
                <strong style={{ color: 'var(--color-slate-600)' }}>Schedule:</strong>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-slate-500)' }} aria-hidden="true">
                    schedule
                  </span>
                  {selectedEvent.time}
                </span>
              </div>

              <div style={styles.modalRow}>
                <strong style={{ color: 'var(--color-slate-600)' }}>Category:</strong>
                <span
                  style={{
                    textTransform: 'capitalize',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: categoryStyles[selectedEvent.category]?.bg || 'var(--color-slate-100)',
                    color: categoryStyles[selectedEvent.category]?.color || 'var(--color-slate-700)',
                    fontWeight: '700',
                    fontSize: '12px',
                  }}
                >
                  {selectedEvent.category}
                </span>
              </div>

              <div style={styles.modalRow}>
                <strong style={{ color: 'var(--color-slate-600)' }}>Status:</strong>
                <span
                  style={{
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-slate-100)',
                    color: 'var(--color-slate-700)',
                  }}
                >
                  {selectedEvent.status}
                </span>
              </div>

              {selectedEvent.assignedTo && (
                <div style={styles.modalRow}>
                  <strong style={{ color: 'var(--color-slate-600)' }}>Assigned To:</strong>
                  <span>👤 {selectedEvent.assignedTo}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--color-slate-100)' }}>
                  <strong style={{ fontSize: '12px', color: 'var(--color-slate-600)' }}>Description:</strong>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-slate-700)', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  style={styles.modalBtnSecondary}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent(null);
                    navigate('/tasks');
                  }}
                  style={styles.modalBtnPrimary}
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

const styles = {
  container: {
    padding: '24px 32px',
    backgroundColor: '#F9FBFF',
    minHeight: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  headerCard: {
    backgroundColor: 'var(--color-white)',
    borderRadius: '12px',
    border: '1px solid var(--color-slate-200)',
    padding: '18px 24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  headerTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--color-slate-900)',
    margin: '0 0 4px 0',
    letterSpacing: '-0.01em',
  },
  headerSubtitle: {
    fontSize: '13px',
    color: 'var(--color-slate-500)',
    margin: 0,
    fontWeight: '400',
  },
  mainCard: {
    backgroundColor: 'var(--color-white)',
    borderRadius: '12px',
    border: '1px solid var(--color-slate-200)',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  navBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '1px solid var(--color-slate-300)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-slate-700)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid var(--color-slate-300)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-slate-700)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  monthTitleBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  monthTitleText: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--color-slate-900)',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  monthDropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--color-white)',
    border: '1px solid var(--color-slate-200)',
    borderRadius: '8px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    zIndex: 100,
    width: '180px',
    maxHeight: '220px',
    overflowY: 'auto',
    padding: '4px',
  },
  monthDropdownItem: {
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  viewToggleWrap: {
    display: 'flex',
    backgroundColor: 'var(--color-slate-100)',
    borderRadius: '8px',
    padding: '3px',
    gap: '2px',
    border: '1px solid var(--color-slate-200)',
  },
  viewToggleBtn: {
    border: 'none',
    padding: '5px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--color-slate-100)',
    flexWrap: 'wrap',
    gap: '10px',
  },
  filterPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
  },
  checkIconBadge: {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-white)',
    fontSize: '9px',
    fontWeight: '900',
    flexShrink: 0,
  },
  clearAllBtn: {
    background: 'none',
    border: 'none',
    color: '#7C3AED',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  daysHeaderGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--color-slate-200)',
  },
  dayColHeader: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-slate-500)',
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    backgroundColor: 'var(--color-slate-200)',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid var(--color-slate-200)',
  },
  monthCell: {
    minHeight: '100px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxSizing: 'border-box',
    position: 'relative',
  },
  todayCellBadge: {
    backgroundColor: 'var(--color-primary, #2563eb)',
    color: 'var(--color-white)',
    borderRadius: '10px',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: '800',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    lineHeight: '1.2',
  },
  cellEventsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
    maxHeight: '120px',
  },
  eventPill: {
    borderRadius: '5px',
    padding: '4px 6px',
    border: '1px solid',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
  eventTitleText: {
    fontWeight: '700',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '11px',
    lineHeight: '1.2',
  },
  eventTimeText: {
    fontSize: '9px',
    fontWeight: '600',
    opacity: 0.9,
    lineHeight: '1',
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    borderRadius: '8px',
  },
  weekCell: {
    minHeight: '320px',
    border: '1px solid',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxSizing: 'border-box',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  },
  modalCard: {
    backgroundColor: 'var(--color-white)',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
    width: '480px',
    maxWidth: '90%',
    overflow: 'hidden',
    border: '1px solid var(--color-slate-200)',
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-slate-200)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--color-slate-50)',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--color-slate-900)',
    margin: 0,
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: 'var(--color-slate-500)',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: '1',
  },
  modalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    fontSize: '13px',
    color: 'var(--color-slate-700)',
  },
  modalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: 'var(--color-slate-100)',
    color: 'var(--color-slate-600)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalBtnPrimary: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-white)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #FCA5A5',
    color: '#991B1B',
    padding: '10px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    fontWeight: '500',
  },
  retryBtn: {
    backgroundColor: '#991B1B',
    color: '#ffffff',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
