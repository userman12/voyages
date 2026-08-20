# Voyages

An interactive historical atlas: six sea expeditions traced on an illustrated
chart, with dated stops, narrative cards, documented consequences and sources.

Entirely static: plain HTML, CSS and ES modules. No build step, no framework,
no backend, no API keys. The one runtime dependency is **Three.js**, loaded
from a CDN by an import map — it draws the 3D globe. Nothing else in the app
needs it: the flat chart is plain hand-rolled SVG, as it always was.

## Running locally

You need an HTTP server, because the page uses ES modules.

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765>.

## Publishing on GitHub Pages

The repository is ready as-is: enable GitHub Pages on branch `main`, folder
`/root`. There is nothing to build.

## Structure

```
index.html            app shell
css/style.css         theme, layout, responsive, prefers-reduced-motion
js/main.js            state, playback, URL sync
js/scene.js           flat view: 2D camera, route, animated ship, markers
js/globe.js           globe view: the same chart, WebGL, via Three.js
js/cartography.js     chart drawing: symbols, land, relief, decorations
js/geo.js             routes on the sphere, longitude unwrapping, time model
js/format.js          dates, durations and distances
js/minimap.js         route previews for the chooser cards
js/ui.js              DOM: pop-up chooser, panels, timeline, pins, modals
data/voyages.js       expedition dataset
data/landmasses.js    stylised coastlines (original drawing)
data/relief.js        mountain ranges, forests and sea decorations
assets/favicon.svg
STYLE-GUIDE.md        palette, line work, components, formats, checklist
```

## State in the URL

Every expedition and every stop has a direct link:

```
?voyage=columbus-1492
?voyage=magellan-1519&step=3
?voyage=cook-1768&view=globe
```

The **Share** button copies the link to the current state.

## Controls

| Action | Control |
| --- | --- |
| Play / pause | spacebar, or the button in the timeline |
| Next / previous stop | ← → , or the timeline buttons |
| Speed | 0.5× · 1× · 2× · 4× |
| Scrub the timeline | slider or stop markers |
| Pan / zoom the chart | drag, wheel, pinch |
| Flat chart ↔ globe | the **Globe** button in the top bar |
| Close a dialog | Esc |

Dragging the chart leaves **Follow ship** mode; the button of the same name
turns it back on.

## Visual register

An illustrated nautical chart in 3/4 perspective. The full rules live in
[STYLE-GUIDE.md](STYLE-GUIDE.md); in short:

- **2D illustration**, never a 3D render: depth comes from overlap, from the
  shadow slab under the land and from a 12% vertical squash.
- **Coastal halos** in concentric bands, scaled to the landmass: a small island
  with a continental halo would turn into a target.
- **Line-drawn symbols** — relief, trees, towns, sea monsters, compass roses —
  as `<symbol>` elements reused hundreds of times.
- **The ship always stays upright**: it mirrors when heading west and tilts at
  most 18°. Actually rotating it would turn it upside down and break the
  perspective.
- **Route**: dashed where it is still to be sailed, solid where it has been
  covered; progress is a single `stroke-dashoffset`.
- The map is **tiled beside itself** when needed: a circumnavigation exceeds
  360°, and without the tiles the route would jump from one edge to the other.
- **Zoom and panning are bound to the chart**: at minimum zoom the whole map
  fits the window and stays centred, and it can never be dragged past its own
  edges. On tall screens it still fills at least 68% of the height, otherwise it
  would shrink to a strip.

## Globe view

The same chart, wrapped on an actual sphere and rendered by WebGL through
Three.js — not a second set of artwork and not a photorealistic Earth. The
land, relief, trees, sea and coastal halos are painted **once** onto a single
equirectangular texture, using the exact same drawing code as the flat chart
(`decorItems()` in `js/cartography.js`, just projected without the flat
map's squash and tiling), then wrapped on a sphere at the flat chart's own
pixel density — a mountain is the same visual size either way.

An earlier version of this view was plain SVG: an orthographic projection
redrawn by hand on every rotation step, which meant rebuilding a couple of
thousand DOM nodes each frame. That was what made it laggy, not the amount of
geometry — so the fix was not "optimise the redraw", it was "stop redrawing".
Confirmed with a `MutationObserver` on the map's container during four
seconds of active rotation: the SVG version churned continuously; this one
produces zero DOM mutations, because rotating the globe is now one GPU-side
quaternion update.

Everything that moves — the ship, the port pins, the town markers — is a
small billboard sprite, rasterised once from the same SVG symbols the flat
chart uses and just repositioned each frame; a wake sprite shows only while
the ship is actually under way. The route is two thin lines (sailed, solid;
still to sail, dashed) rather than the flat chart's thick ribbon — WebGL line
width is capped at ~1px on most GPUs, and a full ribbon mesh wasn't worth
building for one secondary element when the coastline, relief and vegetation,
the dominant visual content, are pixel-identical to the flat map by
construction.

- Points behind the horizon are handled by ordinary depth testing — the
  camera stays fixed and the *world* rotates, so a sprite on the far side of
  the sphere is simply occluded by the sphere itself, the same way it would
  be in reality.
- **Following the ship turns the globe gradually** — it eases toward the ship
  rather than tracking it, so a voyage reads as the world rolling underneath.
- The zoom range is deliberately short: past a point a sphere stops reading as
  one, and that is what the flat chart is for.
- Framing centres on **the ship, not the route's centroid** — a round-the-world
  track has no centre that shows all of it, and the centroid of one can sit at
  the antipode of the departure.
- The rotation math (which quaternion centres the view on a given lat/lon)
  has a runnable check: open the app with `?selftest=globe` and read the
  console, or `import('./js/globe.js').then(m => m.__selfTestWorldQuaternion())`
  in a browser context.

## Interface

Storybook skin: the widgets speak the map's own language — the palette from
`js/cartography.js`, thick ink outlines, rounded joins, and the **slab shadow**
from [STYLE-GUIDE.md](STYLE-GUIDE.md) §1.3 — an offset with no blur, the mark of
a drawn surface rather than a floating pane. Buttons squash when pressed: the
slab shrinks and the cap drops onto it. Fat 3px outlines, a 5px slab and
saturated colour push the whole thing toward a storybook page.

Type is `ui-rounded` (SF Pro Rounded on Apple systems), which carries the
cartoon register while staying a system font — no network request, no odd
fallback.

This was settled on after trying two other skins (a plain parchment cartouche
and a night-time "ship's log") side by side through a live switcher; storybook
won and the other two, and the switcher itself, were removed.

### Behaviour

- **The panel retracts ten seconds** after reaching a stop, and a dot on the tab
  signals unread text. Hovering or reading it keeps it open; clicking the tab
  turns the automatic retraction off for good.
- **A single bar at the bottom**: controls, date and leg on one line.
- **Following the ship the framing is wide** (74° of longitude).
- When the panel comes or goes, the map **reclaims the freed space**.

## Method

- Routes are **teaching approximations**: the stops are documented places, the
  stretches between them are curves drawn to stay at sea and remain readable.
- The coastlines are an original, simplified drawing, not a nautical chart.
  No historical map or third-party asset is used.
- Dates are those reported by the sources of the time. For expeditions before
  1582 the calendar in use was the Julian one: the code treats these as dates
  projected onto today's calendar purely to compute durations and progress.
- Where the historiography is uncertain, the figure is marked as estimated or
  approximate, or left out.
- The texts treat the expeditions as complex events — navigation, trade,
  coercion, science, conquest — and avoid a celebratory register.

Full sources, expedition by expedition, are in the **Method and sources** panel.

## Accessibility

- Native HTML controls over the chart, with ARIA labels and keyboard navigation.
- `prefers-reduced-motion`: camera transitions become instant, and the ship's
  bob, the wake drift and the interface animations are switched off.
- Responsive layout: on narrow screens the chooser becomes a full-screen sheet
  and the context panel moves above the timeline, still retractable.
- Framing accounts for the space taken by the panels, so the route never ends up
  hidden underneath the interface.
