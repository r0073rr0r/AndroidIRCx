import { useEffect } from 'react';
import type { UserManagementService } from '../services/UserManagementService';

interface UseUserManagementNetworkSyncParams {
  networkName: string;
  getActiveUserManagementService: () => UserManagementService;
}

export const useUserManagementNetworkSync = (
  params: UseUserManagementNetworkSyncParams,
) => {
  const { networkName, getActiveUserManagementService } = params;

  useEffect(() => {
    if (networkName && networkName !== 'Not connected') {
      const activeUserMgmt = getActiveUserManagementService();
      activeUserMgmt.setNetwork(networkName);
    }
  }, [networkName, getActiveUserManagementService]);
};
