import { useEffect } from 'react';
import { dccFileService } from '../services/DCCFileService';

interface UseDccNotificationsProps {
  safeAlert: (title: string, message: string) => void;
  t: (key: string, params?: any) => string;
  setDccTransfers: (transfers: any[]) => void;
  isMountedRef: React.MutableRefObject<boolean>;
}

/**
 * Hook to handle DCC transfer notifications
 */
export function useDccNotifications({
  safeAlert,
  t,
  setDccTransfers,
  isMountedRef,
}: UseDccNotificationsProps) {
  useEffect(() => {
    const unsub = dccFileService.onTransferUpdate((transfer) => {
      if (transfer.status === 'completed') {
        safeAlert(
          t('DCC Transfer Complete', { _tags: 'screen:app,file:App.tsx,feature:dcc' }),
          t(
            '{filename} received ({bytes} bytes).',
            {
              filename: transfer.offer.filename,
              bytes: transfer.bytesReceived,
              _tags: 'screen:app,file:App.tsx,feature:dcc',
            }
          )
        );
      } else if (transfer.status === 'failed') {
        safeAlert(
          t('DCC Transfer Failed', { _tags: 'screen:app,file:App.tsx,feature:dcc' }),
          transfer.error || t('Transfer failed.', { _tags: 'screen:app,file:App.tsx,feature:dcc' })
        );
      }

      if (isMountedRef.current) {
        setDccTransfers(dccFileService.list());
      }
    });
    return () => unsub();
  }, [safeAlert, t, setDccTransfers, isMountedRef]);
}
