import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Button from '/imports/ui/components/common/button/component';
import usePresentationSwap from '../../../core/hooks/usePresentationSwap';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import {
  CURRENT_PRESENTATION_PAGE_SUBSCRIPTION,
  CurrentPresentationPageSubscriptionResponse,
} from '/imports/ui/components/whiteboard/queries';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { listItemBgHover } from '/imports/ui/stylesheets/styled-components/palette';
import deviceInfo from '/imports/utils/deviceInfo';

const intlMessages = defineMessages({
  swapToScreenshare: {
    id: 'app.actionsBar.swapPresentation.swapToScreenshare',
    description: 'Button label for swapping presentation to screen share',
  },
  swapToPresentation: {
    id: 'app.actionsBar.swapPresentation.swapToPresentation',
    description: 'Button label for swapping screen share to presentation',
  },
});

const SwapPresentationButton = () => {
  const intl = useIntl();
  const [showScreenShare, swapPresentation] = usePresentationSwap();

  const { data: presentationPageData } = useDeduplicatedSubscription<
    CurrentPresentationPageSubscriptionResponse
  >(
    CURRENT_PRESENTATION_PAGE_SUBSCRIPTION,
  );

  const {
    data: currentMeeting,
  } = useMeeting((m) => ({
    componentsFlags: m.componentsFlags,
  }));

  const {
    data: currentUser,
  } = useCurrentUser((u) => ({
    presenter: u.presenter,
  }));

  if (!currentMeeting) return null;
  const { pres_page_curr: presentationPageArray } = (presentationPageData || {});
  const currentPresentationPage = presentationPageArray && presentationPageArray[0];
  const hasScreenshare = currentMeeting?.componentsFlags?.hasScreenshare ?? false;
  if (!hasScreenshare || !currentPresentationPage || !currentUser?.presenter) return null;
  return (
    <Button
      onClick={() => {
        swapPresentation(!showScreenShare);
      }}
      icon={!showScreenShare ? 'presentation' : 'desktop'}
      label={intl.formatMessage(!showScreenShare
        ? intlMessages.swapToScreenshare
        : intlMessages.swapToPresentation)}
      hideLabel
      circle
      size={deviceInfo.isMobile ? 'md' : 'lg'}
      hoverColor={listItemBgHover}
    />
  );
};

export default SwapPresentationButton;
