import styled from 'styled-components';
import { colorTransparent, colorWhite } from '/imports/ui/stylesheets/styled-components/palette';

const MenuWrapper = styled.div`
  position: absolute;
  inset-inline-end: 7px;
  top: 7px;
  background-color: rgba(0, 0, 0, 0.45);
  border-radius: 50%;
  height: fit-content;
  z-index: 3;

  button {
    padding: 5px;
    background-color: ${colorTransparent} !important;
    border: none !important;

    i {
      transform: rotate(90deg);
      border: none !important;
      color: ${colorWhite};
      background-color: ${colorTransparent} !important;
      font-size: 1rem;
    }
  }
`;

export default {
  MenuWrapper,
};
