import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../api';
import { connectSocket, disconnectSocket } from '../../utils/socket';
import {
  setUnreadCount, incrementUnread, markOneReadLocal, markAllReadLocal,
} from '../../store/slices/notificationSlice';
import { NOTIFICATION_TYPE_META, getNotificationLink, timeAgo } from '../../utils/notifications';

// Real-time push (Socket.io) delivers new notifications instantly. This poll
// is just a resilience fallback in case a socket drops and misses an event.
const FALLBACK_POLL_INTERVAL = 60000;

export default function NotificationBell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const unreadCount = useSelector(s => s.notifications.unreadCount);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Notifications are tenant-scoped; super_admin has no school context.
  const enabled = !!user && user.role !== 'super_admin';

  const fetchUnreadCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const { data } = await notificationAPI.getUnreadCount();
      dispatch(setUnreadCount(data.data.count));
    } catch { /* silent — non-critical background poll */ }
  }, [enabled, dispatch]);

  const fetchList = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data } = await notificationAPI.getAll({ limit: 8 });
      setList(data.data.notifications || []);
      dispatch(setUnreadCount(data.data.unreadCount || 0));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [enabled, dispatch]);

  // Initial fetch + low-frequency fallback poll
  useEffect(() => {
    if (!enabled) return;
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, FALLBACK_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [enabled, fetchUnreadCount]);

  // Real-time push via Socket.io
  useEffect(() => {
    if (!enabled) return;
    const socket = connectSocket();

    const handleNew = (n) => {
      setList(prev => [n, ...prev].slice(0, 8));
      dispatch(incrementUnread());
      const meta = NOTIFICATION_TYPE_META[n.type] || NOTIFICATION_TYPE_META.general;
      toast(n.title, { icon: meta.icon, duration: 4000 });
    };

    // Keeps this tab in sync when the same user marks something read from
    // another tab or device.
    const handleRead = ({ id }) => {
      let changed = false;
      setList(prev => prev.map(x => {
        if (x._id === id && !x.isRead) { changed = true; return { ...x, isRead: true }; }
        return x;
      }));
      if (changed) dispatch(markOneReadLocal());
    };
    const handleAllRead = () => {
      setList(prev => prev.map(x => ({ ...x, isRead: true })));
      dispatch(markAllReadLocal());
    };

    socket.on('notification:new', handleNew);
    socket.on('notification:read', handleRead);
    socket.on('notification:all-read', handleAllRead);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:read', handleRead);
      socket.off('notification:all-read', handleAllRead);
      disconnectSocket();
    };
  }, [enabled, dispatch]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!enabled) return null;

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  };

  const handleItemClick = (n) => {
    if (!n.isRead) {
      setList(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
      dispatch(markOneReadLocal());
      notificationAPI.markRead(n._id).catch(() => {});
    }
    setOpen(false);
    navigate(getNotificationLink(n.type, user.role));
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setList(prev => prev.map(x => ({ ...x, isRead: true })));
    dispatch(markAllReadLocal());
    try { await notificationAPI.markAllRead(); } catch { /* silent */ }
  };

  const handleViewAll = () => {
    setOpen(false);
    const prefix = user.role === 'school_admin' ? '' : `/${user.role}`;
    navigate(`${prefix}/notifications`);
  };

  return (
    <div className="notif-bell-wrapper" ref={wrapperRef}>
      <button
        className="topbar-icon-btn"
        aria-label="Notifications"
        onClick={toggleOpen}
      >
        🔔
        {unreadCount > 0 && <span className="topbar-notif-dot" />}
      </button>

      {open && (
        <div className="notif-dropdown" role="menu">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-dropdown-body">
            {loading ? (
              <div className="notif-empty">Loading…</div>
            ) : list.length === 0 ? (
              <div className="notif-empty">
                <span style={{ fontSize: '1.5rem' }}>🔔</span>
                <p>You're all caught up!</p>
              </div>
            ) : (
              list.map(n => {
                const meta = NOTIFICATION_TYPE_META[n.type] || NOTIFICATION_TYPE_META.general;
                return (
                  <div
                    key={n._id}
                    className={`notif-item ${n.isRead ? '' : 'unread'}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <div className={`notif-item-icon notif-icon-${meta.color}`}>{meta.icon}</div>
                    <div className="notif-item-body">
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-message">{n.message}</div>
                      <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && <span className="notif-item-dot" />}
                  </div>
                );
              })
            )}
          </div>

          <div className="notif-dropdown-footer" onClick={handleViewAll}>
            View all notifications
          </div>
        </div>
      )}
    </div>
  );
}
