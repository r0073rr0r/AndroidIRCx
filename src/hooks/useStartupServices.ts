import { useEffect } from 'react';
import RNBootSplash from 'react-native-bootsplash';
import { ircService } from '../services/IRCService';
import { backgroundService } from '../services/BackgroundService';
import { notificationService } from '../services/NotificationService';
import { channelManagementService } from '../services/ChannelManagementService';
import { userManagementService } from '../services/UserManagementService';
import { messageReactionsService } from '../services/MessageReactionsService';
import { channelFavoritesService } from '../services/ChannelFavoritesService';
import { autoRejoinService } from '../services/AutoRejoinService';
import { autoVoiceService } from '../services/AutoVoiceService';
import { connectionProfilesService } from '../services/ConnectionProfilesService';
import { autoReconnectService } from '../services/AutoReconnectService';
import { connectionQualityService } from '../services/ConnectionQualityService';
import { bouncerService } from '../services/BouncerService';
import { layoutService } from '../services/LayoutService';
import { commandService } from '../services/CommandService';
import { performanceService } from '../services/PerformanceService';
import { themeService } from '../services/ThemeService';
import { scriptingService } from '../services/ScriptingService';

export const useStartupServices = () => {
  useEffect(() => {
    try {
      themeService.initialize();
    } catch (error) {
      console.error('Error initializing theme service:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        // Wait longer to ensure app is fully initialized and rendered
        await new Promise<void>(resolve => setTimeout(resolve, 500));
        await scriptingService.initialize();
        // Only hide if component is still mounted
        await RNBootSplash.hide({ fade: true });
      } catch (error) {
        console.error('Error hiding bootsplash:', error);
        // Try to hide without fade as fallback
        try {
          await new Promise<void>(resolve => setTimeout(resolve, 100));
          await RNBootSplash.hide({ fade: false });
        } catch (e) {
          console.error('Error hiding bootsplash (fallback):', e);
          // Last resort - try without any options
          try {
            await RNBootSplash.hide();
          } catch (finalError) {
            console.error('Error hiding bootsplash (final fallback):', finalError);
          }
        }
      }
    };
    // Delay initialization slightly to ensure React Native is ready
    const timeout = setTimeout(init, 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    messageReactionsService.initialize();
  }, []);

  useEffect(() => {
    channelFavoritesService.initialize();
  }, []);

  useEffect(() => {
    autoRejoinService.initialize();
    autoVoiceService.initialize();
  }, []);

  useEffect(() => {
    connectionProfilesService.initialize();
  }, []);

  useEffect(() => {
    autoReconnectService.initialize();
  }, []);

  useEffect(() => {
    // Services will be initialized per-connection via ConnectionManager
    // Keep singleton initialization for backward compatibility
    connectionQualityService.setIRCService(ircService);
    connectionQualityService.initialize();
  }, []);

  useEffect(() => {
    bouncerService.initialize();
  }, []);

  useEffect(() => {
    layoutService.initialize();
  }, []);

  useEffect(() => {
    // Services will be initialized per-connection via ConnectionManager
    // Keep singleton initialization for backward compatibility
    commandService.setIRCService(ircService);
    commandService.initialize();
  }, []);

  useEffect(() => {
    performanceService.initialize();
  }, []);

  useEffect(() => {
    const initBackgroundService = async () => {
      try {
        await notificationService.initialize();
      } catch (error) {
        console.error('Error initializing notification service:', error);
        // Continue even if notification setup fails
      }

      try {
        await backgroundService.initialize();
      } catch (error) {
        console.error('Error initializing background service:', error);
        // Continue without background service if it fails
      }
    };
    initBackgroundService();

    // Initialize channel management service
    try {
      channelManagementService.initialize();
    } catch (error) {
      console.error('Error initializing channel management service:', error);
    }

    // Initialize user management service
    try {
      // Services will be initialized per-connection via ConnectionManager
      // Keep singleton initialization for backward compatibility
      userManagementService.setIRCService(ircService);
      userManagementService.initialize();
    } catch (error) {
      console.error('Error initializing user management service:', error);
    }

    return () => {
      try {
        backgroundService.cleanup();
      } catch (error) {
        console.error('Error cleaning up background service:', error);
      }
    };
  }, []);
};
