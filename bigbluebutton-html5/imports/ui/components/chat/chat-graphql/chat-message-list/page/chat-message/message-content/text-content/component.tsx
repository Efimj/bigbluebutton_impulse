import React, { useMemo } from 'react';
import Styled from './styles';
import { isJumbomoji } from './jumbomoji';
import AttachmentList from './attachment-list';
import {
  parseChatAttachments,
  removeAttachmentMarkersFromHtml,
} from '../../../../../chat-attachment';

interface ChatMessageTextContentProps {
  text: string;
  rawText?: string;
  dataTest?: string | null;
}
const ChatMessageTextContent: React.FC<ChatMessageTextContentProps> = ({
  text,
  rawText,
  dataTest = 'messageContent',
}) => {
  const parsedAttachments = useMemo(
    () => parseChatAttachments(rawText || ''),
    [rawText],
  );
  const visibleText = useMemo(
    () => removeAttachmentMarkersFromHtml(text, parsedAttachments.markerLines),
    [text, parsedAttachments.markerLines],
  );
  const jumbomoji = useMemo(() => isJumbomoji(visibleText), [visibleText]);
  return (
    <Styled.Content>
      {visibleText ? (
        <Styled.ChatMessage
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: visibleText }}
          data-test={dataTest}
          $jumbomoji={jumbomoji}
        />
      ) : null}
      {parsedAttachments.attachments.length > 0 ? (
        <AttachmentList attachments={parsedAttachments.attachments} />
      ) : null}
    </Styled.Content>
  );
};
export default ChatMessageTextContent;
