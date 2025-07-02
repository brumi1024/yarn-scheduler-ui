import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useEffect } from 'react';
import { useSchedulerStore } from '../store/schedulerStore';

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
});

function LayoutComponent() {
  const location = useLocation();
  const loadInitialData = useSchedulerStore((state) => state.loadInitialData);

  useEffect(() => {
    // Initialize V4 scheduler store data when app starts
    loadInitialData().catch((error) => {
      console.error('Failed to load initial data:', error);
    });
  }, [loadInitialData]);

  // Use full width for queue tree (main dashboard), normal width for other pages
  const isQueueTreePage = location.pathname === '/' || location.pathname.startsWith('/queue');
  const pageContainerProps = isQueueTreePage 
    ? { maxWidth: false, disableGutters: true, breadcrumbs: [], title: false }
    : {};

  return (
    <DashboardLayout>
      <PageContainer {...pageContainerProps}>
        <Outlet />
      </PageContainer>
    </DashboardLayout>
  );
}