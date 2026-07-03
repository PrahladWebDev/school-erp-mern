import React from 'react';

// ─── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, change, changeType = 'up', color = '#1e3a5f', bg = '#e8f0fe' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg, color }}>
        <span>{icon}</span>
      </div>
      <div className="stat-info">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
        {change && (
          <div className={`stat-change ${changeType}`}>
            {changeType === 'up' ? '↑' : '↓'} {change}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = '', footer }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  const items = [];
  const delta = 2;
  const left = Math.max(2, page - delta);
  const right = Math.min(pages - 1, page + delta);

  items.push(1);
  if (left > 2) items.push('...');
  for (let i = left; i <= right; i++) items.push(i);
  if (right < pages - 1) items.push('...');
  if (pages > 1) items.push(pages);

  return (
    <div className="pagination">
      <button className="pagination-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
      {items.map((item, i) =>
        item === '...'
          ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)' }}>…</span>
          : <button key={item} className={`pagination-btn ${page === item ? 'active' : ''}`} onClick={() => onPage(item)}>{item}</button>
      )}
      <button className="pagination-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  );
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = '' }) {
  return <div className={`spinner ${size}`} role="status" aria-label="Loading" />;
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="page-loader">
      <div className="spinner spinner-lg" />
      <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>{message}</p>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title = 'No data found', description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p style={{ fontSize: '0.875rem', maxWidth: 320 }}>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, type = 'gray' }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

export const STATUS_BADGE = {
  active:      <Badge type="success">Active</Badge>,
  inactive:    <Badge type="gray">Inactive</Badge>,
  transferred: <Badge type="info">Transferred</Badge>,
  graduated:   <Badge type="primary">Graduated</Badge>,
  present:     <Badge type="success">Present</Badge>,
  absent:      <Badge type="danger">Absent</Badge>,
  late:        <Badge type="warning">Late</Badge>,
  leave:       <Badge type="info">Leave</Badge>,
  paid:        <Badge type="success">Paid</Badge>,
  pending:     <Badge type="warning">Pending</Badge>,
  partial:     <Badge type="info">Partial</Badge>,
  overdue:     <Badge type="danger">Overdue</Badge>,
  pass:        <Badge type="success">Pass</Badge>,
  fail:        <Badge type="danger">Fail</Badge>,
  approved:    <Badge type="success">Approved</Badge>,
  rejected:    <Badge type="danger">Rejected</Badge>,
};

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--gray-600)' }}>{message}</p>
    </Modal>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ src, name, size = 'md', color = '#1e3a5f' }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  if (src) return <img src={src} alt={name} className={`avatar avatar-${size}`} />;
  return (
    <div className={`avatar avatar-${size}`} style={{ background: color + '22', color }}>
      {initials}
    </div>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, type = '' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const t = pct >= 75 ? 'success' : pct >= 50 ? '' : pct >= 25 ? 'warning' : 'danger';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className={`progress-fill ${type || t}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-600)', minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
export function Card({ title, children, action, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Search Input ──────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        className="form-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, activeTab, onTab }) {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onTab(tab.key)}
        >
          {tab.icon && <span style={{ marginRight: 6 }}>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span style={{ marginLeft: 6, fontSize: '0.72rem', background: 'var(--gray-200)', padding: '1px 6px', borderRadius: 999 }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export { default as LocationPickerMap } from './LocationPickerMap';
