package org.bigbluebutton.core.apps.users

import org.bigbluebutton.LockSettingsUtil
import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.models.{ UserLockSettings, Users2x, VoiceUsers }
import org.bigbluebutton.core.running.{ MeetingActor, OutMsgRouter }
import org.bigbluebutton.core.apps.{ PermissionCheck, RightsManagementTrait }

trait ChangeUserLockSettingsInMeetingCmdMsgHdlr extends RightsManagementTrait {
  this: MeetingActor =>

  val outGW: OutMsgRouter

  def handleChangeUserLockSettingsInMeetingCmdMsg(msg: ChangeUserLockSettingsInMeetingCmdMsg) {

    def build(meetingId: String, userId: String, settings: UserLockSettings, setBy: String): BbbCommonEnvCoreMsg = {
      val routing = Routing.addMsgToClientRouting(MessageTypes.BROADCAST_TO_MEETING, meetingId, userId)
      val envelope = BbbCoreEnvelope(UserLockSettingsInMeetingChangedEvtMsg.NAME, routing)
      val body = UserLockSettingsInMeetingChangedEvtMsgBody(
        userId,
        disablePubChat = settings.disablePublicChat,
        disableCamera = settings.disableCamera,
        disableMicrophone = settings.disableMicrophone,
        setBy = setBy
      )
      val header = BbbClientMsgHeader(UserLockSettingsInMeetingChangedEvtMsg.NAME, meetingId, userId)
      val event = UserLockSettingsInMeetingChangedEvtMsg(header, body)

      BbbCommonEnvCoreMsg(envelope, event)
    }

    if (permissionFailed(PermissionCheck.MOD_LEVEL, PermissionCheck.VIEWER_LEVEL, liveMeeting.users2x, msg.header.userId)) {
      val meetingId = liveMeeting.props.meetingProp.intId
      val reason = "No permission to lock user chat in meeting."
      PermissionCheck.ejectUserForFailedPermission(meetingId, msg.header.userId, reason, outGW, liveMeeting)
    } else {
      log.info("Change user lock settings. meetingId=" + props.meetingProp.intId + " userId=" + msg.body.userId
        + " disablePubChat=" + msg.body.disablePubChat + " disableCamera=" + msg.body.disableCamera
        + " disableMicrophone=" + msg.body.disableMicrophone)

      for {
        user <- Users2x.findWithIntId(liveMeeting.users2x, msg.body.userId)
        updatedUserLockSettings = user.userLockSettings.copy(
          disablePublicChat = msg.body.disablePubChat,
          disableCamera = msg.body.disableCamera.getOrElse(user.userLockSettings.disableCamera),
          disableMicrophone = msg.body.disableMicrophone.getOrElse(user.userLockSettings.disableMicrophone)
        )
        _ <- Users2x.setUserLockSettings(liveMeeting.users2x, user.intId, updatedUserLockSettings)
      } yield {
        if (updatedUserLockSettings.disableMicrophone) {
          VoiceUsers.findWithIntId(liveMeeting.voiceUsers, user.intId).foreach { voiceUser =>
            LockSettingsUtil.enforceLockSettingsForVoiceUser(voiceUser, liveMeeting, outGW)
          }
        }
        if (updatedUserLockSettings.disableCamera) {
          LockSettingsUtil.enforceCamLockSettingsForUser(user.copy(userLockSettings = updatedUserLockSettings), liveMeeting, outGW)
        }

        val event = build(props.meetingProp.intId, msg.body.userId, updatedUserLockSettings, msg.body.setBy)
        outGW.send(event)
      }

    }
  }
}
