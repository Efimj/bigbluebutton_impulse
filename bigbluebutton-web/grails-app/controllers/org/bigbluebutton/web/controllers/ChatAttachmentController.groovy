/**
 * BigBlueButton open source conferencing system - http://www.bigbluebutton.org/
 *
 * Copyright (c) 2026 BigBlueButton Inc. and by respective authors.
 * Licensed under the GNU Lesser General Public License, version 3 or later.
 */
package org.bigbluebutton.web.controllers

import groovy.json.JsonOutput
import org.bigbluebutton.api.ChatAttachmentService
import org.bigbluebutton.api.MeetingService
import org.bigbluebutton.api.domain.UserSession
import org.springframework.http.ContentDisposition
import org.springframework.web.multipart.MultipartFile

import java.nio.charset.StandardCharsets
import java.nio.file.Files

class ChatAttachmentController {
  static allowedMethods = [upload: 'POST', download: 'GET']

  MeetingService meetingService
  ChatAttachmentService chatAttachmentService

  private UserSession validateSession() {
    def sessionToken = params.sessionToken
    if (!sessionToken) return null
    UserSession userSession = meetingService.getUserSessionWithSessionToken(sessionToken)
    Boolean allowRequestsWithoutSession = meetingService.getAllowRequestsWithoutSession(sessionToken)
    if (userSession == null || (!session[sessionToken] && !allowRequestsWithoutSession)) return null
    return userSession
  }

  private void renderJson(int status, Map body) {
    response.status = status
    response.setHeader('Cache-Control', 'no-store')
    render contentType: 'application/json', encoding: 'UTF-8', text: JsonOutput.toJson(body)
  }

  def upload = {
    UserSession userSession = validateSession()
    if (userSession == null) {
      renderJson(401, [error: 'unauthorized'])
      return
    }
    if (meetingService.getNotEndedMeetingWithId(userSession.meetingID) == null) {
      renderJson(410, [error: 'meeting-ended'])
      return
    }

    MultipartFile file = request.getFile('file')
    if (file == null || file.empty) {
      renderJson(400, [error: 'file-empty'])
      return
    }
    if (file.size > chatAttachmentService.maxFileSize) {
      renderJson(413, [error: 'file-too-large', maxFileSize: chatAttachmentService.maxFileSize])
      return
    }

    try {
      ChatAttachmentService.AttachmentInfo attachment = chatAttachmentService.save(
        userSession.meetingID,
        userSession.internalUserId,
        file.originalFilename,
        file.inputStream,
        file.size,
      )
      renderJson(201, [
        id: attachment.id,
        name: attachment.name,
        size: attachment.size,
        mimeType: attachment.mimeType,
        previewableImage: attachment.previewableImage,
      ])
    } catch (ChatAttachmentService.FileTooLargeException ignored) {
      renderJson(413, [error: 'file-too-large', maxFileSize: chatAttachmentService.maxFileSize])
    } catch (IllegalArgumentException e) {
      renderJson(400, [error: 'invalid-file'])
    } catch (Exception e) {
      log.error('Unable to save chat attachment', e)
      renderJson(500, [error: 'upload-failed'])
    }
  }

  def download = {
    UserSession userSession = validateSession()
    if (userSession == null) {
      renderJson(401, [error: 'unauthorized'])
      return
    }
    if (params.meetingId != userSession.meetingID) {
      renderJson(403, [error: 'forbidden'])
      return
    }

    try {
      ChatAttachmentService.AttachmentInfo attachment = chatAttachmentService.find(
        params.meetingId as String,
        params.fileId as String,
      )
      if (attachment == null) {
        renderJson(404, [error: 'not-found'])
        return
      }

      boolean inlinePreview = params.preview == 'true' && attachment.previewableImage
      response.status = 200
      response.contentType = inlinePreview ? attachment.mimeType : 'application/octet-stream'
      response.contentLengthLong = attachment.size
      response.setHeader('Cache-Control', 'private, no-store')
      response.setHeader('X-Content-Type-Options', 'nosniff')
      response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
      response.setHeader('Content-Disposition', ContentDisposition
        .builder(inlinePreview ? 'inline' : 'attachment')
        .filename(attachment.name, StandardCharsets.UTF_8)
        .build().toString())
      Files.copy(attachment.path, response.outputStream)
      response.outputStream.flush()
    } catch (IllegalArgumentException e) {
      renderJson(400, [error: 'invalid-request'])
    } catch (Exception e) {
      log.error('Unable to return chat attachment', e)
      if (!response.committed) renderJson(500, [error: 'download-failed'])
    }
  }
}
