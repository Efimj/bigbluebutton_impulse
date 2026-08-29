/**
 * BigBlueButton open source conferencing system - http://www.bigbluebutton.org/
 *
 * Copyright (c) 2026 BigBlueButton Inc. and by respective authors.
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 3.0 of the License, or (at your option)
 * any later version.
 */
package org.bigbluebutton.api;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.Iterator;
import java.util.Locale;
import java.util.Properties;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Stores ephemeral chat attachments outside the web root. Attachments are
 * addressed by random UUIDs and are removed when their meeting ends.
 */
public class ChatAttachmentService {
  private static final Logger log = LoggerFactory.getLogger(ChatAttachmentService.class);
  private static final Pattern SAFE_MEETING_ID = Pattern.compile("[A-Za-z0-9-]{1,128}");
  private static final Pattern SAFE_FILE_ID = Pattern.compile("[a-f0-9-]{36}");
  private static final int BUFFER_SIZE = 8192;

  private String uploadsDir = "/var/bigbluebutton/uploads";
  private long maxFileSize = 25L * 1024L * 1024L;

  public AttachmentInfo save(String meetingId, String uploaderUserId, String originalName,
                             InputStream input, long declaredSize) throws IOException {
    validateMeetingId(meetingId);
    if (input == null) throw new IllegalArgumentException("File stream is required");
    if (declaredSize <= 0) throw new IllegalArgumentException("File is empty");
    if (declaredSize > maxFileSize) throw new FileTooLargeException(maxFileSize);

    String fileId = UUID.randomUUID().toString();
    String safeName = sanitizeFilename(originalName);
    Path meetingDir = meetingDirectory(meetingId);
    Files.createDirectories(meetingDir);
    Path temporaryFile = resolveInMeeting(meetingDir, fileId + ".uploading");
    Path dataFile = resolveInMeeting(meetingDir, fileId + ".bin");
    Path metadataFile = resolveInMeeting(meetingDir, fileId + ".properties");

    long bytesWritten = 0;
    try (InputStream source = new BufferedInputStream(input);
         OutputStream target = new BufferedOutputStream(Files.newOutputStream(temporaryFile))) {
      byte[] buffer = new byte[BUFFER_SIZE];
      int read;
      while ((read = source.read(buffer)) != -1) {
        bytesWritten += read;
        if (bytesWritten > maxFileSize) throw new FileTooLargeException(maxFileSize);
        target.write(buffer, 0, read);
      }
    } catch (IOException | RuntimeException e) {
      Files.deleteIfExists(temporaryFile);
      throw e;
    }

    if (bytesWritten == 0) {
      Files.deleteIfExists(temporaryFile);
      throw new IllegalArgumentException("File is empty");
    }

    ImageType imageType = detectSafeImageType(temporaryFile);
    moveAtomically(temporaryFile, dataFile);

    Properties metadata = new Properties();
    metadata.setProperty("id", fileId);
    metadata.setProperty("name", safeName);
    metadata.setProperty("size", Long.toString(bytesWritten));
    metadata.setProperty("mimeType", imageType.mimeType);
    metadata.setProperty("previewableImage", Boolean.toString(imageType.previewable));
    metadata.setProperty("uploaderUserId", uploaderUserId == null ? "" : uploaderUserId);
    metadata.setProperty("createdAt", Long.toString(System.currentTimeMillis()));

    Path temporaryMetadata = resolveInMeeting(meetingDir, fileId + ".properties.uploading");
    try (OutputStream output = new BufferedOutputStream(Files.newOutputStream(temporaryMetadata))) {
      metadata.store(output, "BigBlueButton ephemeral chat attachment");
    } catch (IOException e) {
      Files.deleteIfExists(dataFile);
      Files.deleteIfExists(temporaryMetadata);
      throw e;
    }
    moveAtomically(temporaryMetadata, metadataFile);

    return new AttachmentInfo(fileId, safeName, bytesWritten, imageType.mimeType,
      imageType.previewable, dataFile);
  }

  public AttachmentInfo find(String meetingId, String fileId) throws IOException {
    validateMeetingId(meetingId);
    if (fileId == null || !SAFE_FILE_ID.matcher(fileId).matches()) return null;

    Path meetingDir = meetingDirectory(meetingId);
    Path dataFile = resolveInMeeting(meetingDir, fileId + ".bin");
    Path metadataFile = resolveInMeeting(meetingDir, fileId + ".properties");
    if (!Files.isRegularFile(dataFile) || !Files.isRegularFile(metadataFile)) return null;

    Properties metadata = new Properties();
    try (InputStream input = new BufferedInputStream(Files.newInputStream(metadataFile))) {
      metadata.load(input);
    }
    if (!fileId.equals(metadata.getProperty("id"))) return null;

    long size;
    try {
      size = Long.parseLong(metadata.getProperty("size", "0"));
    } catch (NumberFormatException e) {
      return null;
    }
    if (size <= 0 || size != Files.size(dataFile)) return null;

    return new AttachmentInfo(fileId, metadata.getProperty("name", "file"), size,
      metadata.getProperty("mimeType", "application/octet-stream"),
      Boolean.parseBoolean(metadata.getProperty("previewableImage", "false")), dataFile);
  }

  public void removeMeetingFiles(String meetingId) {
    try {
      validateMeetingId(meetingId);
      Path meetingDir = meetingDirectory(meetingId);
      if (!Files.exists(meetingDir)) return;
      try (Stream<Path> paths = Files.walk(meetingDir)) {
        paths.sorted(Comparator.reverseOrder()).forEach(path -> {
          try {
            Files.deleteIfExists(path);
          } catch (IOException e) {
            log.warn("Unable to remove chat attachment path for meeting {}", meetingId, e);
          }
        });
      }
    } catch (IllegalArgumentException | IOException e) {
      log.warn("Unable to clean chat attachments for meeting {}", meetingId, e);
    }
  }

  public long getMaxFileSize() {
    return maxFileSize;
  }

  public void setMaxFileSize(long maxFileSize) {
    if (maxFileSize <= 0) throw new IllegalArgumentException("maxFileSize must be positive");
    this.maxFileSize = maxFileSize;
  }

  public void setUploadsDir(String uploadsDir) {
    if (uploadsDir == null || uploadsDir.trim().isEmpty()) {
      throw new IllegalArgumentException("uploadsDir is required");
    }
    this.uploadsDir = uploadsDir;
  }

  private Path meetingDirectory(String meetingId) throws IOException {
    Path base = Path.of(uploadsDir).toAbsolutePath().normalize();
    Path directory = base.resolve(meetingId).normalize();
    if (!directory.startsWith(base)) throw new IOException("Invalid attachment path");
    return directory;
  }

  private static Path resolveInMeeting(Path meetingDir, String filename) throws IOException {
    Path path = meetingDir.resolve(filename).normalize();
    if (!path.startsWith(meetingDir)) throw new IOException("Invalid attachment path");
    return path;
  }

  private static void validateMeetingId(String meetingId) {
    if (meetingId == null || !SAFE_MEETING_ID.matcher(meetingId).matches()) {
      throw new IllegalArgumentException("Invalid meeting id");
    }
  }

  private static String sanitizeFilename(String originalName) {
    String candidate = originalName == null ? "file" : originalName;
    candidate = candidate.replace('\\', '/');
    int slash = candidate.lastIndexOf('/');
    if (slash >= 0) candidate = candidate.substring(slash + 1);
    candidate = candidate.replaceAll("[\\p{Cntrl}]", "").trim();
    if (candidate.isEmpty() || ".".equals(candidate) || "..".equals(candidate)) candidate = "file";
    if (candidate.length() > 255) candidate = candidate.substring(0, 255);
    return candidate;
  }

  private static ImageType detectSafeImageType(Path file) {
    try (ImageInputStream imageInput = ImageIO.createImageInputStream(file.toFile())) {
      if (imageInput == null) return ImageType.NOT_PREVIEWABLE;
      Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
      if (!readers.hasNext()) return ImageType.NOT_PREVIEWABLE;
      ImageReader reader = readers.next();
      try {
        String format = reader.getFormatName().toLowerCase(Locale.ROOT);
        if ("jpeg".equals(format) || "jpg".equals(format)) return new ImageType("image/jpeg", true);
        if ("png".equals(format)) return new ImageType("image/png", true);
        if ("gif".equals(format)) return new ImageType("image/gif", true);
      } finally {
        reader.dispose();
      }
    } catch (IOException e) {
      log.debug("Uploaded chat attachment is not a supported preview image", e);
    }
    return ImageType.NOT_PREVIEWABLE;
  }

  private static void moveAtomically(Path source, Path destination) throws IOException {
    try {
      Files.move(source, destination, StandardCopyOption.ATOMIC_MOVE);
    } catch (AtomicMoveNotSupportedException e) {
      Files.move(source, destination);
    }
  }

  private static final class ImageType {
    private static final ImageType NOT_PREVIEWABLE = new ImageType("application/octet-stream", false);
    private final String mimeType;
    private final boolean previewable;

    private ImageType(String mimeType, boolean previewable) {
      this.mimeType = mimeType;
      this.previewable = previewable;
    }
  }

  public static final class AttachmentInfo {
    private final String id;
    private final String name;
    private final long size;
    private final String mimeType;
    private final boolean previewableImage;
    private final Path path;

    private AttachmentInfo(String id, String name, long size, String mimeType,
                           boolean previewableImage, Path path) {
      this.id = id;
      this.name = name;
      this.size = size;
      this.mimeType = mimeType;
      this.previewableImage = previewableImage;
      this.path = path;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public long getSize() { return size; }
    public String getMimeType() { return mimeType; }
    public boolean isPreviewableImage() { return previewableImage; }
    public Path getPath() { return path; }
  }

  public static class FileTooLargeException extends IOException {
    private final long maxFileSize;

    public FileTooLargeException(long maxFileSize) {
      super("File exceeds maximum size of " + maxFileSize + " bytes");
      this.maxFileSize = maxFileSize;
    }

    public long getMaxFileSize() { return maxFileSize; }
  }
}
