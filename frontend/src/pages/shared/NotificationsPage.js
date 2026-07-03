import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationAPI, classAPI } from '../../api';
import { Pagination, PageLoader, EmptyState, Modal, Tabs } from '../../components/common';
import { connectSocket } from '../../utils/socket';
import { setUnreadCount, markAllReadLocal, markOneReadLocal } from '../../store/slices/notificationSlice';
import { NOTIFICATION_TYPE_META, getNotificationLink, timeAgo } from '../../utils/notifications';

const ROLE_OPTIONS = [
  { key: 'school_admin', label: 'Admins' },
  { key: 'teacher', label: 'Teachers' },
  { key: 'parent', label: 'Parents' },
  { key: 'student', label: 'Students' },
];

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);

  // Must be declared BEFORE useState calls that reference them
  const canCompose = ['super_admin', 'school_admin', 'teacher'].includes(user?.role);
  // For school_admin: always include school_admin in recipients (and disable that checkbox)
  const isSchoolAdmin = user?.role === 'school_admin';
  // Initialize form with school_admin pre-checked if user is school_admin
  const defaultForm = {
    title: '', message: '', type: 'general', priority: 'normal',
    recipientRoles: isSchoolAdmin ? ['school_admin'] : [], targetClass: ''
  };

  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [classes, setClasses] = useState([]);
  const [composeModal, setComposeModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [form, setForm] = useState(defaultForm);

  // Keep stable refs for page/tab so socket handler can access latest values
  const pageRef = useRef(page);
  const tabRef = useRef(tab);
  pageRef.current = page;
  tabRef.current = tab;

  const load = useCallback(async (overridePage, overrideTab) => {
    setLoading(true);
    try {
      const p = overridePage ?? pageRef.current;
      const t = overrideTab ?? tabRef.current;
      const { data } = await notificationAPI.getAll({ page: p, limit: 15, unreadOnly: t === 'unread' });
      setNotifications(data.data.notifications || []);
      setPagination(data.data.pagination || {});
      dispatch(setUnreadCount(data.data.unreadCount || 0));
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  }, [dispatch]);

  useEffect(() => { load(page, tab); }, [page, tab]); // eslint-disable-line

  useEffect(() => {
    if (canCompose) classAPI.getAll({}).then(r => setClasses(r.data.data.classes || [])).catch(() => {});
  }, []); // eslint-disable-line

  // Real-time socket listeners
  useEffect(() => {
    const socket = connectSocket();

    // When a new notification arrives, if we're on page 1 reload immediately;
    // otherwise show the banner so we don't disrupt pagination.
    const handleNew = () => {
      if (pageRef.current === 1) {
        load(1, tabRef.current);
      } else {
        setHasNew(true);
      }
    };
    const handleRead = ({ id }) => {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    };
    const handleAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    socket.on('notification:new', handleNew);
    socket.on('notification:read', handleRead);
    socket.on('notification:all-read', handleAllRead);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:read', handleRead);
      socket.off('notification:all-read', handleAllRead);
    };
  }, [load]);

  const refresh = () => { setHasNew(false); setPage(1); load(1, tab); };

  const handleItemClick = async (n) => {
    if (!n.isRead) {
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
      dispatch(markOneReadLocal());
      notificationAPI.markRead(n._id).catch(() => {});
    }
    navigate(getNotificationLink(n.type, user.role));
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      dispatch(markAllReadLocal());
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to update'); }
  };

  const toggleRole = (role) => {
    // school_admin cannot uncheck their own role
    if (isSchoolAdmin && role === 'school_admin') return;
    setForm(f => ({
      ...f,
      recipientRoles: f.recipientRoles.includes(role)
        ? f.recipientRoles.filter(r => r !== role)
        : [...f.recipientRoles, role]
    }));
  };

  const handleCompose = async () => {
    if (!form.title || !form.message) return toast.error('Title and message are required');
    if (form.recipientRoles.length === 0 && !form.targetClass) {
      return toast.error('Select at least one recipient group or a class');
    }
    setSaving(true);
    try {
      await notificationAPI.create(form);
      toast.success('Notification sent!');
      setComposeModal(false);
      setForm(defaultForm);
      // Go to page 1 and reload so the newly published notification is visible immediately
      setPage(1);
      load(1, tab);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Notifications</h1>
          <p>{pagination.total || 0} total</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handleMarkAllRead}>Mark all read</button>
          {canCompose && <button className="btn btn-primary" onClick={() => setComposeModal(true)}>+ Compose</button>}
        </div>
      </div>

      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }]}
          activeTab={tab}
          onTab={(k) => { setTab(k); setPage(1); }}
        />
      </div>

      {hasNew && (
        <div className="notif-new-banner" onClick={refresh}>
          🔔 New notifications have arrived — click to refresh
        </div>
      )}

      {loading ? <PageLoader /> : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" description={tab === 'unread' ? "You're all caught up!" : 'Notifications will appear here as things happen.'} />
      ) : (
        <>
          <div className="card notif-list-card">
            {notifications.map(n => {
              const meta = NOTIFICATION_TYPE_META[n.type] || NOTIFICATION_TYPE_META.general;
              return (
                <div
                  key={n._id}
                  className={`notif-page-item ${n.isRead ? '' : 'unread'}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className={`notif-page-icon notif-icon-${meta.color}`}>{meta.icon}</div>
                  <div className="notif-page-body">
                    <div className="notif-page-title">{n.title}</div>
                    <div className="notif-page-message">{n.message}</div>
                    <div className="notif-page-meta">
                      <span className={`badge badge-${meta.color}`}>{meta.label}</span>
                      {n.priority === 'high' && <span className="badge badge-danger">High Priority</span>}
                      <span>{timeAgo(n.createdAt)}</span>
                      {n.createdByName && <span>by {n.createdByName}</span>}
                    </div>
                  </div>
                  {!n.isRead && <span className="notif-item-dot" style={{ marginTop: 6 }} />}
                </div>
              );
            })}
          </div>
          <Pagination page={page} pages={pagination.pages} onPage={setPage} />
        </>
      )}

      {/* Compose Modal (admin/teacher only) */}
      {canCompose && (
        <Modal isOpen={composeModal} onClose={() => setComposeModal(false)} title="Compose Notification"
          footer={<>
            <button className="btn btn-ghost" onClick={() => setComposeModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCompose} disabled={saving}>{saving ? 'Sending...' : 'Send Notification'}</button>
          </>}
        >
          <div className="form-group">
            <label className="form-label">Title <span className="required">*</span></label>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. PTM rescheduled" />
          </div>
          <div className="form-group">
            <label className="form-label">Message <span className="required">*</span></label>
            <textarea className="form-textarea" rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Write the notification message..." />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(NOTIFICATION_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Send to</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {ROLE_OPTIONS.map(r => {
                const isForced = isSchoolAdmin && r.key === 'school_admin';
                return (
                  <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--gray-700)', opacity: isForced ? 0.65 : 1 }}>
                    <input
                      type="checkbox"
                      checked={form.recipientRoles.includes(r.key)}
                      onChange={() => toggleRole(r.key)}
                      disabled={isForced}
                    />
                    {r.label}{isForced && ' (you)'}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Or target a specific class (students + parents)</label>
            <select className="form-select" value={form.targetClass} onChange={e => setForm(f => ({ ...f, targetClass: e.target.value }))}>
              <option value="">— No class targeting —</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
