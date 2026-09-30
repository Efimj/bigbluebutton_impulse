import styled, { css } from 'styled-components';
import {
  borderSize,
  borderSizeSmall,
  navigationSidebarListItemsWidth,
  navigationSidebarIconSize,
  navigationSidebarIconSizeSmallHeight,
  navigationSidebarNotificationBadgeSize,
  navigationSidebarNotificationBadgeFontSize,
  navigationSidebarNotificationBadgeBottom,
  navigationSidebarNotificationBadgeRight,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  colorWhite,
  notificationBadgeBg,
  colorPrimary,
  listItemBgHover,
  itemFocusBorder,
  colorGrayIcons,
  colorGrayLightest,
} from '/imports/ui/stylesheets/styled-components/palette';
import { ListItemProps } from './types';

const smallHeight = '(max-height: 40em)';

export const ListItem = styled.div<ListItemProps>`
  position: relative;
  display: flex;
  flex-flow: column;
  align-items: center;
  justify-content: center;
  align-self: center;
  text-decoration: none;
  color: ${colorGrayIcons};
  cursor: pointer;
  width: ${navigationSidebarListItemsWidth};
  aspect-ratio: 1 / 1;
  border-radius: 50%;

  ${({ $variant }) => $variant === 'sheet' && css`
    width: 100%;
    min-height: 5rem;
    aspect-ratio: auto;
    border-radius: .75rem;
    padding: .625rem .35rem;
    gap: .35rem;
    background-color: ${listItemBgHover};

    > i {
      font-size: 1.5rem;
    }
  `}

  ${({ $variant }) => $variant === 'primary' && css`
    width: 100%;
    min-width: 2.75rem;
    min-height: 3.5rem;
    aspect-ratio: auto;
    border-radius: .5rem;
    gap: .15rem;
    color: ${colorWhite};

    > i {
      font-size: 1.35rem;
      color: ${colorWhite};
    }
  `}

  > i {
    font-size: ${navigationSidebarIconSize};
    color: ${colorGrayIcons};

    @media ${smallHeight} {
      font-size: ${navigationSidebarIconSizeSmallHeight};
    }
  }

  &:hover {
    outline: transparent;
    outline-style: dotted;
    outline-width: ${borderSize};
    background-color: ${listItemBgHover};
  }

  &:active,
  &:focus {
    outline: transparent;
    outline-width: ${borderSize};
    outline-style: solid;
    background-color: ${listItemBgHover};
    box-shadow: inset 0 0 0 ${borderSize} ${itemFocusBorder}, inset 1px 0 0 1px ${itemFocusBorder};
  }

  ${({ $active }: ListItemProps) => $active && `
    outline: transparent;
    outline-style: dotted;
    outline-width: ${borderSize};
    color: ${colorWhite};
    background-color: ${colorPrimary} !important;
    > i {
      color: ${colorWhite} !important;
    }
  `}

  ${({ $hasNotification, $hasPrivateNotification }: ListItemProps) => $hasNotification && !$hasPrivateNotification && `
    &:after {
      content: '';
      position: absolute;
      border-radius: 50%;
      width: ${navigationSidebarNotificationBadgeSize};
      height: ${navigationSidebarNotificationBadgeSize};
      bottom: ${navigationSidebarNotificationBadgeBottom};
      right: ${navigationSidebarNotificationBadgeRight};
      background-color: ${notificationBadgeBg};
      border: ${borderSizeSmall} solid ${colorWhite};
    }
  `}

  ${({ $hasPrivateNotification }: ListItemProps) => $hasPrivateNotification && `
    &:after {
      content: '@';
      position: absolute;
      border-radius: 50%;
      width: ${navigationSidebarNotificationBadgeSize};
      height: ${navigationSidebarNotificationBadgeSize};
      bottom: ${navigationSidebarNotificationBadgeBottom};
      right: ${navigationSidebarNotificationBadgeRight};
      background-color: ${notificationBadgeBg};
      border: ${borderSizeSmall} solid ${colorWhite};
      color: ${colorWhite};
      font-size: ${navigationSidebarNotificationBadgeFontSize};
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
  `}

  ${({ $disabled }) => $disabled && `
    cursor: not-allowed;
    border: none;
    background-color: ${colorGrayLightest};
  `}

  ${({ $locked }) => $locked && `
    cursor: normal;
    border: none;
    background-color: ${colorGrayLightest};
  `}

  :disabled {
    border: none;
  }
`;

export const Label = styled.span<{ $variant?: string }>`
  width: 100%;
  overflow: hidden;
  color: inherit;
  font-size: ${({ $variant }) => ($variant === 'primary' ? '.68rem' : '.75rem')};
  font-weight: 500;
  line-height: 1.15;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default {
  ListItem,
  Label,
};
