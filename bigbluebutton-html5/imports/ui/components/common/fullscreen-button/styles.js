import styled from 'styled-components';
import Button from '/imports/ui/components/common/button/component';
import {
  colorTransparent,
  colorWhite,
  colorBlack,
  colorGrayLightest,
  colorOffWhite,
} from '/imports/ui/stylesheets/styled-components/palette';

const FullscreenButtonWrapper = styled.div`
  position: absolute;
  right: 0;
  left: auto;
  background-color: ${colorTransparent};
  cursor: pointer;
  border: 0;
  z-index: 2;
  margin: 2px;

  [dir="rtl"] & {
    right: auto;
    left :0;
  }

  [class*="presentationZoomControls"] & {
    position: relative !important;
  }

  ${({ theme }) => theme === 'dark' && `
    background-color: rgba(0,0,0,.3);

    & button i {
      color: ${colorWhite};
    }
  `}

  ${({ theme }) => theme === 'light' && `
    background-color: ${colorTransparent};

    & button i {
      color: ${colorBlack};
    }
  `}

  ${({ position }) => position === 'bottom' && `
    bottom: 0;
  `}

  ${({ position }) => position === 'top' && `
    top: 0;
  `}

  ${({ presentationMenuStyle }) => presentationMenuStyle && `
    align-items: center;
    background-color: ${colorOffWhite};
    border-radius: 13px;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.16),
      0 2px 3px rgba(0, 0, 0, 0.24),
      0 2px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    height: 35px;
    justify-content: center;
    margin: 0;
    right: 3px;
    top: 2px;
    width: 35px;
    z-index: 999;

    &:hover {
      background-color: ${colorGrayLightest};
    }

    & button i {
      color: #2d2d2d;
    }

    [dir="rtl"] & {
      left: 3px;
      right: auto;
    }
  `}
`;

const FullscreenButton = styled(Button)`
  ${({ isStyled }) => isStyled && `
    &,
    &:active,
    &:hover,
    &:focus {
      background-color: ${colorTransparent} !important;
      border: none !important;

      i {
        border: none !important;
        background-color: ${colorTransparent} !important;
      }
    }
    padding: 5px;

    &:hover {
      border: 0;
    }

    i {
      font-size: 1rem;
    }
  `}

  ${({ presentationMenuStyle }) => presentationMenuStyle && `
    border-radius: 13px;
    height: 100%;
    padding: .3rem .5rem;
    width: 100%;
  `}
`;

export default {
  FullscreenButtonWrapper,
  FullscreenButton,
};
