import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Preferences, PreferencesUpdateInput } from '@grc/shared';
import { api } from '../api/client';
import { useAuth } from './AuthProvider';

interface PreferencesContextValue {
  preferences: Preferences | null;
  isLoading: boolean;
  update: (input: PreferencesUpdateInput) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const fallback: Preferences = {
  preferredPlatforms: ['PLAYSTATION_5'],
  defaultDiscoveryMonths: 12,
  defaultCalendarView: 'MONTHLY',
  defaultBudgetGrouping: 'RELEASE',
  hideDismissedGames: true,
  reduceMotion: false,
  browserNotifications: false,
  reminderDaysBefore: 7,
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['preferences'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const data = await api.getPreferences();
      return data.preferences;
    },
  });

  const mutation = useMutation({
    mutationFn: (input: PreferencesUpdateInput) => api.updatePreferences(input),
    onSuccess: (data) => {
      queryClient.setQueryData(['preferences'], data.preferences);
    },
  });

  const preferences = query.data ?? (isAuthenticated ? null : fallback);

  useEffect(() => {
    const reduce = preferences?.reduceMotion ?? false;
    document.documentElement.classList.toggle('reduce-motion', reduce);
    document.documentElement.dataset.reduceMotion = reduce ? 'true' : 'false';
  }, [preferences?.reduceMotion]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      isLoading: isAuthenticated && query.isLoading,
      update: async (input) => {
        await mutation.mutateAsync(input);
      },
    }),
    [preferences, isAuthenticated, query.isLoading, mutation],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences debe usarse dentro de PreferencesProvider');
  }
  return ctx;
}
