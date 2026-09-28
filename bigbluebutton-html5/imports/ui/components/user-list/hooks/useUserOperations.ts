import { useMutation } from '@apollo/client';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { User, RaisedHandUser } from '/imports/ui/Types/user';
import {
  isVoiceOnlyUser,
  UserMediaLockType,
} from '/imports/ui/components/user-list/user-list-participants/list-item/service';
import useToggleVoice from '/imports/ui/components/audio/audio-graphql/hooks/useToggleVoice';
import { CHAT_CREATE_WITH_USER, SET_ROLE, USER_EJECT_CAMERAS } from '/imports/ui/components/user-list/user-list-participants/list-item/mutations';
import { USER_SET_WHITEBOARD_WRITE_ACCESS } from '/imports/ui/components/presentation/mutations';
import {
  EJECT_FROM_MEETING,
  EJECT_FROM_VOICE,
  SET_LOCKED,
  SET_PRESENTER,
  SET_RAISE_HAND,
  SET_USER_MEDIA_LOCKED,
} from '/imports/ui/core/graphql/mutations/userMutations';
import { useModalRegistration } from '/imports/ui/core/singletons/modalController';

interface PendingMediaLock {
  mediaType: UserMediaLockType;
  onConfirm: () => void;
}

export const mapRaisedHandToUser = (raisedHandUser: RaisedHandUser): User => {
  const voiceData = raisedHandUser.voice || {};

  const user: User = {
    ...raisedHandUser,

    avatar: '',
    cameras: [],
    whiteboardWriteAccess: raisedHandUser.whiteboardWriteAccess ?? false,
    presenter: raisedHandUser.presenter ?? false,
    isModerator: raisedHandUser.isModerator ?? false,
    raiseHand: raisedHandUser.raiseHand ?? true,
    raiseHandTime: raisedHandUser.raiseHandTime,
    locked: false,
    voice: {
      joined: voiceData.joined ?? false,
      talking: false,
      muted: false,
      listenOnly: voiceData.listenOnly ?? false,
      listenOnlyInputDevice: undefined,
      deafened: voiceData.deafened ?? false,
    },

    emoji: 'none',
    loggedOut: false,
    guest: false,
    authed: true,
    waitingForAcceptance: false,
  } as User;

  return user;
};

export const useUserOperations = (userId?: string) => {
  const intl = useIntl();
  const toggleVoiceFunction = useToggleVoice();
  const [chatCreateWithUser] = useMutation(CHAT_CREATE_WITH_USER);
  const [pendingMediaLock, setPendingMediaLock] = useState<PendingMediaLock | null>(null);

  const {
    isOpen: isConfirmationModalOpen,
    open: openConfirmationModal,
    close: closeConfirmationModal,
  } = useModalRegistration({
    id: `removeUserConfirmation-${userId || 'default'}`,
    priority: 'low',
  });

  const setIsConfirmationModalOpen = (isOpen: boolean) => {
    if (isOpen) {
      openConfirmationModal();
    } else {
      closeConfirmationModal();
    }
  };

  const {
    isOpen: isMediaLockConfirmationOpen,
    open: openMediaLockConfirmation,
    close: closeMediaLockConfirmation,
  } = useModalRegistration({
    id: `mediaLockConfirmation-${userId || 'default'}`,
    priority: 'low',
  });

  const setIsMediaLockConfirmationOpen = useCallback((isOpen: boolean) => {
    if (isOpen) {
      openMediaLockConfirmation();
    } else {
      closeMediaLockConfirmation();
      setPendingMediaLock(null);
    }
  }, [closeMediaLockConfirmation, openMediaLockConfirmation]);

  const requestMediaLockConfirmation = useCallback((
    mediaType: UserMediaLockType,
    onConfirm: () => void,
  ) => {
    setPendingMediaLock({ mediaType, onConfirm });
    openMediaLockConfirmation();
  }, [openMediaLockConfirmation]);

  const confirmMediaLock = useCallback(() => {
    pendingMediaLock?.onConfirm();
  }, [pendingMediaLock]);

  const [userSetWhiteboardWriteAccess] = useMutation(USER_SET_WHITEBOARD_WRITE_ACCESS);
  const [setPresenter] = useMutation(SET_PRESENTER);
  const [setRole] = useMutation(SET_ROLE);
  const [setLocked] = useMutation(SET_LOCKED);
  const [userEjectCameras] = useMutation(USER_EJECT_CAMERAS);
  const [ejectFromMeeting] = useMutation(EJECT_FROM_MEETING);
  const [ejectFromVoice] = useMutation(EJECT_FROM_VOICE);
  const [setRaiseHand] = useMutation(SET_RAISE_HAND);
  const [setUserMediaLocked] = useMutation(SET_USER_MEDIA_LOCKED);
  const removeUser = (userId: string, banUser: boolean) => {
    if (isVoiceOnlyUser(userId)) {
      ejectFromVoice({ variables: { userId, banUser } });
    } else {
      ejectFromMeeting({ variables: { userId, banUser } });
    }
  };

  return {
    intl,
    operations: {
      chatCreateWithUser,
      toggleVoiceFunction,
      userSetWhiteboardWriteAccess,
      setPresenter,
      setRole,
      setLocked,
      userEjectCameras,
      setRaiseHand,
      setUserMediaLocked,
      removeUser,
    },
    modal: {
      isOpen: isConfirmationModalOpen,
      setIsOpen: setIsConfirmationModalOpen,
    },
    mediaLockModal: {
      isOpen: isMediaLockConfirmationOpen,
      setIsOpen: setIsMediaLockConfirmationOpen,
      request: requestMediaLockConfirmation,
      confirm: confirmMediaLock,
      mediaType: pendingMediaLock?.mediaType ?? null,
    },
  };
};
