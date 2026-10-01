package org.bigbluebutton.core.apps.users

object RecordingControlPolicy {
  val AllowStartKey = "impulse-recording-allow-start"
  val AllowStopKey = "impulse-recording-allow-stop"

  // Missing metadata preserves BBB's existing start/stop policy. Explicit
  // restrictions apply to user commands, not to automatic recording or shutdown.
  def isAllowed(record: Boolean, allowStartStop: Boolean,
                metadata: Map[String, String], recording: Boolean): Boolean = {
    val key = if (recording) AllowStartKey else AllowStopKey
    record && allowStartStop && metadata.get(key).forall(_.trim.equalsIgnoreCase("true"))
  }

  def clientSettings(record: Boolean, allowStartStop: Boolean,
                     metadata: Map[String, String]): Map[String, Boolean] = {
    Map(
      "allowStart" -> isAllowed(record, allowStartStop, metadata, recording = true),
      "allowStop" -> isAllowed(record, allowStartStop, metadata, recording = false)
    )
  }
}
