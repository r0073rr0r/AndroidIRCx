import { useCallback } from 'react';

interface UseAppLockActionsParams {
  appLockEnabled: boolean;
  appLockUseBiometric: boolean;
  appLocked: boolean;
  attemptBiometricUnlock: () => void;
  safeAlert: (title: string, message?: string, buttons?: any) => void;
  t: (key: string, options?: any) => string;
  setAppLocked: (value: boolean) => void;
  setAppUnlockModalVisible: (value: boolean) => void;
}

export const useAppLockActions = (params: UseAppLockActionsParams) => {
  const {
    appLockEnabled,
    appLockUseBiometric,
    appLocked,
    attemptBiometricUnlock,
    safeAlert,
    t,
    setAppLocked,
    setAppUnlockModalVisible,
  } = params;

  const handleLockButtonPress = useCallback(() => {
    if (!appLockEnabled) {
      safeAlert(
        t('App lock disabled', { _tags: 'screen:app,file:App.tsx,feature:lock' }),
        t('Enable app lock first.', { _tags: 'screen:app,file:App.tsx,feature:lock' })
      );
      return;
    }
    if (appLocked) {
      if (appLockUseBiometric) {
        attemptBiometricUnlock();
      } else {
        setAppUnlockModalVisible(true);
      }
      return;
    }
    setAppLocked(true);
    setAppUnlockModalVisible(true);
  }, [
    appLockEnabled,
    appLockUseBiometric,
    appLocked,
    attemptBiometricUnlock,
    safeAlert,
    setAppLocked,
    setAppUnlockModalVisible,
    t,
  ]);

  return { handleLockButtonPress };
};
