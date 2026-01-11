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

interface HelpCommandsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const HelpCommandsScreen: React.FC<HelpCommandsScreenProps> = ({
  visible,
  onClose,
}) => {
  return (
    <HelpScreenBase visible={visible} onClose={onClose} title="IRC Commands Reference">
      <HelpSection title="Basic Commands">
        <HelpSubsection title="/join <channel>">
          <HelpParagraph>Join an IRC channel</HelpParagraph>
          <HelpCode>Example: /join #DBase</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/part [channel] [reason]">
          <HelpParagraph>Leave a channel</HelpParagraph>
          <HelpCode>Example: /part #channel Goodbye!</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/msg <nick> <message>">
          <HelpParagraph>Send private message</HelpParagraph>
          <HelpCode>Example: /msg John Hello there!</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/query <nick>">
          <HelpParagraph>Open private chat window</HelpParagraph>
          <HelpCode>Example: /query John</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/nick <newnick>">
          <HelpParagraph>Change your nickname</HelpParagraph>
          <HelpCode>Example: /nick MyNewNick</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/quit [reason]">
          <HelpParagraph>Disconnect from server</HelpParagraph>
          <HelpCode>Example: /quit See you later</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Channel Management">
        <HelpSubsection title="/mode <channel> <+/-mode> [parameters]">
          <HelpParagraph>Change channel modes</HelpParagraph>
          <HelpCode>Examples:{'\n'}/mode #channel +m (moderated){'\n'}/mode #channel +o John (give op){'\n'}/mode #channel +b *!*@spam.com (ban)</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/topic [new topic]">
          <HelpParagraph>View or set channel topic</HelpParagraph>
          <HelpCode>Example: /topic Welcome to #DBase!</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/kick <nick> [reason]">
          <HelpParagraph>Kick user from channel</HelpParagraph>
          <HelpCode>Example: /kick Spammer Stop spamming</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/ban <mask>">
          <HelpParagraph>Ban user from channel</HelpParagraph>
          <HelpCode>Example: /ban *!*@spam.com</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="User Information">
        <HelpSubsection title="/whois <nick>">
          <HelpParagraph>Get information about user</HelpParagraph>
          <HelpCode>Example: /whois John</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/whowas <nick>">
          <HelpParagraph>Get past information about user</HelpParagraph>
          <HelpCode>Example: /whowas OldNick</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Action & Formatting">
        <HelpSubsection title="/me <action>">
          <HelpParagraph>Send action message</HelpParagraph>
          <HelpCode>Example: /me waves hello</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/action <action>">
          <HelpParagraph>Alternative to /me</HelpParagraph>
          <HelpCode>Example: /action is away</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Encryption Commands">
        <HelpSubsection title="/sharekey <nick>">
          <HelpParagraph>Share DM encryption key</HelpParagraph>
          <HelpCode>Example: /sharekey Alice</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/requestkey <nick>">
          <HelpParagraph>Request DM encryption key</HelpParagraph>
          <HelpCode>Example: /requestkey Bob</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/encmsg <nick> <message>">
          <HelpParagraph>Send encrypted DM</HelpParagraph>
          <HelpCode>Example: /encmsg Alice Secret message</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/chankey <action> [params]">
          <HelpParagraph>Channel encryption management</HelpParagraph>
          <HelpCode>Examples:{'\n'}/chankey generate{'\n'}/chankey share Nick1,Nick2{'\n'}/chankey status</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Advanced">
        <HelpSubsection title="/quote <raw command>">
          <HelpParagraph>Send raw IRC command</HelpParagraph>
          <HelpCode>Example: /quote NAMES #channel</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/setname <realname>">
          <HelpParagraph>Change real name</HelpParagraph>
          <HelpCode>Example: /setname John Smith</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="/bot [on|off]">
          <HelpParagraph>Toggle bot mode</HelpParagraph>
          <HelpCode>Example: /bot on</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpInfoBox>
        Tip: You can also use tab completion to auto-complete commands and nicknames in the message input field.
      </HelpInfoBox>
    </HelpScreenBase>
  );
};
