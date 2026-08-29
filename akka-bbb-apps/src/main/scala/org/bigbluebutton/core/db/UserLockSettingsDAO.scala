package org.bigbluebutton.core.db

import org.bigbluebutton.core.models.UserLockSettings
import slick.jdbc.PostgresProfile.api._
import slick.lifted.ProvenShape

case class UserLockSettingsDbModel(
    meetingId:             String,
    userId:                String,
    disablePublicChat:     Boolean,
    disableCamera:         Boolean,
    disableMicrophone:     Boolean,
)

class UserLockSettingsDbTableDef(tag: Tag) extends Table[UserLockSettingsDbModel](tag, "user_lockSettings") {
  val meetingId = column[String]("meetingId", O.PrimaryKey)
  val userId = column[String]("userId", O.PrimaryKey)
  val disablePublicChat = column[Boolean]("disablePublicChat")
  val disableCamera = column[Boolean]("disableCamera")
  val disableMicrophone = column[Boolean]("disableMicrophone")

  override def * : ProvenShape[UserLockSettingsDbModel] =
    (meetingId, userId, disablePublicChat, disableCamera, disableMicrophone) <> (UserLockSettingsDbModel.tupled, UserLockSettingsDbModel.unapply)
}

object UserLockSettingsDAO {
  def insertOrUpdate(meetingId: String, userId: String, userLockSettings: UserLockSettings) = {
    DatabaseConnection.enqueue(
      TableQuery[UserLockSettingsDbTableDef].insertOrUpdate(
        UserLockSettingsDbModel(
          meetingId = meetingId,
          userId = userId,
          disablePublicChat = userLockSettings.disablePublicChat,
          disableCamera = userLockSettings.disableCamera,
          disableMicrophone = userLockSettings.disableMicrophone,
        ),
      )
    )
  }

}
