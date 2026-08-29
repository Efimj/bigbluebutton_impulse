import React, { useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { patch } from '@mconf/bbb-diff';
import Styled from './styles';
import { GET_PAD_CONTENT_DIFF_STREAM, GetPadContentDiffStreamResponse } from './queries';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';

const intlMessages = defineMessages({
  viewingModeTitle: {
    id: 'app.pads.viewingModeTitle',
    description: 'Read-only shared notes iframe title',
  },
});

interface PadContentProps {
  content: string;
  isOnMediaArea: boolean;
}

interface PadContentContainerProps {
  externalId: string;
  isOnMediaArea: boolean;
}

const PadContent: React.FC<PadContentProps> = ({
  content,
  isOnMediaArea,
}) => {
  const intl = useIntl();
  const contentSplit = content.split('<body>');
  const contentStyle = `
  <body>
  <base target="_blank">
  <style type="text/css">
    body {
      ${Styled.contentText}
    }
  </style>
  `;
  const contentWithStyle = [contentSplit[0], contentStyle, contentSplit[1]].join('');
  return (
    <Styled.Wrapper>
      <Styled.Iframe
        title={intl.formatMessage(intlMessages.viewingModeTitle)}
        srcDoc={contentWithStyle}
        data-test="sharedNotesViewingMode"
        isOnMediaArea={isOnMediaArea}
      />
    </Styled.Wrapper>
  );
};

const PadContentContainer: React.FC<PadContentContainerProps> = ({ externalId, isOnMediaArea }) => {
  const [content, setContent] = useState('');
  const { data: contentDiffData } = useDeduplicatedSubscription<GetPadContentDiffStreamResponse>(
    GET_PAD_CONTENT_DIFF_STREAM,
    { variables: { externalId } },
  );

  useEffect(() => {
    if (!contentDiffData) return;
    const patches = contentDiffData.sharedNotes_diff_stream;
    const patchedContent = patches.reduce((currentContent, attribs) => patch(
      currentContent,
      { start: attribs.start, end: attribs.end, text: attribs.diff },
    ), content);
    setContent(patchedContent);
  }, [contentDiffData]);

  return (
    <PadContent content={content} isOnMediaArea={isOnMediaArea} />
  );
};

export default PadContentContainer;
