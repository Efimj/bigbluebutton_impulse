import React from 'react';
import { IntlShape, defineMessages } from 'react-intl';
import ConfirmationModal from '/imports/ui/components/common/modal/confirmation/component';
import { UserMediaLockType } from '/imports/ui/components/user-list/user-list-participants/list-item/service';

const intlMessages = defineMessages({
  cameraTitle: {
    id: 'app.userList.menu.lockUserCameraConfirmation.title',
    description: 'Title for the confirmation shown before disabling a user camera',
  },
  cameraDescription: {
    id: 'app.userList.menu.lockUserCameraConfirmation.description',
    description: 'Description for the confirmation shown before disabling a user camera',
  },
  microphoneTitle: {
    id: 'app.userList.menu.lockUserMicrophoneConfirmation.title',
    description: 'Title for the confirmation shown before disabling a user microphone',
  },
  microphoneDescription: {
    id: 'app.userList.menu.lockUserMicrophoneConfirmation.description',
    description: 'Description for the confirmation shown before disabling a user microphone',
  },
});

interface UserMediaLockConfirmationProps {
  intl: IntlShape;
  userName: string;
  mediaType: UserMediaLockType | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onConfirm: () => void;
}

const UserMediaLockConfirmation: React.FC<UserMediaLockConfirmationProps> = ({
  intl,
  userName,
  mediaType,
  isOpen,
  setIsOpen,
  onConfirm,
}) => {
  if (!mediaType) return null;

  const isCamera = mediaType === 'camera';
  const title = intl.formatMessage(
    isCamera ? intlMessages.cameraTitle : intlMessages.microphoneTitle,
    { userName },
  );
  const description = intl.formatMessage(
    isCamera ? intlMessages.cameraDescription : intlMessages.microphoneDescription,
    { userName },
  );

  return (
    <ConfirmationModal
      intl={intl}
      title={title}
      description={description}
      onConfirm={onConfirm}
      confirmButtonColor="danger"
      confirmButtonDataTest={isCamera
        ? 'confirmDisableUserCamera'
        : 'confirmDisableUserMicrophone'}
      onRequestClose={() => setIsOpen(false)}
      priority="low"
      setIsOpen={setIsOpen}
      isOpen={isOpen}
    />
  );
};

export default UserMediaLockConfirmation;
