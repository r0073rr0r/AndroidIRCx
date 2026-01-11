import React from 'react';
import {
  HelpScreenBase,
  HelpSection,
  HelpSubsection,
  HelpParagraph,
  HelpBullet,
  HelpCode,
  HelpInfoBox,
  HelpWarningBox,
} from './HelpScreenBase';

interface HelpConnectionScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const HelpConnectionScreen: React.FC<HelpConnectionScreenProps> = ({
  visible,
  onClose,
}) => {
  return (
    <HelpScreenBase visible={visible} onClose={onClose} title="IRC Connection Guide">
      <HelpSection title="Quick Start">
        <HelpParagraph>Follow these simple steps to connect to an IRC server:</HelpParagraph>
        <HelpBullet>1. Open Settings</HelpBullet>
        <HelpBullet>2. Tap "Add Network"</HelpBullet>
        <HelpBullet>3. Enter network details</HelpBullet>
        <HelpBullet>4. Tap "Connect"</HelpBullet>
      </HelpSection>

      <HelpSection title="Detailed Guide">
        <HelpSubsection title="Step 1: Open Settings">
          <HelpBullet>Tap the ⚙️ icon in the header bar</HelpBullet>
          <HelpBullet>Navigate to "Connection & Networks" section</HelpBullet>
        </HelpSubsection>

        <HelpSubsection title="Step 2: Add New Network">
          <HelpParagraph>Tap "Add Network" button and fill in the network details:</HelpParagraph>
          <HelpBullet>Network Name: A friendly name (e.g., "DBase IRC")</HelpBullet>
          <HelpBullet>Server Address: IRC server hostname (e.g., irc.dbase.in.rs)</HelpBullet>
          <HelpBullet>Port: Usually 6697 for SSL, 6667 for non-SSL</HelpBullet>
          <HelpBullet>SSL/TLS: Enable for secure connections (recommended)</HelpBullet>
        </HelpSubsection>

        <HelpSubsection title="Step 3: Set Your Identity">
          <HelpBullet>Nickname: Your display name on IRC</HelpBullet>
          <HelpBullet>Alternate Nick: Backup if nickname is taken</HelpBullet>
          <HelpBullet>Username: Your IRC username (ident)</HelpBullet>
          <HelpBullet>Real Name: Your full name or description</HelpBullet>
        </HelpSubsection>

        <HelpSubsection title="Step 4: Optional Settings">
          <HelpBullet>Auto-Connect: Connect on app startup</HelpBullet>
          <HelpBullet>Auto-Join Channels: List of channels to join automatically</HelpBullet>
          <HelpBullet>Password: Server password (if required)</HelpBullet>
          <HelpBullet>NickServ Password: For registered nicknames</HelpBullet>
        </HelpSubsection>

        <HelpSubsection title="Step 5: Connect">
          <HelpBullet>Tap "Save" to save network configuration</HelpBullet>
          <HelpBullet>Tap "Connect" to connect to the network</HelpBullet>
          <HelpBullet>Wait for connection confirmation</HelpBullet>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Popular IRC Networks">
        <HelpSubsection title="DBase IRC (Recommended)">
          <HelpCode>Server: irc.dbase.in.rs{'\n'}Port: 6697 (SSL){'\n'}Channels: #DBase, #AndroidIRCX{'\n'}Description: Serbian IRC network with tech community</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Libera.Chat">
          <HelpCode>Server: irc.libera.chat{'\n'}Port: 6697 (SSL){'\n'}Description: Free software and open source community</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="OFTC">
          <HelpCode>Server: irc.oftc.net{'\n'}Port: 6697 (SSL){'\n'}Description: Open and Free Technology Community</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Troubleshooting">
        <HelpSubsection title="Connection Failed">
          <HelpBullet>Check your internet connection</HelpBullet>
          <HelpBullet>Verify server address and port</HelpBullet>
          <HelpBullet>Try disabling SSL/TLS</HelpBullet>
          <HelpBullet>Check if firewall is blocking IRC ports</HelpBullet>
        </HelpSubsection>

        <HelpSubsection title="Nickname Already in Use">
          <HelpBullet>Use your alternate nickname</HelpBullet>
          <HelpBullet>Register your nickname with NickServ</HelpBullet>
          <HelpBullet>Choose a different nickname</HelpBullet>
        </HelpSubsection>

        <HelpSubsection title="Can't Join Channels">
          <HelpBullet>Some channels require registration</HelpBullet>
          <HelpBullet>Channel may be invite-only (+i mode)</HelpBullet>
          <HelpBullet>You may be banned from the channel</HelpBullet>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Need More Help?">
        <HelpInfoBox>
          Join #AndroidIRCX on irc.dbase.in.rs{'\n'}
          Visit our website: androidircx.com{'\n'}
          Email: support@androidircx.com
        </HelpInfoBox>
      </HelpSection>
    </HelpScreenBase>
  );
};
