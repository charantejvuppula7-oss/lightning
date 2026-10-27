import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Enhanced DatePicker Component
 *
 * Clean, lightweight date picker dropdown matching the SprintCalendar design.
 * Automatically blocks past dates (< today) by default so earlier dates cannot be selected.
 */
export default function DatePicker({
    value = '',
    onChange,
    min = '',
    max = '',
    allowPastDates = false,
    disablePastDates,
    excludeWeekends = false,
    weekendDays = [0, 6],
    placeholder = 'Select Date',
    disabled = false,
    position = 'bottom',
    portal = false,
    className = '',
    controlClassName = '',
    id,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [computedPosition, setComputedPosition] = useState(position);
    const [alignRight, setAlignRight] = useState(false);
    const [portalPosition, setPortalPosition] = useState({ top: 0, left: 0 });
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const calendarRef = useRef(null);

    // Auto-detect available viewport space to prevent popover cutoff
    useEffect(() => {
        if (!isOpen || !inputRef.current) return undefined;

        const updatePosition = () => {
            if (!inputRef.current) return;
            const rect = inputRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const openAbove = position === 'top' || (spaceBelow < 360 && spaceAbove > spaceBelow);
            if (openAbove) {
                setComputedPosition('top');
            } else {
                setComputedPosition('bottom');
            }

            const popupWidth = 290;
            const popupHeight = 360;
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8));
            const preferredTop = openAbove ? rect.top - popupHeight - 8 : rect.bottom + 8;
            const top = Math.max(8, Math.min(preferredTop, window.innerHeight - popupHeight - 8));
            setPortalPosition({ top, left });

            if (rect.left + popupWidth > window.innerWidth - 20) {
                setAlignRight(true);
            } else {
                setAlignRight(false);
            }

        };

        updatePosition();
        if (!portal) return undefined;
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, position, portal]);

    // Helpers to clean & format dates
    const cleanDateStr = (val) => {
        if (!val) return '';
        if (typeof val === 'string') {
            return val.split('T')[0].split(' ')[0].trim();
        }
        return String(val).trim();
    };

    const normalizedValue = cleanDateStr(value);
    const normalizedMin = cleanDateStr(min);
    const normalizedMax = cleanDateStr(max);

    // Get today's local date string in YYYY-MM-DD
    const getTodayStr = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const todayStr = getTodayStr();

    // Past dates (< today) are blocked by default unless allowPastDates is explicitly true or disablePastDates is false
    const shouldBlockPast = disablePastDates !== undefined ? disablePastDates : !allowPastDates;

    // Parse initial year/month
    const getInitialDate = (val) => {
        if (val) {
            const d = new Date(val + 'T00:00:00');
            if (!isNaN(d.getTime())) return d;
        }
        return new Date();
    };

    const initialDate = getInitialDate(normalizedValue);
    const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-11

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target) &&
                !calendarRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset calendar view when input value changes
    useEffect(() => {
        if (normalizedValue) {
            const d = new Date(normalizedValue + 'T00:00:00');
            if (!isNaN(d.getTime())) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep calendar month in sync with the externally selected date.
                setCurrentYear(d.getFullYear());
                setCurrentMonth(d.getMonth());
            }
        }
    }, [normalizedValue]);

    // Handle Escape key to close
    useEffect(() => {
        if (isOpen) {
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    setIsOpen(false);
                }
            };
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const formatDateStr = (y, m, d) => {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    };

    const isDateOutOfBounds = (dateStr) => {
        if (shouldBlockPast && dateStr < todayStr) return true;
        if (normalizedMin && dateStr < normalizedMin) return true;
        if (normalizedMax && dateStr > normalizedMax) return true;
        return false;
    };

    const isWeekend = (dayOfWeek) => weekendDays.includes(dayOfWeek);

    const canGoPrevMonth = () => {
        if (!shouldBlockPast) return true;
        const now = new Date();
        const curY = now.getFullYear();
        const curM = now.getMonth();
        if (currentYear < curY) return false;
        if (currentYear === curY && currentMonth <= curM) return false;
        if (normalizedMin) {
            const parts = normalizedMin.split('-');
            if (parts.length >= 2) {
                const minY = parseInt(parts[0], 10);
                const minM = parseInt(parts[1], 10) - 1;
                if (currentYear < minY) return false;
                if (currentYear === minY && currentMonth <= minM) return false;
            }
        }
        return true;
    };

    const handlePrevMonth = (e) => {
        e?.stopPropagation();
        if (!canGoPrevMonth()) return;
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = (e) => {
        e?.stopPropagation();
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    const daysGrid = [];
    for (let i = 0; i < firstDayIndex; i++) {
        daysGrid.push({ day: null, isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
        daysGrid.push({ day: d, isCurrentMonth: true });
    }

    const handleSelectDay = (day) => {
        const dateStr = formatDateStr(currentYear, currentMonth, day);
        const dateObj = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();

        if (excludeWeekends && isWeekend(dayOfWeek)) return;
        if (isDateOutOfBounds(dateStr)) return;

        if (onChange) {
            onChange(dateStr);
        }
        setIsOpen(false);
    };

    const calendarPopover = (
                <div ref={calendarRef}
                    className={`w-[290px] rounded-[16px] border border-[#eef2f7] bg-white p-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] [font-family:inherit] ${portal ? 'fixed z-[1300]' : 'absolute z-[1100] ' + (computedPosition === 'top' ? 'bottom-[48px]' : 'top-[48px]') + (alignRight ? ' right-0 left-auto' : '')}`}
                    style={portal ? { top: portalPosition.top, left: portalPosition.left } : undefined}>
                    {/* Header */}
                    <div className="flex! items-center! justify-between! mb-[16px]!">
                        <button
                            type="button"
                            disabled={!canGoPrevMonth()}
                            onClick={handlePrevMonth}
                            className={"[background:none]! border-0! text-[18px]! font-semibold! p-[4px_8px]! rounded-[6px]! [transition:all_0.15s]!" + ' ' + (canGoPrevMonth() ? "hover:[background:var(--color-slate-100)]!" : '') + ' ' + (canGoPrevMonth() ? "hover:[color:var(--color-slate-700)]!" : '')} style={{
  cursor: !canGoPrevMonth() ? 'not-allowed' : 'pointer',
  color: !canGoPrevMonth() ? 'var(--color-slate-300)' : 'var(--color-slate-400)',
  opacity: !canGoPrevMonth() ? 0.35 : 1
}}

                            title={!canGoPrevMonth() ? 'Previous months are blocked' : 'Previous month'}
                        >
                            ‹
                        </button>

                        <span className="text-[15px]! font-bold! [color:#111827]!">
                            {MONTH_NAMES[currentMonth]} {currentYear}
                        </span>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className={"[background:none]! border-0! cursor-pointer! [color:var(--color-slate-400)]! text-[18px]! font-semibold! p-[4px_8px]! rounded-[6px]! [transition:all_0.15s]!" + ' ' + "hover:[background:var(--color-slate-100)]!" + ' ' + "hover:[color:var(--color-slate-700)]!"}

                            title="Next month"
                        >
                            ›
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid! grid-cols-[repeat(7,_1fr)]! gap-[2px]! mb-[8px]! text-center!">
                        {DAY_HEADERS.map((day, idx) => (
                            <span
                                key={idx}
                                className="text-[12px]! font-semibold! [color:var(--color-slate-400)]! p-[4px_0]!"
                            >
                                {day}
                            </span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid! grid-cols-[repeat(7,_1fr)]! gap-[2px]! text-center!">
                        {daysGrid.map((item, idx) => {
                            if (!item.day) {
                                return <div key={idx} />;
                            }

                            const dateStr = formatDateStr(currentYear, currentMonth, item.day);
                            const dateObj = new Date(dateStr + 'T00:00:00');
                            const dayOfWeek = dateObj.getDay();

                            const isSelected = normalizedValue === dateStr;
                            const isToday = todayStr === dateStr;
                            const isWeekEnd = isWeekend(dayOfWeek);
                            const isOutOfBounds = isDateOutOfBounds(dateStr);
                            const isDisabled = (excludeWeekends && isWeekEnd) || isOutOfBounds;

                            const cellClassName = 'mx-auto flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-[13px] transition-all duration-150 ' +
                                (isDisabled ? 'cursor-not-allowed ' : 'cursor-pointer ') +
                                (isSelected ? 'border-0 bg-(--color-primary) font-bold text-white opacity-100! shadow-[0_2px_8px_rgba(37,99,235,0.25)]' :
                                    (isToday ? 'border-[1.5px] border-(--color-slate-300) font-bold ' : 'border-0 font-medium ') +
                                    'bg-transparent ' + (isDisabled ? 'text-(--color-slate-300) opacity-[0.35]!' :
                                        (isWeekEnd ? 'text-(--color-primary-light) ' : 'text-[#374151] ') + 'hover:bg-[#f0f4ff]'));

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => !isDisabled && handleSelectDay(item.day)}
                                    className={cellClassName}
                                    title={isDisabled ? (isOutOfBounds ? 'Previous dates are blocked' : 'Weekends are disabled') : ''}
                                >
                                    {item.day}
                                </button>
                            );
                        })}
                    </div>
                </div>
    );

    return (
        <div ref={containerRef} className={className + " " + "relative! w-full!"} >
            {/* Input display area */}
            <div
                ref={inputRef}
                className={`relative flex w-full h-[42px] items-center justify-between flex-nowrap gap-[6px] overflow-hidden rounded-[8px] border p-[0_10px_0_12px] text-[14px] select-none transition-all duration-150 shadow-none ${disabled ? 'border-(--color-slate-200) bg-(--color-slate-50) text-(--color-slate-500) cursor-not-allowed' : 'border-[#d1d5db] bg-white cursor-pointer hover:border-(--color-primary) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:outline-none ' + (normalizedValue ? 'text-(--color-slate-800)' : 'text-(--color-slate-400)')} ${controlClassName}`}
                id={id}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                tabIndex={disabled ? -1 : 0}
                role="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={placeholder}
            >
                <span className="overflow-hidden! text-ellipsis! whitespace-nowrap! block! pr-[28px]!">
                    {normalizedValue ? (
                        <span>
                            {(() => {
                                const d = new Date(normalizedValue + 'T00:00:00');
                                return !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                }) : normalizedValue;
                            })()}
                        </span>
                    ) : (
                        <span className="[color:var(--color-slate-400)]!">{placeholder}</span>
                    )}
                </span>
                {/* Calendar icon — absolutely positioned so it never wraps */}
                <span
                    className={"material-symbols-outlined" + " " + "absolute! right-[10px]! top-[50%]! [transform:translateY(-50%)]! text-[18px]! [color:var(--color-slate-400)]! pointer-events-none! leading-[1]!"}

                >
                    calendar_today
                </span>
            </div>

            {isOpen && (portal ? createPortal(calendarPopover, document.body) : calendarPopover)}
        </div>
    );
}
