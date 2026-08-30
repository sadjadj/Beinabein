import { useSearchParams } from 'react-router-dom';

// Keeps the active tab in the URL (?tab=...) so browser back/forward
// restores the exact tab the user was on after navigating away and back.
export function useTabFromUrl(defaultTab) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || defaultTab;
  const setTab = (next) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (!next || next === defaultTab) p.delete('tab');
      else p.set('tab', next);
      return p;
    }, { replace: true });
  };
  return [tab, setTab];
}