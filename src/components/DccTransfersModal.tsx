import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';

export interface DccTransfer {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'downloading' | 'sending' | 'failed' | 'cancelled' | 'completed';
  offer: {
    filename: string;
  };
  size?: number;
  bytesReceived: number;
  filePath?: string;
}

interface DccTransfersModalProps {
  visible: boolean;
  onClose: () => void;
  transfers: DccTransfer[];
  onAccept: (transferId: string, filePath: string) => Promise<void>;
  onCancel: (transferId: string) => void;
  styles: any;
}

export const DccTransfersModal: React.FC<DccTransfersModalProps> = ({
  visible,
  onClose,
  transfers,
  onAccept,
  onCancel,
  styles,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <Text style={styles.modalTitle}>DCC Transfers</Text>
          {transfers.length === 0 ? (
            <Text style={styles.optionText}>No transfers</Text>
          ) : (
            transfers.map(t => {
              const percent = t.size ? Math.min(100, Math.floor((t.bytesReceived / t.size) * 100)) : undefined;
              return (
                <View key={t.id} style={{ marginBottom: 12 }}>
                  <Text style={styles.optionText}>{t.offer.filename} ({t.direction})</Text>
                  <Text style={styles.optionText}>Status: {t.status} {percent !== undefined ? `- ${percent}%` : ''}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {t.status === 'pending' && t.direction === 'incoming' && (
                      <TouchableOpacity
                        onPress={async () => {
                          const RNFS = require('react-native-fs');
                          const path = `${RNFS.DocumentDirectoryPath}/${t.offer.filename}`;
                          await onAccept(t.id, path);
                        }}>
                        <Text style={styles.optionText}>Accept</Text>
                      </TouchableOpacity>
                    )}
                    {(t.status === 'failed' || t.status === 'cancelled') && t.filePath && (
                      <TouchableOpacity
                        onPress={async () => {
                          const path = t.filePath || `${require('react-native-fs').DocumentDirectoryPath}/${t.offer.filename}`;
                          await onAccept(t.id, path);
                        }}>
                        <Text style={styles.optionText}>Resume</Text>
                      </TouchableOpacity>
                    )}
                    {(t.status === 'downloading' || t.status === 'pending' || t.status === 'sending') && (
                      <TouchableOpacity onPress={() => onCancel(t.id)}>
                        <Text style={[styles.optionText, styles.destructiveOption]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
