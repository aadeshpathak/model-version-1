// React hook for ML insights integration
// Provides ML-powered analytics without disrupting existing functionality

import { useState, useEffect, useCallback } from 'react';
import { mlInsightsService, type MLInsights, type MLConfiguration } from '@/lib/ml-insights';
import { useUser } from '@/context/UserContext';

export interface UseMLInsightsReturn {
  insights: MLInsights | null;
  isLoading: boolean;
  error: string | null;
  refreshInsights: () => Promise<void>;
  updateConfig: (config: Partial<MLConfiguration>) => void;
  config: MLConfiguration;
}

export const useMLInsights = (
  expenses: any[] = [],
  bills: any[] = [],
  members: any[] = [],
  notices: any[] = []
): UseMLInsightsReturn => {
  const { currentUser } = useUser();
  const [insights, setInsights] = useState<MLInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<MLConfiguration>(mlInsightsService.getConfig());

  // Generate insights when data changes
  const generateInsights = useCallback(async () => {
    if (currentUser !== 'admin') {
      return; // Only admins get ML insights
    }

    if (expenses.length === 0 && bills.length === 0) {
      setInsights(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newInsights = await mlInsightsService.generateInsights(expenses, bills, members, notices);
      setInsights(newInsights);
    } catch (err) {
      console.error('Error generating ML insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
      setInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, [expenses, bills, members, notices, currentUser]);

  // Refresh insights manually
  const refreshInsights = useCallback(async () => {
    await generateInsights();
  }, [generateInsights]);

  // Update ML configuration
  const updateConfig = useCallback((newConfig: Partial<MLConfiguration>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    mlInsightsService.updateConfig(newConfig);

    // Regenerate insights with new config
    if (insights) {
      generateInsights();
    }
  }, [config, insights, generateInsights]);

  // Auto-generate insights when data changes
  useEffect(() => {
    if (currentUser === 'admin') {
      const timeoutId = setTimeout(() => {
        generateInsights();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [generateInsights, currentUser]);

  return {
    insights,
    isLoading,
    error,
    refreshInsights,
    updateConfig,
    config
  };
};