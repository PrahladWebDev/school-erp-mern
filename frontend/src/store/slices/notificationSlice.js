import { createSlice } from '@reduxjs/toolkit';

// Only the unread count needs to live in global state: it's shown in the
// Topbar bell badge and must stay in sync no matter which page (dropdown
// preview or the full Notifications page) marks something as read.
const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { unreadCount: 0 },
  reducers: {
    setUnreadCount:   (s, a) => { s.unreadCount = Math.max(0, a.payload); },
    incrementUnread:  (s)    => { s.unreadCount += 1; },
    markOneReadLocal: (s)    => { s.unreadCount = Math.max(0, s.unreadCount - 1); },
    markAllReadLocal: (s)    => { s.unreadCount = 0; },
  },
});

export const { setUnreadCount, incrementUnread, markOneReadLocal, markAllReadLocal } = notificationSlice.actions;
export default notificationSlice.reducer;
