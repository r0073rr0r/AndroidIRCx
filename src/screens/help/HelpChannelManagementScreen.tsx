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

interface HelpChannelManagementScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const HelpChannelManagementScreen: React.FC<HelpChannelManagementScreenProps> = ({
  visible,
  onClose,
}) => {
  return (
    <HelpScreenBase visible={visible} onClose={onClose} title="Channel Management Guide">
      <HelpSection title="Channel Basics">
        <HelpSubsection title="What is a Channel?">
          <HelpParagraph>
            IRC channels are group chat rooms where multiple users can communicate.
            Channel names start with # (e.g., #DBase).
          </HelpParagraph>
        </HelpSubsection>

        <HelpSubsection title="Channel Types">
          <HelpBullet>Public Channels - Anyone can join</HelpBullet>
          <HelpBullet>Private Channels - Require invite</HelpBullet>
          <HelpBullet>Secret Channels - Hidden from channel list</HelpBullet>
          <HelpBullet>Moderated Channels - Only voiced users can speak</HelpBullet>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Creating a Channel">
        <HelpSubsection title="Join/Create Channel">
          <HelpCode>/join #MyChannel</HelpCode>
          <HelpParagraph>
            If the channel doesn't exist, you'll create it and become the operator.
          </HelpParagraph>
        </HelpSubsection>

        <HelpSubsection title="Set Channel Topic">
          <HelpCode>/topic Welcome to my channel!</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Channel Modes">
        <HelpSubsection title="User Modes">
          <HelpBullet>+o (Operator) - Full channel control</HelpBullet>
          <HelpBullet>+v (Voice) - Can speak in moderated channels</HelpBullet>
          <HelpBullet>+h (Half-op) - Limited operator powers</HelpBullet>
          <HelpBullet>+q (Owner) - Channel owner (some networks)</HelpBullet>
          <HelpBullet>+a (Admin) - Channel admin (some networks)</HelpBullet>
        </HelpSubsection>

        <HelpSubsection title="Give Operator Status">
          <HelpCode>/mode #channel +o Nick</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Give Voice">
          <HelpCode>/mode #channel +v Nick</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Remove Operator">
          <HelpCode>/mode #channel -o Nick</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Channel Settings">
        <HelpSubsection title="Moderated (+m)">
          <HelpParagraph>Only ops and voiced users can speak:</HelpParagraph>
          <HelpCode>/mode #channel +m</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Private (+p)">
          <HelpParagraph>Channel won't appear in /list:</HelpParagraph>
          <HelpCode>/mode #channel +p</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Secret (+s)">
          <HelpParagraph>Hide channel completely:</HelpParagraph>
          <HelpCode>/mode #channel +s</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Invite Only (+i)">
          <HelpParagraph>Requires invitation to join:</HelpParagraph>
          <HelpCode>/mode #channel +i</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="No External Messages (+n)">
          <HelpParagraph>Only members can send messages:</HelpParagraph>
          <HelpCode>/mode #channel +n</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Topic Lock (+t)">
          <HelpParagraph>Only ops can change topic:</HelpParagraph>
          <HelpCode>/mode #channel +t</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="User Limit (+l)">
          <HelpParagraph>Set maximum users:</HelpParagraph>
          <HelpCode>/mode #channel +l 50</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Channel Key (+k)">
          <HelpParagraph>Set password:</HelpParagraph>
          <HelpCode>/mode #channel +k mypassword</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Moderation">
        <HelpSubsection title="Kick User">
          <HelpParagraph>Remove user from channel:</HelpParagraph>
          <HelpCode>/kick Nick Stop spamming</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Ban User">
          <HelpParagraph>Prevent user from rejoining:</HelpParagraph>
          <HelpCode>/mode #channel +b Nick!*@*</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Quiet/Mute User">
          <HelpParagraph>Prevent user from speaking:</HelpParagraph>
          <HelpCode>/mode #channel +q Nick!*@*</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Unban User">
          <HelpCode>/mode #channel -b Nick!*@*</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="View Ban List">
          <HelpCode>/mode #channel +b</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Advanced Management">
        <HelpSubsection title="Channel Registration">
          <HelpParagraph>Register channel with ChanServ (if available):</HelpParagraph>
          <HelpCode>/msg ChanServ REGISTER #channel password description</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Access List">
          <HelpParagraph>Add user to channel access list:</HelpParagraph>
          <HelpCode>/msg ChanServ ACCESS #channel ADD Nick 10</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Auto-Op">
          <HelpParagraph>Set user to auto-op on join:</HelpParagraph>
          <HelpCode>/msg ChanServ FLAGS #channel Nick +O</HelpCode>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Best Practices">
        <HelpSubsection title="Security">
          <HelpBullet>Set +n and +t modes for public channels</HelpBullet>
          <HelpBullet>Use +i for private channels</HelpBullet>
          <HelpBullet>Register your channel with ChanServ</HelpBullet>
          <HelpBullet>Keep access list updated</HelpBullet>
        </HelpSubsection>

        <HelpSubsection title="Moderation">
          <HelpBullet>Have at least 2-3 trusted operators</HelpBullet>
          <HelpBullet>Clearly communicate channel rules</HelpBullet>
          <HelpBullet>Use +q (quiet) before +b (ban) for first offenses</HelpBullet>
          <HelpBullet>Document bans with reasons</HelpBullet>
        </HelpSubsection>

        <HelpSubsection title="Growth">
          <HelpBullet>Set clear, welcoming topic</HelpBullet>
          <HelpBullet>Make channel public (+p/-s) if you want growth</HelpBullet>
          <HelpBullet>Promote on social media or forums</HelpBullet>
          <HelpBullet>Keep conversation active and friendly</HelpBullet>
        </HelpSubsection>
      </HelpSection>

      <HelpSection title="Troubleshooting">
        <HelpSubsection title="Lost operator status">
          <HelpParagraph>
            If you're the channel founder, ask ChanServ to op you:
          </HelpParagraph>
          <HelpCode>/msg ChanServ OP #channel</HelpCode>
        </HelpSubsection>

        <HelpSubsection title="Can't change modes">
          <HelpParagraph>You need operator (+o) status.</HelpParagraph>
        </HelpSubsection>

        <HelpSubsection title="User keeps rejoining after kick">
          <HelpParagraph>Use ban (+b) mode instead.</HelpParagraph>
        </HelpSubsection>

        <HelpSubsection title="Channel stolen/taken over">
          <HelpParagraph>
            Contact network administrators or register the channel with ChanServ.
          </HelpParagraph>
        </HelpSubsection>
      </HelpSection>
    </HelpScreenBase>
  );
};
