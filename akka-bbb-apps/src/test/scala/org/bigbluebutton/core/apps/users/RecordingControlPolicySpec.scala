package org.bigbluebutton.core.apps.users

import org.scalatest.flatspec.AnyFlatSpec

class RecordingControlPolicySpec extends AnyFlatSpec {
  import RecordingControlPolicy._

  it should "preserve legacy behavior when no split permissions are supplied" in {
    for (record <- Seq(false, true); control <- Seq(false, true); action <- Seq(false, true)) {
      assert(isAllowed(record, control, Map.empty, action) == (record && control))
    }
  }

  it should "enforce independent start and stop permissions without enabling disabled recording" in {
    for (record <- Seq(false, true); control <- Seq(false, true);
         start <- Seq(false, true); stop <- Seq(false, true)) {
      val metadata = Map(AllowStartKey -> start.toString, AllowStopKey -> stop.toString)
      assert(isAllowed(record, control, metadata, recording = true) == (record && control && start))
      assert(isAllowed(record, control, metadata, recording = false) == (record && control && stop))
      assert(clientSettings(record, control, metadata) == Map(
        "allowStart" -> (record && control && start), "allowStop" -> (record && control && stop)
      ))
    }
  }

  it should "keep the other action available when only one restriction is supplied" in {
    assert(isAllowed(true, true, Map(AllowStopKey -> "false"), recording = true))
    assert(isAllowed(true, true, Map(AllowStartKey -> "false"), recording = false))
  }

  it should "accept boolean text and reject malformed explicit permissions without throwing" in {
    assert(isAllowed(true, true, Map(AllowStartKey -> " TRUE "), recording = true))
    for (value <- Seq("", "invalid", "0", "false")) {
      assert(!isAllowed(true, true, Map(AllowStartKey -> value), recording = true))
    }
  }
}
