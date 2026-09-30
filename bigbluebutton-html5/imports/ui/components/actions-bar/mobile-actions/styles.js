import styled from 'styled-components';
import Drawer from '@mui/material/Drawer';
import {
  btnDefaultBg,
  colorGray,
  colorGrayLightest,
  colorPrimary,
  listItemBgHover,
  colorBackgroundDarkTheme,
  colorOverlay,
} from '/imports/ui/stylesheets/styled-components/palette';

const PrimaryBar = styled.div`
  --mobile-actions-radius: 1.75rem;
  --mobile-actions-padding: .75rem;
  --mobile-action-radius: 1rem;

  display: grid;
  grid-template-columns: repeat(${({ $hasReactions }) => ($hasReactions ? 5 : 4)}, minmax(0, 1fr));
  align-items: center;
  gap: .25rem;
  box-sizing: border-box;
  width: calc(100% - 1.25rem);
  height: 100%;
  margin: 0 auto;
  padding: var(--mobile-actions-padding);
  background: ${colorBackgroundDarkTheme};
  border-radius: var(--mobile-actions-radius);
  box-shadow: 0 .15rem .5rem ${colorOverlay};
`;

const ControlItem = styled.div`
  display: flex;
  min-width: 0;
  min-height: 2.75rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  > div,
  > span,
  > div > div,
  #interactionsButton {
    width: 100%;
  }

  button.buttonWrapper {
    width: 100%;
    max-width: none;
    min-width: 0;
    min-height: 2.75rem;
    margin-inline: auto !important;
    border-radius: var(--mobile-action-radius) !important;
  }

  button.buttonWrapper > span:first-of-type {
    box-sizing: border-box;
    width: 100% !important;
    height: 2.5rem !important;
    border-radius: var(--mobile-action-radius) !important;
  }
`;

const BottomSheet = styled(Drawer)`
  .MuiDrawer-paper {
    box-sizing: border-box;
    right: 0;
    left: 0;
    width: 100vw;
    min-width: 100vw;
    max-width: 100vw;
    margin: 0;
    max-height: min(82dvh, 42rem);
    padding-bottom: env(safe-area-inset-bottom, 0);
    overflow: hidden;
    color: ${colorGray};
    background: ${btnDefaultBg};
    border-radius: 1rem 1rem 0 0;
  }
`;

const Handle = styled.div`
  width: 2.5rem;
  height: .25rem;
  margin: .5rem auto .15rem;
  background: ${colorGrayLightest};
  border-radius: 999px;
`;

const Header = styled.div`
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  padding: .25rem 1rem;
`;

const Title = styled.h2`
  margin: 0;
  color: ${colorGray};
  font-size: 1.1rem;
`;

const CloseButton = styled.button`
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: ${colorGray};
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;

  &:focus-visible {
    outline: .125rem solid ${colorPrimary};
    outline-offset: .125rem;
  }
`;

const ScrollArea = styled.div`
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 1rem 1rem;
`;

const Section = styled.section`
  & + & {
    margin-top: 1rem;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 .5rem;
  color: ${colorGray};
  font-size: .8rem;
  font-weight: 600;
`;

const NavigationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .5rem;
`;

const AdditionalActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  padding: .5rem;
  background: ${listItemBgHover};
  border-radius: .75rem;

  button,
  [role='button'] {
    min-width: 2.75rem;
    min-height: 2.75rem;
  }
`;

export default {
  PrimaryBar,
  ControlItem,
  BottomSheet,
  Handle,
  Header,
  Title,
  CloseButton,
  ScrollArea,
  Section,
  SectionTitle,
  NavigationGrid,
  AdditionalActions,
};
