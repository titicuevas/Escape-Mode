import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { PageSkeleton } from '../components/Skeleton';
import { useAuth } from '../providers/AuthProvider';

const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const DiscoverPage = lazy(() =>
  import('../pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })),
);
const CalendarPage = lazy(() =>
  import('../pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
const ReleasesPage = lazy(() =>
  import('../pages/ReleasesPage').then((m) => ({ default: m.ReleasesPage })),
);
const InterestPage = lazy(() =>
  import('../pages/InterestPage').then((m) => ({ default: m.InterestPage })),
);
const GameNewPage = lazy(() =>
  import('../pages/GameNewPage').then((m) => ({ default: m.GameNewPage })),
);
const GameDetailPage = lazy(() =>
  import('../pages/GameDetailPage').then((m) => ({ default: m.GameDetailPage })),
);
const GameEditPage = lazy(() =>
  import('../pages/GameEditPage').then((m) => ({ default: m.GameEditPage })),
);
const ReservationsPage = lazy(() =>
  import('../pages/ReservationsPage').then((m) => ({ default: m.ReservationsPage })),
);
const BudgetPage = lazy(() =>
  import('../pages/BudgetPage').then((m) => ({ default: m.BudgetPage })),
);
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const ListsPage = lazy(() =>
  import('../pages/ListsPage').then((m) => ({ default: m.ListsPage })),
);

function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageSkeleton label="Cargando sesión" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <LazyPage>
                <DashboardPage />
              </LazyPage>
            }
          />
          <Route
            path="discover"
            element={
              <LazyPage>
                <DiscoverPage />
              </LazyPage>
            }
          />
          <Route
            path="calendar"
            element={
              <LazyPage>
                <CalendarPage />
              </LazyPage>
            }
          />
          <Route
            path="releases"
            element={
              <LazyPage>
                <ReleasesPage />
              </LazyPage>
            }
          />
          <Route
            path="reservations"
            element={
              <LazyPage>
                <ReservationsPage />
              </LazyPage>
            }
          />
          <Route
            path="lists"
            element={
              <LazyPage>
                <ListsPage />
              </LazyPage>
            }
          />
          <Route
            path="interest"
            element={
              <LazyPage>
                <InterestPage />
              </LazyPage>
            }
          />
          <Route
            path="games/new"
            element={
              <LazyPage>
                <GameNewPage />
              </LazyPage>
            }
          />
          <Route
            path="games/:id"
            element={
              <LazyPage>
                <GameDetailPage />
              </LazyPage>
            }
          />
          <Route
            path="games/:id/edit"
            element={
              <LazyPage>
                <GameEditPage />
              </LazyPage>
            }
          />
          <Route
            path="budget"
            element={
              <LazyPage>
                <BudgetPage />
              </LazyPage>
            }
          />
          <Route
            path="settings"
            element={
              <LazyPage>
                <SettingsPage />
              </LazyPage>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
