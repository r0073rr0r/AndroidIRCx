/**
 * MediaSection - Settings for encrypted media sharing
 * 
 * Features:
 * - Master toggle to enable/disable media sharing
 * - Encryption indicator toggle
 * - Auto-download preferences
 * - Cache management
 * - Quality settings
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Alert, View, Text, TouchableOpacity, Switch } from 'react-native';
import { SettingItem } from '../SettingItem';
import { useT } from '../../../i18n/transifex';
import { SettingItem as SettingItemType, SettingIcon } from '../../../types/settings';
import { mediaSettingsService } from '../../../services/MediaSettingsService';
import { mediaCacheService } from '../../../services/MediaCacheService';

interface MediaSectionProps {
  colors: {
    text: string;
    textSecondary: string;
    primary: string;
    surface: string;
    border: string;
    background: string;
  };
  styles: {
    settingItem: any;
    settingContent: any;
    settingTitleRow: any;
    settingTitle: any;
    settingDescription: any;
    disabledItem: any;
    disabledText: any;
    chevron: any;
    input?: any;
    disabledInput?: any;
  };
  settingIcons: Record<string, SettingIcon | undefined>;
}

export const MediaSection: React.FC<MediaSectionProps> = ({
  colors,
  styles,
  settingIcons,
}) => {
  const t = useT();
  const tags = 'screen:settings,file:MediaSection.tsx,feature:settings';
  
  const [mediaEnabled, setMediaEnabled] = useState(true);
  const [showEncryptionIndicator, setShowEncryptionIndicator] = useState(true);
  const [autoDownload, setAutoDownload] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [maxCacheSize, setMaxCacheSize] = useState(250 * 1024 * 1024); // 250MB default
  const [mediaQuality, setMediaQuality] = useState<'Original' | 'High' | 'Medium' | 'Low'>('Original');
  const [videoQuality, setVideoQuality] = useState<'4K' | '1080p' | '720p' | '480p'>('1080p');
  const [voiceMaxDuration, setVoiceMaxDuration] = useState(180); // 3 minutes default
  const [cacheSize, setCacheSize] = useState(0);

  // Load initial state
  useEffect(() => {
    const loadSettings = async () => {
      const enabled = await mediaSettingsService.isMediaEnabled();
      setMediaEnabled(enabled);
      
      const showIndicator = await mediaSettingsService.shouldShowEncryptionIndicator();
      setShowEncryptionIndicator(showIndicator);
      
      const autoDownloadSetting = await mediaSettingsService.getAutoDownload();
      setAutoDownload(autoDownloadSetting);
      
      const wifiOnlySetting = await mediaSettingsService.getWiFiOnly();
      setWifiOnly(wifiOnlySetting);
      
      const cacheSizeSetting = await mediaSettingsService.getMaxCacheSize();
      setMaxCacheSize(cacheSizeSetting);
      
      const quality = await mediaSettingsService.getMediaQuality();
      setMediaQuality(quality as 'Original' | 'High' | 'Medium' | 'Low');
      
      const videoQual = await mediaSettingsService.getVideoQuality();
      setVideoQuality(videoQual as '4K' | '1080p' | '720p' | '480p');
      
      const voiceDuration = await mediaSettingsService.getVoiceMaxDuration();
      setVoiceMaxDuration(voiceDuration);
      
      // Load cache size
      const size = await mediaCacheService.getCacheSize();
      setCacheSize(size);
    };
    
    loadSettings();
  }, []);

  const handleClearCache = async () => {
    Alert.alert(
      t('Clear Media Cache', { _tags: tags }),
      t('Are you sure you want to clear all cached media? This will free up storage space but media will need to be downloaded again.', { _tags: tags }),
      [
        { text: t('Cancel', { _tags: tags }), style: 'cancel' },
        {
          text: t('Clear', { _tags: tags }),
          style: 'destructive',
          onPress: async () => {
            try {
              await mediaCacheService.clearCache();
              const size = await mediaCacheService.getCacheSize();
              setCacheSize(size);
              Alert.alert(
                t('Cache Cleared', { _tags: tags }),
                t('Media cache has been cleared successfully.', { _tags: tags })
              );
            } catch (error) {
              Alert.alert(
                t('Error', { _tags: tags }),
                t('Failed to clear cache: {error}', { 
                  error: error instanceof Error ? error.message : String(error),
                  _tags: tags 
                })
              );
            }
          },
        },
      ]
    );
  };

  const formatCacheSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatMaxCacheSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${mb.toFixed(0)} MB`;
  };

  const sectionData: SettingItemType[] = useMemo(() => {
    const items: SettingItemType[] = [
      {
        id: 'media-enabled',
        title: t('Enable Encrypted Media Sharing', { _tags: tags }),
        description: mediaEnabled 
          ? t('Media sharing is enabled. Attachment button (📎) appears on encrypted conversations.', { _tags: tags })
          : t('Media sharing is disabled. Attachment button will not appear.', { _tags: tags }),
        type: 'switch',
        value: mediaEnabled,
        onValueChange: async (value: boolean | string) => {
          const boolValue = value as boolean;
          setMediaEnabled(boolValue);
          await mediaSettingsService.setMediaEnabled(boolValue);
        },
      },
      {
        id: 'media-info',
        title: t('About Media Sharing', { _tags: tags }),
        description: t('Media sharing works only in encrypted conversations (DMs with key exchange or encrypted channels). All media is automatically encrypted using existing E2E keys.', { _tags: tags }),
        type: 'button' as const,
        disabled: true,
        onPress: () => {}, // No-op for info button
      },
      {
        id: 'media-encryption-indicator',
        title: t('Show Encryption Indicator', { _tags: tags }),
        description: t('Display 🔒 icon on media thumbnails to indicate encryption', { _tags: tags }),
        type: 'switch',
        value: showEncryptionIndicator,
        disabled: !mediaEnabled,
        onValueChange: async (value: boolean | string) => {
          const boolValue = value as boolean;
          setShowEncryptionIndicator(boolValue);
          await mediaSettingsService.setShowEncryptionIndicator(boolValue);
        },
      },
      {
        id: 'media-auto-download',
        title: t('Auto-Download Media', { _tags: tags }),
        description: t('Automatically download media when received', { _tags: tags }),
        type: 'switch',
        value: autoDownload,
        disabled: !mediaEnabled,
        onValueChange: async (value: boolean | string) => {
          const boolValue = value as boolean;
          setAutoDownload(boolValue);
          await mediaSettingsService.setAutoDownload(boolValue);
        },
      },
      {
        id: 'media-wifi-only',
        title: t('WiFi Only Downloads', { _tags: tags }),
        description: t('Only download media when connected to WiFi', { _tags: tags }),
        type: 'switch',
        value: wifiOnly,
        disabled: !mediaEnabled || !autoDownload,
        onValueChange: async (value: boolean | string) => {
          const boolValue = value as boolean;
          setWifiOnly(boolValue);
          await mediaSettingsService.setWiFiOnly(boolValue);
        },
      },
      {
        id: 'media-cache-size',
        title: t('Maximum Cache Size', { _tags: tags }),
        description: t('Current cache: {size} / Max: {max}', { 
          size: formatCacheSize(cacheSize),
          max: formatMaxCacheSize(maxCacheSize),
          _tags: tags 
        }),
        type: 'submenu',
        disabled: !mediaEnabled,
        submenuItems: [
          { id: 'cache-50mb', title: '50 MB', type: 'button' as const, onPress: () => setMaxCacheSize(50 * 1024 * 1024) },
          { id: 'cache-100mb', title: '100 MB', type: 'button' as const, onPress: () => setMaxCacheSize(100 * 1024 * 1024) },
          { id: 'cache-250mb', title: '250 MB', type: 'button' as const, onPress: () => setMaxCacheSize(250 * 1024 * 1024) },
          { id: 'cache-500mb', title: '500 MB', type: 'button' as const, onPress: () => setMaxCacheSize(500 * 1024 * 1024) },
          { id: 'cache-1gb', title: '1 GB', type: 'button' as const, onPress: () => setMaxCacheSize(1024 * 1024 * 1024) },
        ],
      },
      {
        id: 'media-quality',
        title: t('Media Quality', { _tags: tags }),
        description: t('Current: {quality}', { quality: mediaQuality, _tags: tags }),
        type: 'submenu',
        disabled: !mediaEnabled,
        submenuItems: [
          { id: 'quality-original', title: t('Original', { _tags: tags }), type: 'button' as const, onPress: () => setMediaQuality('Original') },
          { id: 'quality-high', title: t('High', { _tags: tags }), type: 'button' as const, onPress: () => setMediaQuality('High') },
          { id: 'quality-medium', title: t('Medium', { _tags: tags }), type: 'button' as const, onPress: () => setMediaQuality('Medium') },
          { id: 'quality-low', title: t('Low', { _tags: tags }), type: 'button' as const, onPress: () => setMediaQuality('Low') },
        ],
      },
      {
        id: 'video-quality',
        title: t('Video Recording Quality', { _tags: tags }),
        description: t('Current: {quality}', { quality: videoQuality, _tags: tags }),
        type: 'submenu',
        disabled: !mediaEnabled,
        submenuItems: [
          { id: 'video-4k', title: '4K', type: 'button' as const, onPress: () => setVideoQuality('4K') },
          { id: 'video-1080p', title: '1080p', type: 'button' as const, onPress: () => setVideoQuality('1080p') },
          { id: 'video-720p', title: '720p', type: 'button' as const, onPress: () => setVideoQuality('720p') },
          { id: 'video-480p', title: '480p', type: 'button' as const, onPress: () => setVideoQuality('480p') },
        ],
      },
      {
        id: 'voice-max-duration',
        title: t('Max Voice Message Duration', { _tags: tags }),
        description: t('Current: {duration} seconds', { duration: voiceMaxDuration, _tags: tags }),
        type: 'submenu',
        disabled: !mediaEnabled,
        submenuItems: [
          { id: 'voice-60s', title: t('1 minute', { _tags: tags }), type: 'button' as const, onPress: () => setVoiceMaxDuration(60) },
          { id: 'voice-180s', title: t('3 minutes', { _tags: tags }), type: 'button' as const, onPress: () => setVoiceMaxDuration(180) },
          { id: 'voice-300s', title: t('5 minutes', { _tags: tags }), type: 'button' as const, onPress: () => setVoiceMaxDuration(300) },
        ],
      },
      {
        id: 'media-clear-cache',
        title: t('Clear Media Cache', { _tags: tags }),
        description: t('Free up storage by clearing cached media files', { _tags: tags }),
        type: 'button',
        disabled: !mediaEnabled || cacheSize === 0,
        onPress: handleClearCache,
      },
    ];

    return items;
  }, [
    mediaEnabled,
    showEncryptionIndicator,
    autoDownload,
    wifiOnly,
    maxCacheSize,
    mediaQuality,
    videoQuality,
    voiceMaxDuration,
    cacheSize,
    t,
    tags,
  ]);

  // Save settings when they change
  useEffect(() => {
    const saveSettings = async () => {
      await mediaSettingsService.setMaxCacheSize(maxCacheSize);
      await mediaSettingsService.setMediaQuality(mediaQuality);
      await mediaSettingsService.setVideoQuality(videoQuality);
      await mediaSettingsService.setVoiceMaxDuration(voiceMaxDuration);
    };
    saveSettings();
  }, [maxCacheSize, mediaQuality, videoQuality, voiceMaxDuration]);

  return (
    <View>
      {sectionData.map((item) => (
        <SettingItem
          key={item.id}
          item={item}
          colors={colors}
          styles={styles}
          settingIcons={settingIcons}
        />
      ))}
    </View>
  );
};
