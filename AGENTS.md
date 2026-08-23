# Application conventions

- Protected application pages must use the dashboard layout and auth middleware:
  `definePageMeta({ layout: 'dashboard', middleware: 'auth' })`.
- Use `PageHeader` for page titles and descriptions. Put breadcrumbs and page-level actions in its respective slots so they teleport into the dashboard header.
- Keep dashboard page content within the shared dashboard layout; do not build separate page shells.
