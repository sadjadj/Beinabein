import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps the active tab in sync with a URL query param (default `?tab=`).
 * On mount it reads the param (validated against `validTabs`) so that
 * navigating back to the page restores the same tab. Changing the tab
 * rewrites the URL with `replace` (no extra history entries), so a
 * `navigate(-1)` from a detail page returns to this page on the same tab.
 *
 * @param {string} paramName   query param name, e.g. 'tab'
 * @param {string} defaultTab  fallback tab when param is missing/invalid
 * @param {string[]} validTabs list of accepted tab keys
 * @returns {[string, (value: string) => void]}
 */
export function useUrlTab(paramName, defaultTab, validTabs) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get(paramName);
  const initial = validTabs.includes(fromUrl) ? fromUrl : defaultTab;
  const [tab, setTabState] = useState(initial);

  const setTab = useCallback((value) => {
    setTabState(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === defaultTab) next.delete(paramName);
      else next.set(paramName, value);
      return next;
    }, { replace: true });
  }, [paramName, defaultTab, setSearchParams]);

  return [tab, setTab];
}