/**
 * VoiceRecorder - Record audio messages with waveform visualization
 *
 * Features:
 * - Record button (hold to record, release to stop)
 * - Show recording duration timer
 * - Waveform animation during recording
 * - Play button to preview before sending
 * - Delete/re-record option
 * - Auto-stop after max duration (from settings)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useT } from '../i18n/transifex';
import { mediaSettingsService } from '../services/MediaSettingsService';
import RNFS from 'react-native-fs';
import Video from 'react-native-video';
import { Camera, useCameraDevice, useMicrophonePermission } from 'react-native-vision-camera';

interface VoiceRecorderProps {
  onRecordingComplete: (fileUri: string, duration: number) => void;
  onCancel: () => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'playing';

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
}) => {
  const t = useT();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [maxDuration, setMaxDuration] = useState(180); // Default 3 minutes
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const waveformAnimRef = useRef(new Animated.Value(0)).current;
  const waveformAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const cameraRef = useRef<Camera>(null);
  const recordingPathRef = useRef<string | null>(null);
  
  // Use camera device for audio recording (react-native-vision-camera supports audio-only recording)
  const device = useCameraDevice('back');
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();

  // Load max duration from settings
  useEffect(() => {
    const loadSettings = async () => {
      const maxDur = await mediaSettingsService.getVoiceMaxDuration();
      setMaxDuration(maxDur);
    };
    loadSettings();
  }, []);

  // Request microphone permission using react-native-vision-camera
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (!hasMicPermission) {
      const granted = await requestMicPermission();
      return granted;
    }
    return hasMicPermission;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setError(t('Microphone permission denied'));
        return;
      }

      setError(null);
      setState('recording');
      setDuration(0);

      // Generate file path
      const timestamp = Date.now();
      const filePath = `${RNFS.CachesDirectoryPath}/voice_${timestamp}.m4a`;
      setRecordingUri(filePath);

      // Start waveform animation
      startWaveformAnimation();

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          
          return newDuration;
        });
      }, 1000);

      // Start audio recording using react-native-vision-camera
      // Note: We use Camera component with audio-only mode
      if (cameraRef.current && device) {
        recordingPathRef.current = filePath;
        
        // Start recording audio-only video (will be saved as .m4a)
        await cameraRef.current.startRecording({
          fileType: 'mp4',
          videoCodec: 'h264',
          onRecordingFinished: async (video) => {
            try {
              // Copy audio file to cache directory
              let audioPath = video.path;
              if (!audioPath.startsWith('file://')) {
                audioPath = `file://${audioPath}`;
              }
              
              // Remove file:// prefix for RNFS operations
              const normalizedAudioPath = audioPath.replace('file://', '');
              const audioData = await RNFS.readFile(normalizedAudioPath, 'base64');
              await RNFS.writeFile(filePath, audioData, 'base64');
              
              console.log('[VoiceRecorder] Recording saved:', filePath);
              
              // Update recordingUri to the saved file path
              setRecordingUri(filePath);
            } catch (err) {
              console.error('[VoiceRecorder] Error saving recording:', err);
              setError(t('Failed to save recording'));
              setState('idle');
            }
          },
          onRecordingError: (error) => {
            console.error('[VoiceRecorder] Recording error:', error);
            setError(error.message || t('Recording failed'));
            setState('idle');
            
            // Stop duration timer
            if (durationIntervalRef.current) {
              clearInterval(durationIntervalRef.current);
              durationIntervalRef.current = null;
            }
            stopWaveformAnimation();
          },
        });
      } else {
        console.log('[VoiceRecorder] Camera not available, using placeholder');
      }
      
      console.log('[VoiceRecorder] Recording started:', filePath);
    } catch (err: any) {
      console.error('[VoiceRecorder] Start recording error:', err);
      setError(err.message || t('Failed to start recording'));
      setState('idle');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      stopWaveformAnimation();

      // Stop camera recording if active
      if (cameraRef.current && state === 'recording') {
        try {
          await cameraRef.current.stopRecording();
        } catch (err) {
          console.error('[VoiceRecorder] Error stopping recording:', err);
        }
      }

      console.log('[VoiceRecorder] Recording stopped');

      if (duration > 0 && recordingUri) {
        // Wait for file to be saved by onRecordingFinished callback
        // The callback copies the file to cache directory asynchronously
        let fileExists = false;
        let retries = 0;
        const maxRetries = 10; // Wait up to 1 second (10 x 100ms)

        while (!fileExists && retries < maxRetries) {
          const exists = await RNFS.exists(recordingUri);
          if (exists) {
            fileExists = true;
            break;
          }

          // Check alternative path if available
          if (recordingPathRef.current) {
            const pathExists = await RNFS.exists(recordingPathRef.current);
            if (pathExists) {
              setRecordingUri(recordingPathRef.current);
              fileExists = true;
              break;
            }
          }

          // Wait 100ms before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!fileExists) {
          console.warn('[VoiceRecorder] Recording file not found after', retries, 'retries');
          setError(t('Recording file not found'));
          setState('idle');
          return;
        }

        console.log('[VoiceRecorder] Recording file verified after', retries, 'retries');
        setState('recorded');
      } else {
        setState('idle');
        setRecordingUri(null);
      }
    } catch (err: any) {
      console.error('[VoiceRecorder] Stop recording error:', err);
      setError(err.message || t('Failed to stop recording'));
      setState('idle');
    }
  };

  // Start waveform animation
  const startWaveformAnimation = () => {
    waveformAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(waveformAnimRef, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(waveformAnimRef, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    waveformAnimationRef.current.start();
  };

  // Stop waveform animation
  const stopWaveformAnimation = () => {
    if (waveformAnimationRef.current) {
      waveformAnimationRef.current.stop();
      waveformAnimRef.setValue(0);
    }
  };

  // Play preview
  const playPreview = () => {
    if (!recordingUri) return;
    setState('playing');
    // Note: Actual playback would use audioRecorderPlayer
    // For now, we'll use react-native-video for playback
  };

  // Stop preview
  const stopPreview = () => {
    setState('recorded');
  };

  // Delete recording
  const deleteRecording = async () => {
    if (recordingUri) {
      try {
        const exists = await RNFS.exists(recordingUri);
        if (exists) {
          await RNFS.unlink(recordingUri);
        }
      } catch (err) {
        console.error('[VoiceRecorder] Delete error:', err);
      }
    }
    setState('idle');
    setDuration(0);
    setRecordingUri(null);
    setError(null);
  };

  // Send recording
  const sendRecording = async () => {
    if (recordingUri && duration > 0) {
      // Ensure file exists before sending
      try {
        const exists = await RNFS.exists(recordingUri);
        if (!exists) {
          setError(t('Recording file not found. Please record again.'));
          return;
        }
        
        // Return URI with file:// prefix for Android
        const fileUri = Platform.OS === 'android' ? `file://${recordingUri}` : recordingUri;
        onRecordingComplete(fileUri, duration);
      } catch (err: any) {
        console.error('[VoiceRecorder] Send recording error:', err);
        setError(err.message || t('Failed to send recording'));
      }
    }
  };

  // Format duration (MM:SS)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      stopWaveformAnimation();
      if (recordingUri) {
        RNFS.unlink(recordingUri).catch(() => {});
      }
    };
  }, []);

  // Render waveform bars
  const renderWaveform = () => {
    const bars = Array.from({ length: 20 }, (_, i) => {
      const delay = i * 50;
      const scale = waveformAnimRef.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
      });

      return (
        <Animated.View
          key={i}
          style={[
            styles.waveformBar,
            {
              transform: [{ scaleY: scale }],
              opacity: waveformAnimRef.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
            },
          ]}
        />
      );
    });

    return <View style={styles.waveformContainer}>{bars}</View>;
  };

  return (
    <View style={styles.container}>
      {/* Hidden camera for audio recording */}
      {device && hasMicPermission && (
        <Camera
          ref={cameraRef}
          style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}
          device={device}
          isActive={state === 'recording'}
          video={true}
          audio={true}
        />
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Waveform visualization */}
      {state === 'recording' && (
        <View style={styles.recordingContainer}>
          {renderWaveform()}
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          <Text style={styles.hintText}>
            {t('Release to stop recording')} ({formatDuration(maxDuration)} {t('max')})
          </Text>
        </View>
      )}

      {/* Recorded state */}
      {state === 'recorded' && recordingUri && (
        <View style={styles.recordedContainer}>
          <Text style={styles.recordedLabel}>{t('Recording complete')}</Text>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          
          {/* Audio preview player */}
          {recordingUri && (
            <Video
              source={{ uri: `file://${recordingUri}` }}
              audioOnly
              controls
              paused={state !== 'playing'}
              style={styles.audioPlayer}
            />
          )}

          <View style={styles.recordedActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.playButton]}
              onPress={state === 'playing' ? stopPreview : playPreview}>
              <Text style={styles.actionButtonText}>
                {state === 'playing' ? t('Stop') : t('Play')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={deleteRecording}>
              <Text style={styles.actionButtonText}>{t('Delete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Idle state */}
      {state === 'idle' && (
        <View style={styles.idleContainer}>
          <Text style={styles.idleLabel}>{t('Hold to record voice message')}</Text>
          <Text style={styles.idleHint}>
            {t('Max duration: {duration} seconds', { duration: maxDuration })}
          </Text>
        </View>
      )}

      {/* Control buttons */}
      <View style={styles.controlsContainer}>
        {state === 'idle' && (
          <TouchableOpacity
            style={[styles.recordButton, { backgroundColor: colors.error }]}
            onPressIn={startRecording}
            activeOpacity={0.8}>
            <Text style={styles.recordButtonText}>🎙️ {t('Hold to Record')}</Text>
          </TouchableOpacity>
        )}

        {state === 'recording' && (
          <TouchableOpacity
            style={[styles.stopButton, { backgroundColor: colors.error }]}
            onPress={stopRecording}
            activeOpacity={0.8}>
            <Text style={styles.stopButtonText}>⏹️ {t('Stop Recording')}</Text>
          </TouchableOpacity>
        )}

        {state === 'recorded' && (
          <>
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.primary }]}
              onPress={sendRecording}>
              <Text style={styles.sendButtonText}>✓ {t('Send')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onCancel}>
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                {t('Cancel')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {state === 'idle' && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}>
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              {t('Cancel')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    minHeight: 300,
  },
  errorContainer: {
    backgroundColor: colors.errorBackground || 'rgba(244, 67, 54, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  recordingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: 16,
  },
  waveformBar: {
    width: 3,
    height: 40,
    backgroundColor: colors.primary,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  durationText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 8,
  },
  hintText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  recordedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  recordedLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  audioPlayer: {
    width: '100%',
    height: 50,
    marginVertical: 16,
  },
  recordedActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.errorBackground || 'rgba(244, 67, 54, 0.2)',
  },
  actionButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  idleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  idleLabel: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  idleHint: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  controlsContainer: {
    marginTop: 20,
    gap: 12,
  },
  recordButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stopButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
