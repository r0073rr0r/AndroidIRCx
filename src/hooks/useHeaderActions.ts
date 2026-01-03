import { useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';

export const useHeaderActions = () => {
  const handleDropdownPress = useCallback(() => {
    console.log('🔽 Dropdown menu pressed');
    const setShowOptionsMenu = useUIStore.getState().setShowOptionsMenu;
    setShowOptionsMenu(true);
    console.log('✅ Options menu state set to true');
  }, []);

  const handleMenuPress = useCallback(() => {
    console.log('☰ Hamburger menu pressed');
    useUIStore.getState().setShowSettings(true);
    console.log('✅ Settings state set to true, current state:', useUIStore.getState().showSettings);
  }, []);

  const handleToggleUserList = useCallback(() => {
    const currentValue = useUIStore.getState().showUserList;
    const setShowUserList = useUIStore.getState().setShowUserList;
    setShowUserList(!currentValue);
  }, []);

  return {
    handleDropdownPress,
    handleMenuPress,
    handleToggleUserList,
  };
};
