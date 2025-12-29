import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useT } from '../i18n/transifex';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ScriptingHelpScreen: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const t = useT();
  const styles = createStyles(colors);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('Scripting Help')}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.link}>{t('Close')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('Quick Start')}</Text>
        <Text style={styles.text}>
          {t('Scripts are plain JavaScript modules. Export hooks to react to events:')}
        </Text>
        <Text style={styles.code}>
{`module.exports = {
  onConnect: (networkId) => { /* ... */ },
  onMessage: (msg) => { /* msg.channel, msg.from, msg.text */ },
  onJoin: (channel, nick, msg) => { /* ... */ },
  onCommand: (text, ctx) => { /* return newText or { cancel: true } */ },
};`}
        </Text>

        <Text style={styles.title}>{t('API')}</Text>
        <Text style={styles.sub}>{t('Available functions')}</Text>
        <Text style={styles.bullet}>{t('• api.log(text) — log to script log buffer')}</Text>
        <Text style={styles.bullet}>{t('• api.sendMessage(channel, text, networkId?)')}</Text>
        <Text style={styles.bullet}>{t('• api.sendCommand(command, networkId?)')}</Text>
        <Text style={styles.bullet}>{t('• api.userNick — current nick')}</Text>
        <Text style={styles.bullet}>{t('• api.getConfig() — script config JSON')}</Text>

        <Text style={styles.title}>{t('Hooks')}</Text>
        <Text style={styles.bullet}>{t('• onConnect(networkId)')}</Text>
        <Text style={styles.bullet}>{t('• onMessage(msg)')}</Text>
        <Text style={styles.bullet}>{t('• onJoin(channel, nick, msg)')}</Text>
        <Text style={styles.bullet}>{t('• onCommand(text, ctx) ⇒ string | { command, cancel }')}</Text>

        <Text style={styles.title}>{t('Examples')}</Text>
        <Text style={styles.sub}>{t('Auto-op')}</Text>
        <Text style={styles.code}>
{`module.exports = {
  onJoin: (channel, nick, msg) => {
    if (nick === api.userNick) return;
    api.sendCommand('MODE ' + channel + ' +o ' + nick);
  },
};`}
        </Text>
        <Text style={styles.sub}>{t('Welcome')}</Text>
        <Text style={styles.code}>
{`module.exports = {
  onJoin: (channel, nick) => {
    api.sendMessage(channel, 'Welcome, ' + nick + '!');
  },
};`}
        </Text>
        <Text style={styles.sub}>{t('Alias (/hello)')}</Text>
        <Text style={styles.code}>
{`module.exports = {
  onCommand: (text) => {
    if (text.startsWith('/hello')) return '/say Hello there!';
    return text;
  },
};`}
        </Text>

        <Text style={styles.title}>{t('Tips')}</Text>
        <Text style={styles.bullet}>{t('• Scripts are disabled by default; enable each one.')}</Text>
        <Text style={styles.bullet}>{t('• Use Lint to catch syntax errors.')}</Text>
        <Text style={styles.bullet}>{t('• Enable logging to see script output/errors in the log tab.')}</Text>
        <Text style={styles.bullet}>{t('• onCommand can cancel send by returning { cancel: true }.')}</Text>

        <View style={styles.footerSpace} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontWeight: '600' },
  body: { paddingHorizontal: 16 },
  title: { marginTop: 12, fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { marginTop: 8, fontSize: 14, fontWeight: '600', color: colors.text },
  text: { color: colors.text, marginTop: 4, lineHeight: 20 },
  bullet: { color: colors.text, marginTop: 4, lineHeight: 18 },
  code: { marginTop: 6, backgroundColor: colors.surfaceVariant, color: colors.text, padding: 8, borderRadius: 6, fontFamily: 'monospace' },
  footerSpace: { height: 40 },
});
