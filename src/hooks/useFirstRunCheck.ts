import { useEffect } from 'react';
import { settingsService } from '../services/SettingsService';

interface UseFirstRunCheckParams {
  setShowFirstRunSetup: (value: boolean) => void;
  setIsCheckingFirstRun: (value: boolean) => void;
}

export const useFirstRunCheck = (params: UseFirstRunCheckParams) => {
  const { setShowFirstRunSetup, setIsCheckingFirstRun } = params;

  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        const isFirstRun = await settingsService.isFirstRun();
        setShowFirstRunSetup(isFirstRun);
        setIsCheckingFirstRun(false);
      } catch (error) {
        console.error('Error checking first run:', error);
        setIsCheckingFirstRun(false);
      }
    };
    checkFirstRun();
  }, [setIsCheckingFirstRun, setShowFirstRunSetup]);
};
