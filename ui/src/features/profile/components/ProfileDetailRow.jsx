import React from 'react';

const styles = {
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid var(--color-slate-50)',
  },
  labelCol: {
    width: '220px',
    fontSize: '13.5px',
    fontWeight: '600',
    color: 'var(--color-slate-900)',
    flexShrink: 0,
  },
  valueCol: {
    fontSize: '13.5px',
    color: 'var(--color-slate-700)',
    flex: 1,
  },
};

export default function ProfileDetailRow({
  label,
  value,
  required = false,
  children,
  isLast = false,
  style,
  labelStyle,
  valueStyle,
}) {
  return (
    <div
      style={{
        ...styles.detailRow,
        ...(isLast ? { borderBottom: 'none' } : {}),
        ...style,
      }}
    >
      <div style={{ ...styles.labelCol, ...labelStyle }}>
        {label}
        {required && <span style={{ color: 'var(--color-danger)', marginLeft: '3px' }}>*</span>}
      </div>
      <div style={{ ...styles.valueCol, ...valueStyle }}>
        {children !== undefined ? children : (value || '—')}
      </div>
    </div>
  );
}
