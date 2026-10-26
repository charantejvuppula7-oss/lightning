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
    style = {},
    position = 'bottom',
    portal = false,
    className = '',
    id,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [computedPosition, setComputedPosition] = useState(position);
    const [alignRight, setAlignRight] = useState(false);
    const [portalPosition, setPortalPosition] = useState({ top: 0, left: 0 });
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const calendarRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

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

    // Styling — spread `style` first so callers can override cosmetic props
    // (height, border, borderRadius, etc.), but layout-critical flex properties
    // are always enforced after so the icon never drops below the text.
    const inputStyle = {
        width: '100%',
        height: '42px',
        borderRadius: '8px',
        border: disabled ? '1px solid var(--color-slate-200)' : '1px solid #d1d5db',
        padding: '0 10px 0 12px',
        fontSize: '14px',
        color: disabled ? 'var(--color-slate-500)' : (normalizedValue ? 'var(--color-slate-800)' : 'var(--color-slate-400)'),
        backgroundColor: disabled ? 'var(--color-slate-50)' : 'var(--color-white)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease',
        boxShadow: 'none',
        ...style,
        // ↓ Always enforced — prevents icon from wrapping below text
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        gap: '6px',
        overflow: 'hidden',
    };

    const inputHoverStyle = {
        borderColor: disabled ? 'var(--color-slate-200)' : 'var(--color-primary)',
    };

    const inputFocusStyle = {
        borderColor: 'var(--color-primary)',
        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.15)',
        outline: 'none'
    };

    const calendarStyle = {
        position: portal ? 'fixed' : 'absolute',
        ...(portal
            ? { top: `${portalPosition.top}px`, left: `${portalPosition.left}px` }
            : computedPosition === 'top' ? { bottom: '48px' } : { top: '48px' }),
        ...(!portal && alignRight ? { right: 0, left: 'auto' } : {}),
        zIndex: portal ? 1300 : 1100,
        background: 'var(--color-white)',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        padding: '20px',
        width: '290px',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        border: '1px solid #eef2f7',
        userSelect: 'none',
    };

    const calendarPopover = (
                <div ref={calendarRef} style={calendarStyle}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                    }}>
                        <button
                            type="button"
                            disabled={!canGoPrevMonth()}
                            onClick={handlePrevMonth}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: !canGoPrevMonth() ? 'not-allowed' : 'pointer',
                                color: !canGoPrevMonth() ? 'var(--color-slate-300)' : 'var(--color-slate-400)',
                                fontSize: '18px',
                                fontWeight: '600',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                transition: 'all 0.15s',
                                opacity: !canGoPrevMonth() ? 0.35 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (canGoPrevMonth()) {
                                    e.currentTarget.style.background = 'var(--color-slate-100)';
                                    e.currentTarget.style.color = 'var(--color-slate-700)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.color = !canGoPrevMonth() ? 'var(--color-slate-300)' : 'var(--color-slate-400)';
                            }}
                            title={!canGoPrevMonth() ? 'Previous months are blocked' : 'Previous month'}
                        >
                            ‹
                        </button>

                        <span style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#111827',
                        }}>
                            {MONTH_NAMES[currentMonth]} {currentYear}
                        </span>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-slate-400)',
                                fontSize: '18px',
                                fontWeight: '600',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-slate-100)'; e.currentTarget.style.color = 'var(--color-slate-700)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-slate-400)'; }}
                            title="Next month"
                        >
                            ›
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px',
                        marginBottom: '8px',
                        textAlign: 'center'
                    }}>
                        {DAY_HEADERS.map((day, idx) => (
                            <span
                                key={idx}
                                style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: 'var(--color-slate-400)',
                                    padding: '4px 0'
                                }}
                            >
                                {day}
                            </span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px',
                        textAlign: 'center'
                    }}>
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

                            let cellStyle = {
                                width: '34px',
                                height: '34px',
                                margin: '0 auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                fontWeight: '500',
                                borderRadius: '9px',
                                border: 'none',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                                boxSizing: 'border-box',
                                background: 'transparent',
                                color: isDisabled ? 'var(--color-slate-300)' : (isWeekEnd ? 'var(--color-primary-light)' : '#374151'),
                                opacity: isDisabled ? 0.35 : 1,
                            };

                            if (isSelected) {
                                cellStyle = {
                                    ...cellStyle,
                                    color: 'var(--color-white)',
                                    backgroundColor: 'var(--color-primary)',
                                    fontWeight: '700',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                    opacity: 1,
                                };
                            } else if (isToday) {
                                cellStyle = {
                                    ...cellStyle,
                                    border: '1.5px solid var(--color-slate-300)',
                                    fontWeight: '700'
                                };
                            }

                            const handleMouseEnter = (e) => {
                                if (!isDisabled && !isSelected) {
                                    e.currentTarget.style.backgroundColor = '#f0f4ff';
                                }
                            };

                            const handleMouseLeave = (e) => {
                                if (!isDisabled && !isSelected) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            };

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => !isDisabled && handleSelectDay(item.day)}
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                    style={cellStyle}
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
        <div ref={containerRef} className={className} style={{ position: 'relative', width: '100%' }}>
            {/* Input display area */}
            <div
                ref={inputRef}
                id={id}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onMouseEnter={() => !disabled && setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => !disabled && setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    ...inputStyle,
                    ...((isHovered || isFocused) && !disabled ? inputHoverStyle : {}),
                    ...(isFocused && !disabled ? inputFocusStyle : {}),
                    position: 'relative',
                }}
                tabIndex={disabled ? -1 : 0}
                role="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={placeholder}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', paddingRight: '28px' }}>
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
                        <span style={{ color: 'var(--color-slate-400)' }}>{placeholder}</span>
                    )}
                </span>
                {/* Calendar icon — absolutely positioned so it never wraps */}
                <span
                    className="material-symbols-outlined"
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '18px',
                        color: 'var(--color-slate-400)',
                        pointerEvents: 'none',
                        lineHeight: 1,
                    }}
                >
                    calendar_today
                </span>
            </div>

            {isOpen && (portal ? createPortal(calendarPopover, document.body) : calendarPopover)}
        </div>
    );
}
