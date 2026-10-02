package org.bigbluebutton.api

import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets
import java.nio.file.Files

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ChatAttachmentServiceTest extends AnyFlatSpec with Matchers {

  private def save(header: Array[Byte]) = {
    val uploadsDir = Files.createTempDirectory("chat-attachment-test")
    val service = new ChatAttachmentService
    service.setUploadsDir(uploadsDir.toString)
    val bytes = header ++ Array.fill[Byte](32)(0)
    val attachment = service.save(
      "meeting-1",
      "user-1",
      "image",
      new ByteArrayInputStream(bytes),
      bytes.length
    )
    service.removeMeetingFiles("meeting-1")
    Files.deleteIfExists(uploadsDir)
    attachment
  }

  private def ascii(value: String) = value.getBytes(StandardCharsets.US_ASCII)

  it should "recognize WebP images by their file signature" in {
    val attachment = save(ascii("RIFF1234WEBP"))
    attachment.getMimeType should be("image/webp")
    attachment.isPreviewableImage should be(true)
  }

  it should "recognize AVIF images by their compatible brand" in {
    val attachment = save(Array[Byte](0, 0, 0, 24) ++ ascii("ftypmif1") ++ Array[Byte](0, 0, 0, 0) ++ ascii("avif"))
    attachment.getMimeType should be("image/avif")
    attachment.isPreviewableImage should be(true)
  }

  it should "recognize HEIC images by their file signature" in {
    val attachment = save(Array[Byte](0, 0, 0, 20) ++ ascii("ftypheic") ++ Array[Byte](0, 0, 0, 0))
    attachment.getMimeType should be("image/heic")
    attachment.isPreviewableImage should be(true)
  }

  it should "keep arbitrary files out of inline image preview" in {
    val attachment = save(ascii("not an image"))
    attachment.getMimeType should be("application/octet-stream")
    attachment.isPreviewableImage should be(false)
  }
}
