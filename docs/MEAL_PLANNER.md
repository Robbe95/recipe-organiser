# Meal planner & kitchen PWA

This is the living product and implementation brief for the meal-planning work.
Update the progress checklist and decisions here whenever a related feature is
implemented or its scope changes.

## Product goal

The organiser has two deliberately separate experiences:

- **Management app:** the existing dashboard where recipes, ingredients,
  imports, and settings are maintained.
- **Kitchen PWA:** a phone-first, installable cooking companion on its own
  subdomain. It has no navigation, labels, or links back to the management
  app. Its three tabs are **Recipes**, **Meal plan**, and **Shopping list**.

The kitchen experience should feel close to a native iOS app: fast, quiet,
touch-first, and reliable when the screen locks or connectivity is poor.

## Sharing and access model

Build **households now**, before the meal planner. A household is the private
shared space that owns recipes, ingredient library, meal plan, shopping list,
and cooking history. Every member can initially see and edit everything in its
household; roles and more granular permissions can come later.

The existing account starts in one automatically created household (for example
`Robbe's kitchen`). Inviting another person adds their existing/new account to
that household. This gives the desired "everyone sees it all" experience to
the people invited to the kitchen, without publishing private recipes to the
internet.

Keep `createdById` as an audit/attribution field, but make `householdId` the
access and data-scoping field. A single, shared household is all the initial UI
needs; support for selecting between multiple households can remain internal
until it is actually useful.

Do not use unauthenticated public APIs as the sharing mechanism. The kitchen
PWA can have no management-app navigation while still requiring a signed-in
household member. The current Kitchen recipe-list and cooking-read endpoints
are public; securing and household-scoping them is a prerequisite of this work.

## Core meal-plan flow

1. In Kitchen > Recipes, tap **Start a meal plan**.
2. Select one or more recipes. A selected recipe has a serving count (initially
   the recipe's default portions) and can appear more than once when wanted.
3. Tap **Add to meal plan**.
4. Show a review screen titled **Add ingredients to shopping list**. It lists
   the resulting ingredient requirements, grouped by aisle/category and merged
   where units can safely be combined. The user can deselect anything already
   at home, then confirms.
5. Create a distinct meal-plan item for each chosen recipe and add the selected
   ingredient requirements to the shopping list.
6. In Kitchen > Meal plan, each meal-plan item can be cooked or removed.
7. Finishing a cooking session removes the specific meal-plan item that started
   that session. It does not remove another planned copy of the same recipe.

Removing a meal-plan item after it was added does **not** automatically remove
its shopping-list items. The shopping list represents the user's intended
purchase list and should remain predictable. We can later add an explicit
"recalculate list from plan" action with a clear review step.

## Shopping list requirements

- Persistent, per-user list; it is not a transient checkout screen.
- Add manual items as well as ingredients from a meal plan.
- Combine equivalent ingredient lines while preserving a link to their source
  meal-plan items where possible.
- Keep incompatible quantities separate (for example, `2 cans` and `300 g`)
  instead of making unsafe conversions.
- Group by ingredient type/aisle; let the user collapse groups and optionally
  choose a custom group/order later.
- One-tap check-off, with completed items moved out of the active flow but
  recoverable during the current shop.
- Edit amount, unit, and note; support a quantity-less item such as `Salt`.
- Support swipe/touch actions with an undo toast for destructive actions.
- Clearly distinguish optional recipe ingredients; optional ingredients are
  excluded by default but can be included in the review.
- A progress indicator, active/completed separation, and an explicit
  "clear completed" action with confirmation.

## Kitchen PWA interaction requirements

- A fixed, safe-area-aware iOS-style bottom tab bar with Recipes, Meal plan,
  and Shopping list. It must not cover controls or browser home indicators.
- Mobile-first layouts; cards and controls have comfortable touch targets
  (minimum 44 px) and instant visual feedback.
- Keep transitions subtle and fast: shared-feeling card/detail navigation,
  sheets for short decisions, spring-like but reduced-motion-safe animation.
- The current cooking screen remains focused, wake-lock aware, and resilient to
  reloads. Its completion flow will receive a `mealPlanItemId` context.
- PWA installability: manifest, icons, standalone display, theme/background
  colors, and a service-worker strategy for the kitchen shell and recently used
  recipe data. Offline writes need an honest retry state rather than silently
  failing.
- Kitchen lives under a dedicated hostname, for example
  `kitchen.example.com`. Route/host handling must make the kitchen shell
  available there without exposing a management-app entry point. DNS and the
  production custom-domain alias are deployment configuration, not merely a
  frontend redirect.

## Data model direction

The plan is a queue of recipe instances, not a calendar. A meal-plan item needs
its own ID so repeated recipes and the cooking-completion behaviour are
unambiguous.

- `household`: `id`, `name`, `createdById`, `createdAt`.
- `household_member`: `householdId`, `userId`, `role`, `joinedAt`; unique per
  household/user.
- Existing household-owned entities gain `householdId`, backfilled into the
  initial household for the current account. `createdById` remains where it
  records who made something.
- `meal_plan_item`: `id`, `householdId`, `createdById`, `recipeId`, `portions`, `createdAt`,
  optional `note`, `sortOrder`.
- `shopping_list_item`: `id`, `householdId`, `createdById`, optional `ingredientId`, display
  name, amount, unit, type/group snapshot, note, completion state/order, and
  timestamps.
- `shopping_list_item_source`: joins a shopping-list line to one or more
  meal-plan items (and carries the contributed quantity when needed).
- `recipe_cooking_session`: gains an optional `mealPlanItemId` when a session
  was launched from the plan. Completion atomically writes history and removes
  that item.

All new tables belong to the existing `recipes` schema and are user-scoped. API
queries and mutations must enforce ownership exactly as recipe APIs do.

## Decisions already made

- Meal plan means "recipes I intend to cook", not scheduled calendar meals.
- A cooked planned meal leaves the plan automatically.
- Ingredient confirmation happens before both plan and shopping-list writes.
- Kitchen is a standalone PWA experience; management is intentionally absent
  from it.
- Initial tab scope is exactly Recipes, Meal plan, Shopping list.
- Repeated recipes appear as separate meal-plan cards, so each planned cooking
  instance has its own state and can be removed independently.
- Intended kitchen hostname: `meals.robbevaes.com` (final deployment/DNS
  configuration to be completed when the subdomain is created).
- Households are part of the first implementation. The app starts with one
  private household; every household member can see and edit its content.

## Decisions to settle before implementation

- Whether an ingredient deselected during the review is remembered as pantry
  stock. Recommended for v1: no pantry inventory yet; deselection applies only
  to that addition.
- Whether shopping-list completion is a simple checked state or supports a
  separate "in cart" state. Recommended for v1: checked/un-checked only.
- Subdomain name and production host setup. Recommended: a neutral kitchen
  hostname such as `kitchen.<your-domain>`.

## Delivery slices

- [ ] Finalise this brief and the three decisions above.
- [x] Add household schema and backfill every existing user into their own
  initial household.
- [ ] Scope existing recipe and ingredient data by household membership. Kitchen
  endpoints are authenticated and owner-scoped as an interim privacy fix.
- [x] Add schema migration and typed server API for initial plan/list data.
- [x] Add recipe selection and ingredient-review flow.
- [x] Build initial Meal plan and Shopping list tabs (view, add, and check off).
- [x] Thread plan context through cooking finish and remove that exact cooked item.
- [x] Redesign kitchen shell as an iOS-inspired floating glass bottom dock.
- [x] Add initial manifest, standalone install metadata, and kitchen-shell
  service-worker caching. Offline mutations still need a visible retry queue.
- [ ] Configure and verify the kitchen subdomain in the deployment environment.
- [ ] Exercise the complete flow on an iPhone-sized viewport and a real iOS
  device, including offline/reload, safe areas, and reduced motion.

## Future ideas (not part of the initial delivery)

These are deliberately parked so they can be added when the core loop feels
excellent.

- **Cook tonight:** a single prominent suggested meal based on plan order,
  estimated time, favourites, and ingredients already marked as bought.
- **Plan suggestions:** "use this soon", variety prompts, leftover-aware
  suggestions, a random pick from the plan when nobody can decide, and smart
  repeat timing such as "you last made this three weeks ago".
- **Recipe availability:** label a planned recipe as ready to cook, or show the
  number of items still missing. Availability should use bought shopping-list
  items and the lightweight pantry/staples model below.
- **Portion-aware plan:** changing a meal-plan item's portions recalculates its
  contribution to still-active shopping-list items, with a review if the list
  was already edited manually.
- **Household sharing:** a shared kitchen/list with live updates and a small
  "Robbe added eggs" activity trail. This needs an explicit household model,
  rather than exposing recipes to every account by default. The preferred
  transport is server-sent events (SSE): immediately reflect check-offs,
  additions, and edits on every connected kitchen screen, with a normal query
  refresh/reconnect fallback.
- **Pantry and expiry:** optionally track staples, quantities, expiry dates,
  barcode scans, and reminders to use food before it expires.
- **Staples / already-have:** before full pantry inventory, support an
  easy-maintained household staples list (for example salt, pepper, olive oil).
  These items are excluded from shopping-list additions by default and count
  toward recipe availability.
- **Smart shopping:** store-specific aisle order, multiple stores, price notes,
  recurring staples, and a per-store filtered list.
- **Conflict-safe live edits:** when collaborators change the same line, show
  the newest server-confirmed value plus a compact attribution/activity hint;
  never silently overwrite an edit on a stale phone.
- **Recipe intelligence:** substitute suggestions, portion scaling, dietary
  filters, duplicate ingredient detection, and a "what can I cook now?" view.
- **Cooking companion:** hands-free next-step controls, parallel timer stack,
  lock-screen/live-activity timers, and a high-contrast one-handed mode.
  Spoken instruction playback is explicitly not planned.
- **Meal history:** ratings, notes, photos, actual cook time, leftovers, and a
  low-pressure "make again" reminder. Extend the existing cooking-history
  foundation instead of creating a competing history feature.
- **Calendar/export:** optional schedule dates and a read-only calendar feed,
  while preserving the unscheduled queue as the default experience.
- **Delight:** a subtle completion celebration and seasonal meal collections.
  Treat custom haptics as native-app-only: iOS browser/PWA support is not
  dependable enough to make it a product promise. These should remain optional
  and never slow down the kitchen flow.

## Progress log

### 2026-09-10

- Created the initial requirements and delivery plan.
- No meal-planner behaviour has been implemented yet.
- Confirmed that duplicate planned meals are separate cards and recorded
  `meals.robbevaes.com` as the intended kitchen hostname.
- Added future direction for SSE-powered household sharing; cooking companions
  without spoken instructions; richer use of the existing cooking history; and
  visual rather than promised PWA haptic delight.
- Accepted future direction for recipe availability, portion-aware shopping
  adjustments, household staples, conflict-safe shared-list edits, and smart
  repeat timing.
- Started implementation: added household and meal-planner tables with a
  backfill migration; secured Kitchen recipe access; added typed plan/list APIs;
  and delivered the first mobile Kitchen tab bar, recipe selection/review flow,
  Meal plan view, and check-off shopping list.
- Added manual shopping-list items and clearing completed items; portion controls
  before the ingredient review; automatic removal of a completed planned meal;
  and the installable Kitchen PWA shell with the iOS-style frosted dock.
- Reworked the Kitchen interaction model after visual review: Kitchen is now a
  native-style full-width tab bar (not a floating segmented control), with
  large per-screen titles, inset grouped surfaces, compact recipe rows, and no
  tab bar while actively cooking a recipe.
- Continued the native pass: cooking now has a compact toolbar, focused content
  width, a dedicated action bar, and large one-handed back/next controls;
  recipes, meal plan, and shopping list use a consistent mobile content width
  and iOS-style visual hierarchy.
- Added normal dashboard counterparts for Meal plan and Shopping list, and
  connected them to the management sidebar. They use the dashboard layout and
  are intentionally desktop-oriented, while Kitchen remains the focused PWA.
- Made Kitchen responsive rather than phone-only: phone and tablet share the
  same bottom liquid-glass dock; tablet simply gives it more breathing room,
  wider two-column browse/plan surfaces, and a split-screen cooking workspace.
  Kitchen deliberately has no sidebar.
- Refined the dock after design review: fixed tablet width, single-line tab
  labels, raised active-glass surface, specular edge, and a dedicated material
  treatment instead of a generic dark card.
- Slimmed the dock after tablet review and redesigned the resume state as a
  compact contextual “Continue cooking” module, retaining the recipe image,
  name, resume action, and dismiss action together.
- Added a dashboard-native `/meal-plan/new` builder: select recipes, choose
  portions, review individual shopping-list additions, and create the plan
  without opening Kitchen.
- Extended Kitchen’s visual direction across the normal application: layered
  cyan/green ambient gradients, translucent dashboard navigation surfaces,
  cleaner material borders, and reduced-motion-safe page-surface transitions.
- Added opt-in Nuxt View Transitions for fast Kitchen navigation (Recipes,
  Meal plan, Shopping list, and plan creation). The active cooking route stays
  transition-free so live timers and one-handed controls remain immediate.
- Replaced Kitchen’s abrupt generic loading blocks with purpose-built,
  layout-matched shimmer placeholders and a subtle animated cooking-pot cue.
  Added a thin, throttled global navigation indicator so route changes have
  feedback without flashing on quick transitions.
- Applied the meal-planner migration to the configured database. Shopping-list
  entries can now be added in either app surface and edited (name, amount,
  unit, and note) from both the dashboard and Kitchen.
- Made the high-frequency kitchen actions optimistic: shopping check-offs,
  clearing completed items, item edits, and recipe wishlist/favourite taps
  render locally first, reconcile with the server response, and safely restore
  the prior state if the request fails. Tightened the shopping editor into a
  compact glass sheet rather than a wide generic dialog.
- Kept the ingredient preview stable while portions change in Kitchen plan
  creation; the recalculated amounts now swap in quietly with a small inline
  indicator instead of replacing the entire screen with a loading state.
- Completing a recipe now removes exactly one matching planned meal even when
  cooking was started from Recipes or resumed outside the plan card; duplicate
  plans remain separate. The meal-plan cache is invalidated immediately after
  completion so the queue stays current.
- Fixed the dashboard meal-plan builder route: Nuxt nests `/meal-plan/new`
  beneath `/meal-plan`, so the parent now supplies the required child-page
  outlet while retaining the regular plan list at `/meal-plan`.
- Reworked shopping-list responsiveness after cache-level optimistic updates
  proved visually unreliable: Kitchen and dashboard now render directly from a
  local optimistic list, restoring the prior list on a failed request. Active
  items are visibly grouped by their ingredient type/group, and the edit form
  is compactly arranged as item, amount, unit, and an optional note.
- Fixed recipe-editor section creation so each new section receives a stable
  identity and appears immediately rather than being reused by the renderer.
- Added a per-ingredient “Generally in the pantry” setting. Pantry staples are
  shown in the plan review but are unticked by default; the server applies the
  same default if a client does not submit an explicit ingredient selection.
  Applied the matching database migration (`0007_misty_butterfly`).
- Replaced the meal-planner, shopping, Kitchen, ingredient-library, and
  cooking-history skeleton loaders with one compact motion-driven loading view:
  a calm animated pot and steam cue that fades into place without layout
  flicker.
- Added a real `AnimatePresence` handoff for the three primary Kitchen tabs:
  the loading state now exits before the loaded content fades and lifts in,
  rather than relying on an abrupt conditional-render swap.
- New meal-plan selections now start at two portions in both Kitchen and the
  dashboard builder; recipe defaults remain available as recipe metadata.
- Shopping-list groups now follow a supermarket-friendly walk order—produce,
  bakery/pasta, protein, dairy, pantry, frozen, household, then other—in both
  Kitchen and the dashboard, rather than alphabetical order.
- Recipe imports now include a reviewable pantry-staple flag. The AI is given
  explicit examples (salt, pepper, dried herbs, oil, vinegar, sugar, flour),
  and newly imported ingredient records retain that choice so pantry staples
  begin unticked in meal-plan shopping review.
