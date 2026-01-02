import { useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';

export const useHeaderActions = () => {
  const handleDropdownPress = useCallback(() => {
    useUIStore.getState().setShowOptionsMenu(true);
  }, []);

  const handleMenuPress = useCallback(() => {
    useUIStore.getState().setShowSettings(true);
  }, []);

  const handleToggleUserList = useCallback(() => {
    const currentValue = useUIStore.getState().showUserList;
    useUIStore.getState().setShowUserList(!currentValue);
  }, []);

  return {
    handleDropdownPress,
    handleMenuPress,
    handleToggleUserList,
  };
};
