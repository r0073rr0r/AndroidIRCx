import { useCallback } from 'react';
import { Alert } from 'react-native';
import { IRCMessage } from '../services/IRCService';
import { scriptingService } from '../services/ScriptingService';
import { dccChatService } from '../services/DCCChatService';
import { offlineQueueService } from '../services/OfflineQueueService';
import { encryptedDMService } from '../services/EncryptedDMService';
import { channelEncryptionService } from '../services/ChannelEncryptionService';
import { messageHistoryService } from '../services/MessageHistoryService';
import { useTabStore } from '../stores/tabStore';

interface UseMessageSendingParams {
  isConnected: boolean;
  activeTabId: string | null;
  getActiveIRCService: () => any;
  getActiveCommandService: () => any;
  setTabs: React.Dispatch<React.SetStateAction<any[]>>;
  safeAlert: typeof Alert.alert;
  t: (key: string, options?: any) => string;
}

/**
 * Hook that handles all message sending logic
 * - Command processing and aliases
 * - Scripting integration
 * - Server/DCC/channel/query messages
 * - Offline queueing
 * - Encrypted DM and channel messages
 */
export const useMessageSending = (params: UseMessageSendingParams) => {
  const {
    isConnected,
    activeTabId,
    getActiveIRCService,
    getActiveCommandService,
    setTabs,
    safeAlert,
    t,
  } = params;

  const handleSendMessage = useCallback(async (message: string) => {
    const activeIRCService = getActiveIRCService();
    const activeCommandService = getActiveCommandService();
    // Use direct store access to avoid infinite loop
    const currentTabs = useTabStore.getState().tabs;
    const activeTab = currentTabs.find((tab) => tab.id === activeTabId) || currentTabs.find(t => t.type === 'server') || currentTabs[0];

    // Don't send messages if no valid tab exists
    if (!activeTab) {
      console.warn('⚠️ Cannot send message: no valid tab available');
      return;
    }
    const isChannelTarget =
      activeTab.name.startsWith('#') ||
      activeTab.name.startsWith('&') ||
      activeTab.name.startsWith('+') ||
      activeTab.name.startsWith('!');
    const isPrivateTarget = activeTab.type === 'query' || (!isChannelTarget && activeTab.type !== 'server' && activeTab.type !== 'dcc');

    // Process command through command service (handles /quote, aliases, custom commands)
    const processedCommand = await activeCommandService.processCommand(message, activeTab.name);

    // If activeCommandService.processCommand returns null, it means it handled the command internally (e.g., /quote)
    // and no further processing is needed for this message.
    // If it returns a string, it means that string should be sent to the IRC service.
    // If it returns the original message (because it's not a command), it means it's a regular message to be sent.
    if (processedCommand === null && message.startsWith('/')) {
      return; // Command was handled internally (e.g., /quote, or some custom command that returns null)
    }

    // Use processed command or original message if it's not a command
    let commandToSend = (processedCommand !== null && processedCommand.startsWith('/')) ? processedCommand : message;

    // Run scripting on outgoing commands (aliases / automation)
    const scripted = scriptingService.processOutgoingCommand(commandToSend, { channel: activeTab.name, networkId: activeTab.networkId });
    if (scripted === null) {
      return; // Script cancelled send
    }
    commandToSend = scripted;


    if (activeTab.type === 'server') {
      // For server tab, still require connection
      if (!isConnected) {
        safeAlert(
          t('Not Connected', { _tags: 'screen:app,file:App.tsx,feature:connect' }),
          t('Please connect to a server first', { _tags: 'screen:app,file:App.tsx,feature:connect' })
        );
        return;
      }
      if (commandToSend.startsWith('/')) {
        activeIRCService.sendMessage(activeTab.name, commandToSend);
      } else {
        activeIRCService.sendCommand(commandToSend);
      }
      return;
    }

    if (activeTab.type === 'dcc') {
      if (activeTab.dccSessionId) {
        dccChatService.sendMessage(activeTab.dccSessionId, commandToSend);
        const dccMessage: IRCMessage = {
          id: `dcc-${Date.now()}`,
          type: 'message',
          from: 'You',
          text: commandToSend,
          timestamp: Date.now(),
          channel: activeTab.name,
          network: activeTab.networkId,
        };
        setTabs(prev =>
          prev.map(t =>
            t.id === activeTab.id
              ? {
                  ...t,
                  messages: [...t.messages, dccMessage],
                }
              : t
          )
        );
        // Save DCC message to history
        if (activeTab.networkId && activeTab.networkId !== 'Not connected') {
          messageHistoryService.saveMessage(dccMessage, activeTab.networkId).catch(err => {
            console.error('Error saving DCC message to history:', err);
          });
        }
      }
      return;
    }

    // Channel or query messages: queue if offline
    if (!isConnected) {
      offlineQueueService.addMessage(activeTab.networkId, activeTab.name, commandToSend);
      const pendingMessage: IRCMessage = {
        id: `pending-${Date.now()}-${Math.random()}`,
        type: 'message',
        channel: activeTab.name,
        from: 'You',
        text: commandToSend,
        timestamp: Date.now(),
        status: 'pending',
        network: activeTab.networkId,
      };
      setTabs(prev =>
        prev.map(tab =>
          tab.id === activeTab.id
            ? { ...tab, messages: [...tab.messages, pendingMessage] }
            : tab
        )
      );
      // Save pending message to history
      if (activeTab.networkId && activeTab.networkId !== 'Not connected') {
        messageHistoryService.saveMessage(pendingMessage, activeTab.networkId).catch(err => {
          console.error('Error saving pending message to history:', err);
        });
      }
      return;
    }

    const wantEncrypted = !!(activeTab.sendEncrypted && activeTab.isEncrypted);

    // Connected: send normally, but try encrypted path for private targets when toggle is on
    if (isPrivateTarget && wantEncrypted && !commandToSend.startsWith('/')) {
      const network = activeTab.networkId || activeIRCService.getNetworkName();
      const hasBundle = activeTab.isEncrypted || await encryptedDMService.isEncryptedForNetwork(network, activeTab.name);
      if (!hasBundle) {
        const errorMsg: IRCMessage = {
          id: `err-${Date.now()}-${Math.random()}`,
          type: 'error',
          channel: activeTab.name,
          text: `*** No DM key with ${activeTab.name}. Use /sharekey or /requestkey first.`,
          timestamp: Date.now(),
          network: activeTab.networkId,
        };
        setTabs(prev =>
          prev.map(tab =>
            tab.id === activeTab.id
              ? { ...tab, isEncrypted: false, messages: [...tab.messages, errorMsg] }
              : tab
          )
        );
        // Save error message to history
        if (activeTab.networkId && activeTab.networkId !== 'Not connected') {
          messageHistoryService.saveMessage(errorMsg, activeTab.networkId).catch(err => {
            console.error('Error saving error message to history:', err);
          });
        }
        return;
      }
      try {
        const network = activeTab.networkId || activeIRCService.getNetworkName();
        const payload = await encryptedDMService.encryptForNetwork(commandToSend, network, activeTab.name);
        activeIRCService.sendRaw(`PRIVMSG ${activeTab.name} :!enc-msg ${JSON.stringify(payload)}`);
        const sentMessage: IRCMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          type: 'message',
          channel: activeTab.name,
          from: 'You',
          text: `🔒 ${commandToSend}`,
          timestamp: Date.now(),
          status: 'sent',
          network: activeTab.networkId,
        };
        setTabs(prev =>
          prev.map(tab =>
            tab.id === activeTab.id
              ? { ...tab, messages: [...tab.messages, sentMessage] }
              : tab
          )
        );
        // Save encrypted DM to history
        if (activeTab.networkId && activeTab.networkId !== 'Not connected') {
          messageHistoryService.saveMessage(sentMessage, activeTab.networkId).catch(err => {
            console.error('Error saving encrypted DM to history:', err);
          });
        }
        return;
      } catch (e) {
        const errorMsg: IRCMessage = {
          id: `err-${Date.now()}-${Math.random()}`,
          type: 'error',
          channel: activeTab.name,
          text: `Encrypted send failed (${(e as Error)?.message || 'missing key?'}). Use "Request Encryption Key" from the user menu.`,
          timestamp: Date.now(),
          network: activeTab.networkId,
        };
        setTabs(prev =>
          prev.map(tab =>
            tab.id === activeTab.id
              ? { ...tab, messages: [...tab.messages, errorMsg] }
              : tab
          )
        );
        // Save error message to history
        if (activeTab.networkId && activeTab.networkId !== 'Not connected') {
          messageHistoryService.saveMessage(errorMsg, activeTab.networkId).catch(err => {
            console.error('Error saving error message to history:', err);
          });
        }
        return; // do not fall back to plaintext
      }
    }

    // Try encrypted channel messages if toggle is on and channel has a key
    const isChannel = activeTab.name.startsWith('#') || activeTab.name.startsWith('&');
    if (isChannel && wantEncrypted && !commandToSend.startsWith('/')) {
      const hasKey = await channelEncryptionService.hasChannelKey(activeTab.name, activeTab.networkId);
      if (hasKey) {
        try {
          const payload = await channelEncryptionService.encryptMessage(commandToSend, activeTab.name, activeTab.networkId);
          activeIRCService.sendRaw(`PRIVMSG ${activeTab.name} :!chanenc-msg ${JSON.stringify(payload)}`);
          const sentMessage: IRCMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            type: 'message',
            channel: activeTab.name,
            from: 'You',
            text: `🔒 ${commandToSend}`,
            timestamp: Date.now(),
            status: 'sent',
            network: activeTab.networkId,
          };
          setTabs(prev =>
            prev.map(tab =>
              tab.id === activeTab.id
                ? { ...tab, messages: [...tab.messages, sentMessage] }
                : tab
            )
          );
          // Save encrypted channel message to history
          if (activeTab.networkId && activeTab.networkId !== 'Not connected') {
            messageHistoryService.saveMessage(sentMessage, activeTab.networkId).catch(err => {
              console.error('Error saving encrypted channel message to history:', err);
            });
          }
          return;
        } catch (e) {
          const errorMsg: IRCMessage = {
            id: `err-${Date.now()}-${Math.random()}`,
            type: 'error',
            channel: activeTab.name,
            text: `*** Channel encryption failed: ${(e as Error)?.message || e}`,
            timestamp: Date.now(),
            network: activeTab.networkId,
          };
          setTabs(prev =>
            prev.map(tab =>
              tab.id === activeTab.id
                ? { ...tab, messages: [...tab.messages, errorMsg] }
                : tab
            )
          );
          // Save error message to history
          if (activeTab.networkId && activeTab.networkId !== 'Not connected') {
            messageHistoryService.saveMessage(errorMsg, activeTab.networkId).catch(err => {
              console.error('Error saving error message to history:', err);
            });
          }
          return;
        }
      } else {
        const errorMsg: IRCMessage = {
          id: `err-${Date.now()}-${Math.random()}`,
          type: 'error',
          channel: activeTab.name,
          text: `*** No channel key stored for ${activeTab.name}. Use /chankey generate/share first.`,
          timestamp: Date.now(),
          network: activeTab.networkId,
        };
        setTabs(prev =>
          prev.map(tab =>
            tab.id === activeTab.id
              ? { ...tab, messages: [...tab.messages, errorMsg] }
              : tab
          )
        );
        // Save error message to history
        if (activeTab.networkId && activeTab.networkId !== 'Not connected') {
          messageHistoryService.saveMessage(errorMsg, activeTab.networkId).catch(err => {
            console.error('Error saving error message to history:', err);
          });
        }
        return;
      }
    }

    activeIRCService.sendMessage(activeTab.name, commandToSend);
  }, [isConnected, activeTabId, getActiveIRCService, getActiveCommandService, setTabs, safeAlert, t]);

  return { handleSendMessage };
};
