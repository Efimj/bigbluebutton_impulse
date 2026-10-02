import React, { useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import {
  ChatAttachment,
  chatAttachmentUrl,
  formatAttachmentSize,
} from '../../../../../chat-attachment';
import Styled from './styles';

const messages = defineMessages({
  attachedFile: {
    id: 'app.chat.attachment.file',
    description: 'Chat attachment label',
  },
  preview: {
    id: 'app.chat.attachment.preview',
    description: 'Preview an image attached to chat',
  },
  closePreview: {
    id: 'app.chat.attachment.closePreview',
    description: 'Close a chat image preview',
  },
  download: {
    id: 'app.chat.attachment.download',
    description: 'Download a file attached to chat',
  },
});

interface AttachmentItemProps {
  attachment: ChatAttachment;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({ attachment }) => {
  const intl = useIntl();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const previewUrl = chatAttachmentUrl(attachment, true);
  const downloadUrl = chatAttachmentUrl(attachment);
  const canPreview = attachment.previewableImage && !previewUnavailable;

  const showPreview = () => {
    if (dialogRef.current?.showModal) {
      dialogRef.current.showModal();
    } else {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Styled.AttachmentCard data-test="chatAttachment">
      {canPreview ? (
        <Styled.ThumbnailButton
          type="button"
          onClick={showPreview}
          aria-label={intl.formatMessage(messages.preview, { name: attachment.name })}
        >
          <Styled.Thumbnail
            src={previewUrl}
            alt=""
            loading="lazy"
            onError={() => setPreviewUnavailable(true)}
          />
          <Styled.PreviewBadge aria-hidden="true"><OpenInFullIcon fontSize="small" /></Styled.PreviewBadge>
        </Styled.ThumbnailButton>
      ) : (
        <Styled.FileIcon aria-hidden="true"><AttachFileIcon /></Styled.FileIcon>
      )}
      <Styled.AttachmentDetails>
        <Styled.AttachmentName title={attachment.name}>{attachment.name}</Styled.AttachmentName>
        <Styled.AttachmentMeta>
          {`${intl.formatMessage(messages.attachedFile)} · ${formatAttachmentSize(attachment.size, intl.locale)}`}
        </Styled.AttachmentMeta>
      </Styled.AttachmentDetails>
      <Styled.DownloadLink
        href={downloadUrl}
        download={attachment.name}
        aria-label={intl.formatMessage(messages.download, { name: attachment.name })}
        title={intl.formatMessage(messages.download, { name: attachment.name })}
      >
        <DownloadIcon />
      </Styled.DownloadLink>
      {canPreview ? (
        <Styled.PreviewDialog
          ref={dialogRef}
          onClick={(event) => {
            if (event.target === event.currentTarget) dialogRef.current?.close();
          }}
          onClose={() => undefined}
        >
          <Styled.ClosePreviewButton
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={intl.formatMessage(messages.closePreview)}
            title={intl.formatMessage(messages.closePreview)}
          >
            <CloseIcon />
          </Styled.ClosePreviewButton>
          <Styled.FullImage
            src={previewUrl}
            alt={attachment.name}
            onError={() => {
              dialogRef.current?.close();
              setPreviewUnavailable(true);
            }}
          />
          <Styled.PreviewCaption>{attachment.name}</Styled.PreviewCaption>
        </Styled.PreviewDialog>
      ) : null}
    </Styled.AttachmentCard>
  );
};

interface AttachmentListProps {
  attachments: ChatAttachment[];
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments }) => (
  <Styled.AttachmentList>
    {attachments.map((attachment) => (
      <AttachmentItem key={attachment.id} attachment={attachment} />
    ))}
  </Styled.AttachmentList>
);

export default AttachmentList;
