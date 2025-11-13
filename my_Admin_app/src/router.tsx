// src/router.tsx
import type { ComponentChildren } from 'preact';
import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';

type RouterContextValue = {
  route: string;
  navigate: (to: string, replace?: boolean) => void;
};

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function getCurrentRoute() {
  // use hash-based routing; default to '/'
  const hash = typeof location !== 'undefined' ? location.hash : '';
  if (!hash) return '/';
  return hash.startsWith('#') ? hash.slice(1) || '/' : hash || '/';
}

export function RouterProvider({ children }: { children: ComponentChildren }) {
  const [route, setRoute] = useState<string>(getCurrentRoute());

  useEffect(() => {
    const onHash = () => setRoute(getCurrentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function navigate(to: string, replace = false) {
    if (replace) {
      const base = location.href.split('#')[0];
      location.replace(base + '#' + (to || '/'));
    } else {
      location.hash = to || '/';
    }
  }

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside a RouterProvider');
  return ctx;
}

export function Route({ path, children }: { path: string; children: ComponentChildren }) {
  const { route } = useRouter();
  // simple exact match; allow trailing slash tolerance
  const normalize = (p: string) => (p.endsWith('/') ? p.slice(0, -1) : p) || '/';
  const current = normalize(route);
  const want = normalize(path);
  if (want === current) return <>{children}</>;
  // support wildcard at end: '/foo/*'
  if (want.endsWith('/*')) {
    const base = want.slice(0, -2);
    if (current === base || current.startsWith(base + '/')) return <>{children}</>;
  }
  return null;
}

export function Link({ to, children }: { to: string; children: ComponentChildren }) {
  const { navigate } = useRouter();
  return (
    <a
      href={'#' + (to || '/')}
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        navigate(to);
      }}>
      {children}
    </a>
  );
}
