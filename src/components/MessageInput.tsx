import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { commandService } from '../services/CommandService';
import { layoutService } from '../services/LayoutService';
import { connectionManager } from '../services/ConnectionManager';

interface MessageInputProps {
  placeholder?: string;
  onSubmit: (message: string) => void;
  disabled?: boolean;
  prefilledMessage?: string;
  onPrefillUsed?: () => void;
  bottomInset?: number;
  tabType?: 'channel' | 'query' | 'server' | 'notice';
  tabName?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder = 'Enter a message',
  onSubmit,
  disabled = false,
  prefilledMessage,
  onPrefillUsed,
  bottomInset = 0,
  tabType = 'server',
  tabName,
}) => {
  const { colors } = useTheme();
  const layoutConfig = layoutService.getConfig();
  const totalBottomInset = bottomInset + layoutConfig.navigationBarOffset;
  const styles = createStyles(colors, totalBottomInset);
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ text: string; description?: string; source: 'command' | 'alias' | 'history' }>>([]);

  // Typing indicator state
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const sendTypingIndicator = (status: 'active' | 'paused' | 'done') => {
    if (!tabName || tabType === 'server' || disabled) return;

    const activeNetworkId = connectionManager.getActiveNetworkId();
    if (!activeNetworkId) return;

    const connection = connectionManager.getConnection(activeNetworkId);
    if (!connection?.ircService) return;

    // Send TAGMSG with +typing tag
    connection.ircService.sendRaw(`@+typing=${status} TAGMSG ${tabName}`);
  };

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      // Send typing=done before submitting
      if (isTypingRef.current) {
        sendTypingIndicator('done');
        isTypingRef.current = false;
      }

      onSubmit(message.trim());
      setMessage('');
      setSuggestions([]);

      // Clear any pending typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        sendTypingIndicator('done');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const scoreAliasForContext = (command: string): number => {
    // Simple heuristic: prefer channel aliases on channels, user aliases on queries, otherwise neutral
    const lower = command.toLowerCase();
    let score = 0;
    if (tabType === 'channel') {
      if (lower.includes('{channel}') || lower.includes('#')) score += 2;
    } else if (tabType === 'query') {
      if (lower.includes('{nick}') || lower.includes('/msg')) score += 2;
    } else {
      // server/notice
      if (!lower.includes('{channel}') && !lower.includes('{nick}')) score += 1;
    }
    return score;
  };

  const handleChangeText = (text: string) => {
    setMessage(text);

    // Handle typing indicators
    if (text.trim() && !disabled && tabName && tabType !== 'server') {
      // Send typing=active if not already typing
      if (!isTypingRef.current) {
        sendTypingIndicator('active');
        isTypingRef.current = true;
      }

      // Clear existing timeout and set new one for paused state
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          sendTypingIndicator('paused');
          isTypingRef.current = false;
        }
      }, 3000); // 3 seconds of inactivity = paused
    } else if (!text.trim() && isTypingRef.current) {
      // If text is cleared, send done
      sendTypingIndicator('done');
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }

    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    const typed = text.startsWith('/') ? text : `/${text}`;
    const typedLower = typed.toLowerCase();

    // Built-in IRC commands
    const builtInCommands = [
      { cmd: 'join', desc: 'Join a channel' },
      { cmd: 'part', desc: 'Leave a channel' },
      { cmd: 'quit', desc: 'Disconnect from server' },
      { cmd: 'nick', desc: 'Change nickname' },
      { cmd: 'msg', desc: 'Send private message' },
      { cmd: 'query', desc: 'Open private chat' },
      { cmd: 'whois', desc: 'User information' },
      { cmd: 'whowas', desc: 'Past user information' },
      { cmd: 'mode', desc: 'Change channel/user modes' },
      { cmd: 'topic', desc: 'View/set channel topic' },
      { cmd: 'kick', desc: 'Kick user from channel' },
      { cmd: 'me', desc: 'Send action message' },
      { cmd: 'action', desc: 'Send action message' },
      { cmd: 'setname', desc: 'Change real name' },
      { cmd: 'bot', desc: 'Toggle bot mode' },
      { cmd: 'sharekey', desc: 'Share DM encryption key' },
      { cmd: 'requestkey', desc: 'Request DM encryption key' },
      { cmd: 'encmsg', desc: 'Send encrypted DM' },
      { cmd: 'enc', desc: 'DM encryption help' },
      { cmd: 'chankey', desc: 'Channel encryption commands' },
      { cmd: 'quote', desc: 'Send raw IRC command' },
    ];

    const commandMatches = builtInCommands
      .filter(item => `/${item.cmd}`.toLowerCase().startsWith(typedLower))
      .map(item => ({
        text: `/${item.cmd}`,
        description: item.desc,
        source: 'command' as const,
      }))
      .slice(0, 6);

    // Aliases
    const aliasMatches = commandService.getAliases()
      .map(alias => {
        const aliasText = `/${alias.alias}`;
        return {
          text: aliasText,
          description: alias.description,
          source: 'alias' as const,
          score: scoreAliasForContext(alias.command),
        };
      })
      .filter(item => item.text.toLowerCase().startsWith(typedLower))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.text.localeCompare(b.text);
      })
      .slice(0, 6);

    // History
    const history = commandService.getHistory(30).map(entry => entry.command);
    const uniqueHistory = Array.from(new Set(history));
    const historyMatches = uniqueHistory
      .filter(cmd => cmd.toLowerCase().startsWith(typedLower))
      .map(cmd => ({ text: cmd, source: 'history' as const }))
      .slice(0, 6);

    // Merge: commands first, then aliases, then history - dedupe by text
    const merged: Array<{ text: string; description?: string; source: 'command' | 'alias' | 'history' }> = [];
    [...commandMatches, ...aliasMatches, ...historyMatches].forEach(item => {
      if (!merged.some(m => m.text.toLowerCase() === item.text.toLowerCase())) {
        merged.push({ text: item.text, description: (item as any).description, source: item.source });
      }
    });

    setSuggestions(merged.slice(0, 8));
  };

  // Support external prefill (e.g., quick actions)
  React.useEffect(() => {
    if (prefilledMessage) {
      setMessage(prefilledMessage);
      setSuggestions([]);
      if (onPrefillUsed) onPrefillUsed();
    }
  }, [prefilledMessage, onPrefillUsed]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          onSubmitEditing={handleSubmit}
          editable={!disabled}
          multiline={false}
        />
      </View>
      {suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {suggestions.map(suggestion => (
            <TouchableOpacity
              key={suggestion.text}
              onPress={() => {
                setMessage(suggestion.text + (suggestion.text.endsWith(' ') ? '' : ' '));
                setSuggestions([]);
              }}
              style={styles.suggestionRow}
            >
              <Text style={[styles.suggestionText, { color: colors.text }]}>
                {suggestion.text}
                {suggestion.description ? ` — ${suggestion.description}` : ''}
                {!suggestion.description && suggestion.source === 'alias' ? ' — alias' : ''}
                {!suggestion.description && suggestion.source === 'history' ? ' — recent' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any, bottomInset: number = 0) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Math.max(8, bottomInset),
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
    }),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.inputText,
    paddingVertical: 4,
  },
  suggestionsContainer: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  suggestionText: {
    fontSize: 13,
  },
});
