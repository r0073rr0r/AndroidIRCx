import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';

interface TabOption {
  text: string;
  onPress: () => void;
  style?: 'destructive' | 'cancel';
}

interface TabOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: TabOption[];
  styles: any;
}

export const TabOptionsModal: React.FC<TabOptionsModalProps> = ({
  visible,
  onClose,
  title,
  options,
  styles,
}) => {
  const handleOptionPress = (option: TabOption) => {
    onClose();
    option.onPress && option.onPress();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title || 'Options'}</Text>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={`${opt.text}-${idx}`}
              style={[styles.modalButton, opt.style === 'destructive' && styles.modalButtonCancel]}
              onPress={() => handleOptionPress(opt)}>
              <Text
                style={[
                  styles.modalButtonText,
                  opt.style === 'destructive' && styles.destructiveOption,
                ]}>
                {opt.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
