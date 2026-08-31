import styled from 'styled-components';
import {
  colorGrayIcons,
  colorGrayUserListToolbar,
  colorDanger,
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

const ToolbarItem = styled.div<{
  disabled?: boolean,
  hasText?: boolean,
  $mediaState?: 'active' | 'locked',
}>`
  cursor: pointer;
  color: ${({ hasText, $mediaState }) => {
    if ($mediaState === 'locked') return colorDanger;
    if ($mediaState === 'active') return colorPrimary;
    return hasText ? colorPrimary : colorGrayIcons;
  }};
  padding: 0.125rem;
  border-radius: 50%;
  background-color: ${({ $mediaState }) => {
    if ($mediaState === 'locked') return 'rgba(223, 39, 33, 0.14)';
    if ($mediaState === 'active') return 'rgba(15, 111, 198, 0.14)';
    return 'transparent';
  }};

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
