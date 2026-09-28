import React, { MutableRefObject } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import BBBMenu, { BBBMenuAction } from '/imports/ui/components/common/menu/component';
import Button from '/imports/ui/components/common/button/component';
import ConfirmationModal from '/imports/ui/components/common/modal/confirmation/component';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { User } from '/imports/ui/Types/user';
import { LockSettings, UsersPolicies } from '/imports/ui/Types/meeting';
import { layoutDispatch } from '/imports/ui/components/layout/context';
import { useIsChatEnabled, useIsPrivateChatEnabled } from '/imports/ui/services/features';
import useWhoIsUnmuted from '/imports/ui/core/hooks/useWhoIsUnmuted';
import { CURRENT_PRESENTATION_PAGE_SUBSCRIPTION, CurrentPresentationPagesSubscriptionResponse } from '/imports/ui/components/whiteboard/queries';
import { useUserOperations } from '/imports/ui/components/user-list/hooks/useUserOperations';
import UserMediaLockConfirmation from '/imports/ui/components/user-list/user-media-lock-confirmation/component';
import {
  createToolbarOptions,
  generateActionsPermissions,
  hasWhiteboardWriteAccess,
} from '/imports/ui/components/user-list/user-list-participants/list-item/service';
import Styled from './styles';

const intlMessages = defineMessages({
  more: {
    id: 'app.userList.more',
    description: 'Open participant management menu',
  },
});

interface UserManagementMenuProps {
  subjectUser: Partial<User>;
  isFullscreenContext: boolean;
  videoContainer: MutableRefObject<HTMLDivElement | null>;
}

const UserManagementMenu: React.FC<UserManagementMenuProps> = ({
  subjectUser,
  isFullscreenContext,
  videoContainer,
}) => {
  const intl = useIntl();
  const {
    operations,
    modal,
    mediaLockModal,
  } = useUserOperations(subjectUser.userId);
  const layoutContextDispatch = layoutDispatch();
  const isChatEnabled = useIsChatEnabled();
  const isPrivateChatEnabled = useIsPrivateChatEnabled();
  const { data: unmutedUsers } = useWhoIsUnmuted();

  const { data: currentUser } = useCurrentUser((user) => ({
    presenter: user.presenter,
    isModerator: user.isModerator,
    locked: user.locked,
  }));
  const { data: meeting } = useMeeting((currentMeeting) => ({
    lockSettings: currentMeeting.lockSettings,
    usersPolicies: currentMeeting.usersPolicies,
    isBreakout: currentMeeting.isBreakout,
  }));
  const { data: presentationData } = useDeduplicatedSubscription<
    CurrentPresentationPagesSubscriptionResponse
  >(CURRENT_PRESENTATION_PAGE_SUBSCRIPTION);

  if (!subjectUser.userId || !meeting) return null;

  const user = {
    ...subjectUser,
    cameras: subjectUser.cameras ?? [],
    voice: subjectUser.voice ?? {},
    userLockSettings: subjectUser.userLockSettings ?? {
      disablePublicChat: false,
      disableCamera: false,
      disableMicrophone: false,
    },
  } as User;
  const lockSettings = meeting.lockSettings ?? ({} as LockSettings);
  const usersPolicies = (meeting.usersPolicies ?? {}) as UsersPolicies;
  const isMuted = !unmutedUsers[user.userId];
  const permissions = generateActionsPermissions(
    user,
    currentUser?.presenter ?? false,
    currentUser?.isModerator ?? false,
    currentUser?.locked ?? false,
    lockSettings,
    usersPolicies,
    meeting.isBreakout ?? false,
    isMuted,
    isChatEnabled,
    isPrivateChatEnabled,
    'participant',
  );
  const pageId = presentationData?.pres_page_curr[0]?.pageId ?? '';
  const { pinnedToolbarOptions, otherToolbarOptions } = createToolbarOptions(
    intl,
    user,
    isMuted,
    hasWhiteboardWriteAccess(user),
    permissions,
    lockSettings,
    pageId,
    layoutContextDispatch,
    operations.chatCreateWithUser,
    operations.toggleVoiceFunction,
    operations.userSetWhiteboardWriteAccess,
    operations.setPresenter,
    operations.setRole,
    operations.setLocked,
    operations.userEjectCameras,
    () => modal.setIsOpen(true),
    operations.setRaiseHand,
    operations.setUserMediaLocked,
    mediaLockModal.request,
  );

  // Camera lock exists in both the compact toolbar and the dropdown. Keep one entry here.
  const actions = [
    ...pinnedToolbarOptions.filter((action) => action.key !== 'toggleCameraLock'),
    ...otherToolbarOptions,
  ]
    .filter((action) => action.allowed) as unknown as BBBMenuAction[];

  if (actions.length === 0) return null;

  return (
    <>
      {modal.isOpen && (
        <ConfirmationModal
          intl={intl}
          title={intl.formatMessage(
            { id: 'app.userList.menu.removeConfirmation.label' },
            { userName: user.name },
          )}
          checkboxMessageId="app.userlist.menu.removeConfirmation.desc"
          confirmParam={user.userId}
          onConfirm={operations.removeUser}
          confirmButtonDataTest="removeUserConfirmation"
          onRequestClose={() => modal.setIsOpen(false)}
          priority="low"
          setIsOpen={modal.setIsOpen}
          isOpen={modal.isOpen}
        />
      )}
      <UserMediaLockConfirmation
        intl={intl}
        userName={user.name}
        mediaType={mediaLockModal.mediaType}
        isOpen={mediaLockModal.isOpen}
        setIsOpen={mediaLockModal.setIsOpen}
        onConfirm={mediaLockModal.confirm}
      />
      <Styled.MenuWrapper>
        <BBBMenu
          trigger={(
            <Button
              label={intl.formatMessage(intlMessages.more)}
              aria-label={`${user.name}: ${intl.formatMessage(intlMessages.more)}`}
              data-test="cameraParticipantManagementMenu"
              icon="more"
              hideLabel
              size="sm"
            />
          )}
          actions={actions}
          opts={{
            id: `camera-participant-${user.userId}-management-menu`,
            keepMounted: true,
            transitionDuration: 0,
            elevation: 3,
            getContentAnchorEl: null,
            fullwidth: 'true',
            container: isFullscreenContext ? videoContainer.current : document.body,
          }}
        />
      </Styled.MenuWrapper>
    </>
  );
};

export default UserManagementMenu;
