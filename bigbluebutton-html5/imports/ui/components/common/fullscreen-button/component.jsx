import React from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import Styled from './styles';
import { ACTIONS } from '/imports/ui/components/layout/enums';

const intlMessages = defineMessages({
  fullscreenButton: {
    id: 'app.fullscreenButton.label',
    description: 'Fullscreen label',
  },
  fullscreenUndoButton: {
    id: 'app.fullscreenUndoButton.label',
    description: 'Undo fullscreen label',
  },
});

const propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  fullscreenRef: PropTypes.instanceOf(Element),
  dark: PropTypes.bool,
  bottom: PropTypes.bool,
  isIphone: PropTypes.bool,
  showOnIphone: PropTypes.bool,
  presentationMenuStyle: PropTypes.bool,
  isFullscreen: PropTypes.bool,
  elementName: PropTypes.string,
  handleToggleFullScreen: PropTypes.func.isRequired,
  color: PropTypes.string,
  fullScreenStyle: PropTypes.bool,
};

const FullscreenButtonComponent = ({
  intl,
  dark = false,
  bottom = false,
  elementName = '',
  elementId,
  elementGroup,
  isIphone = false,
  showOnIphone = false,
  presentationMenuStyle = false,
  isFullscreen = false,
  layoutContextDispatch,
  currentElement,
  currentGroup,
  color = 'default',
  fullScreenStyle = true,
  fullscreenRef = null,
  handleToggleFullScreen,
}) => {
  if (isIphone && !showOnIphone) return null;

  const formattedLabel = (fullscreen) => (fullscreen
    ? intl.formatMessage(
      intlMessages.fullscreenUndoButton,
      ({ elementName: elementName || '' }),
    )
    : intl.formatMessage(
      intlMessages.fullscreenButton,
      ({ elementName: elementName || '' }),
    )
  );

  const handleClick = () => {
    // iPhone lacks reliable element fullscreen. The layout state below still
    // expands the content to the available browser viewport.
    if (!isIphone) {
      handleToggleFullScreen(fullscreenRef);
    }
    const newElement = (elementId === currentElement) ? '' : elementId;
    const newGroup = (elementGroup === currentGroup) ? '' : elementGroup;

    layoutContextDispatch({
      type: ACTIONS.SET_FULLSCREEN_ELEMENT,
      value: {
        element: newElement,
        group: newGroup,
      },
    });
  };

  return (
    <Styled.FullscreenButtonWrapper
      theme={dark ? 'dark' : 'light'}
      position={bottom ? 'bottom' : 'top'}
      presentationMenuStyle={presentationMenuStyle}
    >
      <Styled.FullscreenButton
        color={color || 'default'}
        icon={!isFullscreen ? 'fullscreen' : 'exit_fullscreen'}
        size="sm"
        onClick={() => handleClick()}
        label={formattedLabel(isFullscreen)}
        hideLabel
        isStyled={fullScreenStyle}
        presentationMenuStyle={presentationMenuStyle}
        data-test="webcamFullscreenButton"
      />
    </Styled.FullscreenButtonWrapper>
  );
};

FullscreenButtonComponent.propTypes = propTypes;

export default injectIntl(FullscreenButtonComponent);
