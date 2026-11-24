/** The routes: a view, a search, the settings; all in the side navigation shell (components/Frame). */
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  retainSearchParams,
} from '@tanstack/react-router';
import { routeErrorComponent, routeNotFoundComponent, routePendingComponent } from 'tailor/core';
import { Frame } from './components/Frame';
import { ItemsPage } from './pages/Items';
import { SettingsPage } from './pages/Settings';
import { useSettings, useViews } from './queries';

/** The theme preview keys stay in the address from page to page (see theme.tsx). */
const THEME_PARAMS = ['skin', 'palette', 'mode'] as const;
type ThemeSearch = Partial<Record<(typeof THEME_PARAMS)[number], string>>;

const themeSearch = (search: Record<string, unknown>): ThemeSearch =>
  Object.fromEntries(
    THEME_PARAMS.flatMap((k) => (typeof search[k] === 'string' ? [[k, search[k] as string]] : [])),
  );

const root = createRootRoute({
  validateSearch: themeSearch,
  search: { middlewares: [retainSearchParams([...THEME_PARAMS])] },
  component: () => (
    <Frame>
      <Outlet />
    </Frame>
  ),
  notFoundComponent: routeNotFoundComponent,
  errorComponent: routeErrorComponent,
  pendingComponent: routePendingComponent,
});

/** `/` without a query opens the default view; `/?q=` is a search of its own. */
function Home() {
  const { q } = search.useSearch();
  const { settings, loaded } = useSettings();
  const { views, loaded: viewsLoaded } = useViews();
  if (q !== undefined) return <ItemsPage query={q} />;
  if (!loaded || !viewsLoaded) return routePendingComponent();
  const view = views.find((v) => v.id === settings.defaultView) ?? views[0];
  if (!view) return <ItemsPage query="" />;
  return <Navigate to="/views/$viewId" params={{ viewId: view.id }} replace />;
}

const search = createRoute({
  getParentRoute: () => root,
  path: '/',
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s.q === 'string' ? { q: s.q } : {}),
  component: Home,
});

function ViewRoute() {
  const { viewId } = view.useParams();
  return <ItemsPage viewId={viewId} />;
}

const view = createRoute({ getParentRoute: () => root, path: '/views/$viewId', component: ViewRoute });

const settings = createRoute({ getParentRoute: () => root, path: '/settings', component: SettingsPage });

export const router = createRouter({
  routeTree: root.addChildren([search, view, settings]),
  defaultPreload: false,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
