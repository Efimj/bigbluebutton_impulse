import { createContext, useContext } from 'react';

export type SidebarNavigationDisplayVariant = 'rail' | 'sheet' | 'primary';

interface SidebarNavigationDisplayContextValue {
  variant: SidebarNavigationDisplayVariant;
  onAction?: () => void;
}

const SidebarNavigationDisplayContext = createContext<SidebarNavigationDisplayContextValue>({
  variant: 'rail',
});

export const SidebarNavigationDisplayProvider = SidebarNavigationDisplayContext.Provider;

export const useSidebarNavigationDisplay = () => useContext(SidebarNavigationDisplayContext);
