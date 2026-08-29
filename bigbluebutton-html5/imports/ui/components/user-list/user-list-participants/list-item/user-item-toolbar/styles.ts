import styled from 'styled-components';
import {
  colorGrayIcons,
  colorGrayUserListToolbar,
  colorPrimary,
} from '/imports/ui/stylesheets/styled-components/palette';

const ToolbarContainer = styled.div`
  border-radius: 1.5rem;
  background-color: ${colorGrayUserListToolbar};
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem 1rem;
  align-items: center;
`;

const ToolbarItem = styled.div<{ disabled?: boolean, hasText?: boolean, $active?: boolean }>`
  cursor: pointer;
  color: ${({ hasText, $active }) => ((hasText || $active) ? colorPrimary : colorGrayIcons)};
  padding: 0.125rem;
  border-radius: 50%;
  background-color: ${({ $active }) => ($active ? 'rgba(15, 118, 210, 0.16)' : 'transparent')};

  line-height: 1;

  ${({ disabled }) => disabled && `
    cursor: not-allowed;
  `}
`;

const MoreItems = styled.div`
  cursor: pointer;
  color: ${colorGrayIcons};
`;

const Pipe = styled.span`
  color: ${colorGrayIcons};
`;

export default {
  ToolbarContainer,
  ToolbarItem,
  MoreItems,
  Pipe,
};
