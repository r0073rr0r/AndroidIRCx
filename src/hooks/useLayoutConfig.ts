import { useEffect, useState } from 'react';
import { layoutService } from '../services/LayoutService';

export const useLayoutConfig = () => {
  const [layoutConfig, setLayoutConfig] = useState(layoutService.getConfig());

  useEffect(() => {
    const unsubscribe = layoutService.onConfigChange((config) => {
      setLayoutConfig(config);
    });
    return unsubscribe;
  }, []);

  return layoutConfig;
};
