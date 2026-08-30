import { gql } from '@apollo/client';
import { User } from '/imports/ui/components/video-provider/types';

export interface AudioOnlyUsersResponse {
  user: Array<User & {
    voice: {
      floor: boolean;
      lastFloorTime: string;
      joined: boolean;
      listenOnly: boolean;
      listenOnlyInputDevice?: boolean;
      userId: string;
      deafened: boolean;
    };
  }>;
}

export const VIDEO_STREAMS_SUBSCRIPTION = gql`
  subscription VideoStreams {
    user_camera(
      order_by: {
        userId: asc,
      }
    ) {
      meetingId
      streamId
      user {
        extId
        name
        userId
        nameSortable
        pinned
        pinnedTime
        away
        disconnected
        role
        avatar
        color
        presenter
        clientType
        raiseHand
        isModerator
        reactionEmoji
        locked
        authed
        mobile
        guest
        bot
        isDialIn
        loggedOut
        whiteboardWriteAccess
        cameras {
          streamId
        }
        userLockSettings {
          disablePublicChat
          disableCamera
          disableMicrophone
        }
      }
      voice {
        floor
        lastFloorTime
        joined
        listenOnly
        listenOnlyInputDevice
        userId
        deafened
      }
    }
  }
`;

// Grid subscribes to every participant. Camera-sharers are removed client-side only
// after their stream is known to be visible. This keeps a participant avatar in the
// Cameras container while their stream is filtered, connecting, or temporarily missing.
// When the user can only see moderator cameras (webcamsOnlyForModerator + locked),
// non-moderators are dropped via $moderatorValues = [true]; otherwise [true, false]
// keeps everyone.
// The current user is intentionally NOT special-cased here (no per-user variable, so
// Hasura can still multiplex this subscription); self is re-added client-side instead.
export const GRID_USERS_SUBSCRIPTION = gql`
  subscription GridUsers($limit: Int!, $moderatorValues: [Boolean!]) {
    user(
      where: {
        bot:{ _eq: false },
        isModerator: { _in: $moderatorValues },
      },
      limit: $limit,
      order_by: {
        nameSortable: asc,
        userId: asc,
      },
    ) {
      meetingId
      extId
      name
      userId
      nameSortable
      pinned
      pinnedTime
      away
      disconnected
      role
      avatar
      color
      presenter
      clientType
      raiseHand
      isModerator
      reactionEmoji
      locked
      authed
      mobile
      guest
      bot
      isDialIn
      loggedOut
      whiteboardWriteAccess
      cameras {
        streamId
      }
      userLockSettings {
        disablePublicChat
        disableCamera
        disableMicrophone
      }
      voice {
        joined
        listenOnly
        listenOnlyInputDevice
        deafened
        userId
      }
    }
  }
`;

// Audio-only shows users with floor time who aren't sharing a camera.
export const AUDIO_ONLY_USERS_SUBSCRIPTION = gql`
  subscription AudioOnlyUsers($moderatorValues: [Boolean!]) {
    user(
      where: {
        isSharingCamera: { _eq: false },
        isModerator: { _in: $moderatorValues },
        lastFloorTime: { _neq: "0" },
      },
      order_by: {
        lastFloorTime: desc,
        userId: asc,
      },
    ) {
      meetingId
      extId
      name
      userId
      nameSortable
      pinned
      pinnedTime
      away
      disconnected
      role
      avatar
      color
      presenter
      clientType
      raiseHand
      isModerator
      reactionEmoji
      locked
      authed
      mobile
      guest
      bot
      isDialIn
      loggedOut
      whiteboardWriteAccess
      cameras {
        streamId
      }
      userLockSettings {
        disablePublicChat
        disableCamera
        disableMicrophone
      }
      voice {
        floor
        lastFloorTime
        joined
        listenOnly
        listenOnlyInputDevice
        userId
        deafened
      }
    }
  }
`;

export default {
  VIDEO_STREAMS_SUBSCRIPTION,
  GRID_USERS_SUBSCRIPTION,
  AUDIO_ONLY_USERS_SUBSCRIPTION,
};
