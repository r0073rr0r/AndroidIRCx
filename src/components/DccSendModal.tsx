import React from 'react';
import { Modal, TouchableOpacity, View, Text, TextInput } from 'react-native';

interface DccSendModalProps {
  visible: boolean;
  onClose: () => void;
  targetNick: string;
  filePath: string;
  onChangeFilePath: (path: string) => void;
  onSend: () => Promise<void>;
  styles: any;
}

export const DccSendModal: React.FC<DccSendModalProps> = ({
  visible,
  onClose,
  targetNick,
  filePath,
  onChangeFilePath,
  onSend,
  styles,
}) => {
  const handleSend = async () => {
    await onSend();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Offer DCC Send to {targetNick}</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter file path on device"
            value={filePath}
            onChangeText={onChangeFilePath}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onClose}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonJoin]}
              onPress={handleSend}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
