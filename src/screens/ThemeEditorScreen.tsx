import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { themeService, Theme, ThemeColors } from '../services/ThemeService';
import { useT } from '../i18n/transifex';

interface ThemeEditorScreenProps {
  visible: boolean;
  theme?: Theme;
  onClose: () => void;
  onSave: (theme: Theme) => void;
}

export const ThemeEditorScreen: React.FC<ThemeEditorScreenProps> = ({
  visible,
  theme,
  onClose,
  onSave,
}) => {
  const t = useT();
  const [themeName, setThemeName] = useState('');
  const [colors, setColors] = useState<ThemeColors>(themeService.getColors());
  const [editingColor, setEditingColor] = useState<keyof ThemeColors | null>(null);
  const [colorValue, setColorValue] = useState('');

  useEffect(() => {
    if (theme) {
      setThemeName(theme.name);
      setColors(theme.colors);
    } else {
      setThemeName('');
      setColors(themeService.getColors());
    }
  }, [theme, visible]);

  const handleColorPress = (key: keyof ThemeColors) => {
    setEditingColor(key);
    setColorValue(colors[key]);
  };

  const handleColorSave = () => {
    if (editingColor && colorValue) {
      // Validate hex color
      const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (hexPattern.test(colorValue) || colorValue.startsWith('rgba(')) {
        setColors(prev => ({
          ...prev,
          [editingColor]: colorValue,
        }));
        setEditingColor(null);
        setColorValue('');
      } else {
        Alert.alert(t('Invalid Color'), t('Please enter a valid hex color (e.g., #FF0000) or rgba value'));
      }
    }
  };

  const handleSave = async () => {
    if (!themeName.trim()) {
      Alert.alert(t('Error'), t('Please enter a theme name'));
      return;
    }

    if (theme) {
      // Update existing theme
      await themeService.updateCustomTheme(theme.id, {
        name: themeName,
        colors,
      });
      onSave({
        ...theme,
        name: themeName,
        colors,
      });
    } else {
      // Create new theme
      const newTheme = await themeService.createCustomTheme(themeName, 'dark');
      await themeService.updateCustomTheme(newTheme.id, { colors });
      onSave({
        ...newTheme,
        colors,
      });
    }

    onClose();
  };

  const colorCategories: Array<{ title: string; keys: Array<keyof ThemeColors> }> = [
    {
      title: t('Background'),
      keys: ['background', 'surface', 'surfaceVariant'],
    },
    {
      title: t('Text'),
      keys: ['text', 'textSecondary', 'textDisabled'],
    },
    {
      title: t('Primary'),
      keys: ['primary', 'primaryDark', 'primaryLight', 'onPrimary'],
    },
    {
      title: t('Secondary'),
      keys: ['secondary', 'onSecondary'],
    },
    {
      title: t('Status'),
      keys: ['success', 'error', 'warning', 'info'],
    },
    {
      title: t('Borders'),
      keys: ['border', 'borderLight', 'divider'],
    },
    {
      title: t('Messages'),
      keys: [
        'messageBackground',
        'messageText',
        'messageNick',
        'messageTimestamp',
        'systemMessage',
        'joinMessage',
        'partMessage',
        'quitMessage',
        'topicMessage',
        'actionMessage',
      ],
    },
    {
      title: t('Input'),
      keys: ['inputBackground', 'inputText', 'inputBorder', 'inputPlaceholder'],
    },
    {
      title: t('Buttons'),
      keys: [
        'buttonPrimary',
        'buttonPrimaryText',
        'buttonSecondary',
        'buttonSecondaryText',
        'buttonDisabled',
        'buttonDisabledText',
      ],
    },
    {
      title: t('Tabs'),
      keys: [
        'tabActive',
        'tabInactive',
        'tabActiveText',
        'tabInactiveText',
        'tabBorder',
      ],
    },
    {
      title: t('Modal'),
      keys: ['modalOverlay', 'modalBackground', 'modalText'],
    },
    {
      title: t('User List'),
      keys: [
        'userListBackground',
        'userListText',
        'userListBorder',
        'userOp',
        'userVoice',
        'userNormal',
      ],
    },
  ];

  const currentColors = themeService.getColors();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: currentColors.background }]}>
        <View style={[styles.header, { backgroundColor: currentColors.primary }]}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: currentColors.onPrimary }]}>{t('Cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentColors.onPrimary }]}>
            {theme ? t('Edit Theme') : t('New Theme')}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={[styles.saveText, { color: currentColors.onPrimary }]}>{t('Save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.section, { borderBottomColor: currentColors.divider }]}>
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>{t('Theme Name')}</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: currentColors.surface,
                  color: currentColors.text,
                  borderColor: currentColors.border,
                },
              ]}
              value={themeName}
              onChangeText={setThemeName}
              placeholder={t('Enter theme name')}
              placeholderTextColor={currentColors.textSecondary}
            />
          </View>

          {colorCategories.map(category => (
            <View
              key={category.title}
              style={[styles.section, { borderBottomColor: currentColors.divider }]}>
              <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                {category.title}
              </Text>
              {category.keys.map(key => (
                <View key={key} style={styles.colorRow}>
                  <Text style={[styles.colorLabel, { color: currentColors.textSecondary }]}>
                    {key}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.colorPreview,
                      { backgroundColor: colors[key] },
                      { borderColor: currentColors.border },
                    ]}
                    onPress={() => handleColorPress(key)}
                  />
                  {editingColor === key && (
                    <View style={styles.colorEditor}>
                      <TextInput
                        style={[
                          styles.colorInput,
                          {
                            backgroundColor: currentColors.surface,
                            color: currentColors.text,
                            borderColor: currentColors.border,
                          },
                        ]}
                        value={colorValue}
                        onChangeText={setColorValue}
                        placeholder={t('#FFFFFF')}
                        placeholderTextColor={currentColors.textSecondary}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={[
                          styles.colorSaveButton,
                          { backgroundColor: currentColors.primary },
                        ]}
                        onPress={handleColorSave}>
                        <Text style={[styles.colorSaveText, { color: currentColors.onPrimary }]}>
                          ✓
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.colorCancelButton,
                          { backgroundColor: currentColors.surfaceVariant },
                        ]}
                        onPress={() => {
                          setEditingColor(null);
                          setColorValue('');
                        }}>
                        <Text style={[styles.colorCancelText, { color: currentColors.text }]}>
                          ✕
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  colorLabel: {
    flex: 1,
    fontSize: 14,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 12,
  },
  colorEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  colorInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    fontSize: 12,
    width: 100,
  },
  colorSaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  colorSaveText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  colorCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  colorCancelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

