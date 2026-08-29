import { useMemo } from 'react';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { LockStruct } from '../context/context';

const useLockContext = () => {
  const { data: meeting } = useMeeting((m) => ({
    lockSettings: m.lockSettings,
  }));
  const { data: user } = useCurrentUser((u) => ({
    role: u.role,
    locked: u.locked,
    userLockSettings: u.userLockSettings,
  }));

  return useMemo(() => {
    const ROLE_MODERATOR = window.meetingClientSettings.public.user.role_moderator;
    const userIsLocked = Boolean(user ? user.locked && user.role !== ROLE_MODERATOR : true);
    const { lockSettings } = meeting || {};

    const base = LockStruct();

    return {
      ...base,
      isLocked: userIsLocked,
      lockSettings: lockSettings || base.lockSettings,
      userLocks: {
        ...base.userLocks,
        userWebcam: Boolean(user?.userLockSettings?.disableCamera
          || (userIsLocked && lockSettings?.disableCam)),
        userMic: Boolean(user?.userLockSettings?.disableMicrophone
          || (userIsLocked && lockSettings?.disableMic)),
        userNotes: Boolean(userIsLocked && lockSettings?.disableNotes),
        userPrivateChat: Boolean(userIsLocked && lockSettings?.disablePrivateChat),
        userPublicChat: Boolean(userIsLocked && lockSettings?.disablePublicChat),
        hideViewersCursor: Boolean(userIsLocked && lockSettings?.hideViewersCursor),
        hideViewersAnnotation: Boolean(userIsLocked && lockSettings?.hideViewersAnnotation),
      },
    };
  }, [meeting?.lockSettings, user?.role, user?.locked, user?.userLockSettings]);
};

export default useLockContext;
