import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar, toggleMobileSidebar, closeMobileSidebar, setSidebarCollapsed } from '../../store/slices/uiSlice';
import { loadAppSettings } from '../../pages/shared/ProfileSettingsPage';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const dispatch = useDispatch();
  const { sidebarCollapsed, mobileSidebarOpen } = useSelector(s => s.ui);

  // Apply compact sidebar setting from user's app settings on mount
  useEffect(() => {
    const settings = loadAppSettings();
    if (settings.compactSidebar) {
      dispatch(setSidebarCollapsed(true));
    }
  }, [dispatch]);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileSidebarOpen ? 'visible' : ''}`}
        onClick={() => dispatch(closeMobileSidebar())}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onClose={() => dispatch(closeMobileSidebar())}
      />

      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Topbar
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => dispatch(toggleSidebar())}
          onToggleMobile={() => dispatch(toggleMobileSidebar())}
        />
        <main className="page-content fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
