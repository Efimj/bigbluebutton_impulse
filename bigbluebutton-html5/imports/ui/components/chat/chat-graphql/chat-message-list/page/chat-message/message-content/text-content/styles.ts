import styled, { css } from 'styled-components';
import {
  colorDangerDark,
  colorBorder,
  colorOffWhite,
  colorText,
  colorGrayDark,
  colorWhite,
  colorPrimary,
} from '/imports/ui/stylesheets/styled-components/palette';

export const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

interface ChatMessageProps {
  systemMsg?: boolean;
  $jumbomoji?: boolean;
}

const jumbomojiStyles = css`
  font-size: 2.5em;
  line-height: 1.2;

  & p {
    line-height: 1.2;
  }
`;

export const ChatMessage = styled.div<ChatMessageProps>`
  flex: 1;
  display: flex;
  flex-flow: row;
  flex-direction: column;
  color: ${colorText};
  word-break: break-word;

  ${({ $jumbomoji }) => $jumbomoji && jumbomojiStyles}

  & img {
    max-width: 100%;
    max-height: 100%;
  }

  & p {
    margin: 0;
    white-space: pre-wrap;
  }

  & pre:has(code),
  p code:not(pre > code) {
    background-color: ${colorOffWhite};
    border: solid 1px ${colorBorder};
    border-radius: 4px;
    padding: 2px;
    margin: 0;
    font-size: 12px;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  & p code:not(pre > code) {
    color: ${colorDangerDark};
  }
  & h1 {
    font-size: 1.5em;
    margin: 0;
  }
  & h2 {
    font-size: 1.3em;
    margin: 0;
  }
  & h3 {
    font-size: 1.1em;
    margin: 0;
  }
  & h4 {
    margin: 0;
  }
  & h5 {
    margin: 0;
  }
  & h6 {
    margin: 0;
  }
`;

export const AttachmentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.35rem;
`;

export const AttachmentCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  padding: 0.4rem;
  border: 1px solid ${colorBorder};
  border-radius: 0.5rem;
  background: ${colorOffWhite};
`;

export const ThumbnailButton = styled.button`
  position: relative;
  flex: 0 0 4rem;
  width: 4rem;
  height: 3rem;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0.35rem;
  background: ${colorBorder};
  cursor: zoom-in;
`;

export const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const PreviewBadge = styled.span`
  position: absolute;
  right: 0.15rem;
  bottom: 0.15rem;
  display: inline-flex;
  padding: 0.1rem;
  border-radius: 0.2rem;
  color: ${colorWhite};
  background: rgb(0 0 0 / 65%);
`;

export const FileIcon = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  padding: 0.55rem;
  border-radius: 50%;
  color: ${colorPrimary};
  background: ${colorWhite};
`;

export const AttachmentDetails = styled.span`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
`;

export const AttachmentName = styled.span`
  overflow: hidden;
  color: ${colorText};
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const AttachmentMeta = styled.span`
  color: ${colorGrayDark};
  font-size: 0.75rem;
`;

export const DownloadLink = styled.a`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  border-radius: 50%;
  color: ${colorPrimary};

  &:hover,
  &:focus {
    background: ${colorWhite};
  }
`;

export const PreviewDialog = styled.dialog`
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 2rem);
  padding: 2.5rem 1rem 1rem;
  border: 0;
  border-radius: 0.5rem;
  background: ${colorWhite};
  box-shadow: 0 0.75rem 3rem rgb(0 0 0 / 45%);

  &::backdrop {
    background: rgb(0 0 0 / 70%);
  }
`;

export const ClosePreviewButton = styled.button`
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  display: inline-flex;
  padding: 0.25rem;
  border: 0;
  background: transparent;
  color: ${colorText};
  cursor: pointer;
`;

export const FullImage = styled.img`
  display: block;
  max-width: calc(100vw - 4rem);
  max-height: calc(100vh - 7rem);
  object-fit: contain;
`;

export const PreviewCaption = styled.div`
  max-width: calc(100vw - 4rem);
  margin-top: 0.5rem;
  overflow: hidden;
  color: ${colorText};
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default {
  Content,
  ChatMessage,
  AttachmentList,
  AttachmentCard,
  ThumbnailButton,
  Thumbnail,
  PreviewBadge,
  FileIcon,
  AttachmentDetails,
  AttachmentName,
  AttachmentMeta,
  DownloadLink,
  PreviewDialog,
  ClosePreviewButton,
  FullImage,
  PreviewCaption,
};
