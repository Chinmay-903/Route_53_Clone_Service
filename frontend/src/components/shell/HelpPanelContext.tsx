'use client';

import { createContext, useContext, useMemo, useState } from 'react';

/**
 * Lets a page put content into the shell's Info panel.
 *
 * `AppLayout` owns the tools drawer, but the copy that belongs in it is
 * page-specific — so the shell provides the slot and each page fills it. A
 * context rather than prop drilling because the shell sits several layers above
 * any page in the App Router's layout tree, with server components in between.
 */

interface HelpPanelValue {
  content: React.ReactNode | null;
  open: boolean;
  setContent: (content: React.ReactNode | null) => void;
  setOpen: (open: boolean) => void;
}

const HelpPanelContext = createContext<HelpPanelValue | null>(null);

export function HelpPanelProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<React.ReactNode | null>(null);
  const [open, setOpen] = useState(false);

  const value = useMemo(
    () => ({ content, open, setContent, setOpen }),
    [content, open],
  );

  return <HelpPanelContext.Provider value={value}>{children}</HelpPanelContext.Provider>;
}

/**
 * Reads the Info panel slot.
 *
 * Returns a no-op outside the provider so a component can be rendered in a test
 * or in isolation without the whole shell around it.
 */
export function useHelpPanel(): HelpPanelValue {
  return (
    useContext(HelpPanelContext) ?? {
      content: null,
      open: false,
      setContent: () => undefined,
      setOpen: () => undefined,
    }
  );
}
