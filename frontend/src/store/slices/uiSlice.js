import { createSlice } from '@reduxjs/toolkit';
const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarCollapsed: false, mobileSidebarOpen: false },
  reducers: {
    toggleSidebar:       (s) => { s.sidebarCollapsed = !s.sidebarCollapsed; },
    toggleMobileSidebar: (s) => { s.mobileSidebarOpen = !s.mobileSidebarOpen; },
    closeMobileSidebar:  (s) => { s.mobileSidebarOpen = false; },
    setSidebarCollapsed: (s, a) => { s.sidebarCollapsed = a.payload; },
  },
});
export const { toggleSidebar, toggleMobileSidebar, closeMobileSidebar, setSidebarCollapsed } = uiSlice.actions;
export default uiSlice.reducer;
