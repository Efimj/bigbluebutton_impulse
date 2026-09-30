import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import Button from '/imports/ui/components/common/button/component';
import PinnedApps from '/imports/ui/components/sidebar-navigation/pinned-apps/component';
import SIDEBAR_BUTTONS_REGISTRY, {
  PINNED_APPS_BUTTON_ID,
} from '/imports/ui/components/sidebar-navigation/buttons-registry';
import { SidebarNavigationDisplayProvider } from '/imports/ui/components/sidebar-navigation/sidebar-navigation-button/display-context';
import SidebarNavigationButton from '/imports/ui/components/sidebar-navigation/sidebar-navigation-button/component';
import { layoutSelectInput } from '/imports/ui/components/layout/context';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { handleLeaveAudio } from '/imports/ui/components/audio/audio-graphql/audio-controls/input-stream-live-selector/service';
import {
  requestOpenAudioSettings,
  requestOpenVideoSettings,
} from './service';
import Styled from './styles';

const intlMessages = defineMessages({
  more: {
    id: 'app.mobileActions.more',
    description: 'Mobile action bar more button label',
  },
  title: {
    id: 'app.mobileActions.title',
    description: 'Mobile more actions sheet title',
  },
  mediaSettings: {
    id: 'app.mobileActions.mediaSettings',
    description: 'Mobile more actions media settings section',
  },
  navigation: {
    id: 'app.mobileActions.navigation',
    description: 'Mobile more actions navigation section',
  },
  additionalActions: {
    id: 'app.mobileActions.additionalActions',
    description: 'Mobile more actions additional controls section',
  },
  audioSettings: {
    id: 'app.audio.audioSettings.titleLabel',
    description: 'Audio settings button label',
  },
  videoSettings: {
    id: 'app.video.videoSettings',
    description: 'Video settings button label',
  },
  leaveAudio: {
    id: 'app.audio.leaveAudio',
    description: 'Leave audio button label',
  },
  close: {
    id: 'app.modal.close',
    description: 'Close button label',
  },
});

const MobileActions = ({
  audioControl,
  videoControl,
  handControl,
  reactionControl,
  additionalActions,
}) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarNavigationInput = layoutSelectInput((i) => i.sidebarNavigation);
  const { data: currentUser } = useCurrentUser((u) => ({
    voice: u.voice,
  }));
  const { data: currentMeeting } = useMeeting((m) => ({
    isBreakout: m.isBreakout,
  }));
  const isInAudio = currentUser?.voice?.joined && !currentUser?.voice?.deafened;
  const {
    top: topButtons = [],
    center: centerButtons = [],
    bottom: bottomButtons = [],
  } = window.meetingClientSettings.public.sidebarNavigation.buttons;

  const close = useCallback(() => setIsOpen(false), []);

  const renderNavigationButton = useCallback((buttonId) => {
    if (buttonId === PINNED_APPS_BUTTON_ID) {
      return (
        <PinnedApps
          key={buttonId}
          sidebarNavigationInput={sidebarNavigationInput}
        />
      );
    }

    const ButtonComponent = SIDEBAR_BUTTONS_REGISTRY[buttonId];
    return ButtonComponent ? <ButtonComponent key={buttonId} /> : null;
  }, [sidebarNavigationInput]);

  const navigationButtons = [...topButtons, ...centerButtons, ...bottomButtons];

  return (
    <>
      <Styled.PrimaryBar
        data-test="mobileActionsBar"
        $hasReactions={Boolean(reactionControl)}
      >
        <Styled.ControlItem>
          {audioControl}
        </Styled.ControlItem>
        <Styled.ControlItem>
          {videoControl}
        </Styled.ControlItem>
        <Styled.ControlItem>
          {handControl}
        </Styled.ControlItem>
        {reactionControl && (
          <Styled.ControlItem>
            {reactionControl}
          </Styled.ControlItem>
        )}
        <Styled.ControlItem>
          <Button
            icon="more"
            label={intl.formatMessage(intlMessages.more)}
            aria-label={intl.formatMessage(intlMessages.more)}
            dataTest="mobileMoreActionsButton"
            onClick={() => setIsOpen(true)}
            color="default"
            size="md"
            hideLabel
            circle
          />
        </Styled.ControlItem>
      </Styled.PrimaryBar>

      <Styled.BottomSheet
        anchor="bottom"
        open={isOpen}
        onClose={close}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: '100vw',
            maxWidth: '100vw',
            left: 0,
            right: 0,
            margin: 0,
          },
        }}
        aria-labelledby="mobile-more-actions-title"
      >
        <Styled.Handle aria-hidden="true" />
        <Styled.Header>
          <Styled.Title id="mobile-more-actions-title">
            {intl.formatMessage(intlMessages.title)}
          </Styled.Title>
          <Styled.CloseButton
            type="button"
            onClick={close}
            aria-label={intl.formatMessage(intlMessages.close)}
            data-test="closeMobileMoreActions"
          >
            <Icon iconName="close" />
          </Styled.CloseButton>
        </Styled.Header>
        <Styled.ScrollArea>
          <SidebarNavigationDisplayProvider value={{ variant: 'sheet', onAction: close }}>
            <Styled.Section>
              <Styled.SectionTitle>
                {intl.formatMessage(intlMessages.mediaSettings)}
              </Styled.SectionTitle>
              <Styled.NavigationGrid>
                <SidebarNavigationButton
                  iconName="settings"
                  label={intl.formatMessage(intlMessages.audioSettings)}
                  dataTest="mobileAudioSettings"
                  onClick={requestOpenAudioSettings}
                />
                {videoControl && (
                  <SidebarNavigationButton
                    iconName="video"
                    label={intl.formatMessage(intlMessages.videoSettings)}
                    dataTest="mobileVideoSettings"
                    onClick={requestOpenVideoSettings}
                  />
                )}
                {isInAudio && (
                  <SidebarNavigationButton
                    iconName="logout"
                    label={intl.formatMessage(intlMessages.leaveAudio)}
                    dataTest="mobileLeaveAudio"
                    onClick={() => handleLeaveAudio(currentMeeting?.isBreakout ?? false)}
                  />
                )}
              </Styled.NavigationGrid>
            </Styled.Section>

            <Styled.Section>
              <Styled.SectionTitle>
                {intl.formatMessage(intlMessages.navigation)}
              </Styled.SectionTitle>
              <Styled.NavigationGrid>
                {navigationButtons.map(renderNavigationButton)}
              </Styled.NavigationGrid>
            </Styled.Section>
          </SidebarNavigationDisplayProvider>

          <Styled.Section>
            <Styled.SectionTitle>
              {intl.formatMessage(intlMessages.additionalActions)}
            </Styled.SectionTitle>
            <Styled.AdditionalActions>
              {additionalActions}
            </Styled.AdditionalActions>
          </Styled.Section>
        </Styled.ScrollArea>
      </Styled.BottomSheet>
    </>
  );
};

MobileActions.propTypes = {
  audioControl: PropTypes.node,
  videoControl: PropTypes.node,
  handControl: PropTypes.node,
  reactionControl: PropTypes.node,
  additionalActions: PropTypes.node,
};

MobileActions.defaultProps = {
  audioControl: null,
  videoControl: null,
  handControl: null,
  reactionControl: null,
  additionalActions: null,
};

export default MobileActions;
