# Voyages — 2D scene style guide

An illustrated nautical chart, 3/4 perspective, premium mobile-game quality.
Vector illustration: **never** a 3D render, low-poly, pixel art or photorealism.

---

## 1. Mini style guide

### 1.1 Palette

Six families, no colour outside this table. The tokens are the ones used in
`css/style.css` and `js/cartography.js`.

| Role | Token | HEX | Use |
| --- | --- | --- | --- |
| Light parchment | `--paper-100` | `#F4E9D2` | paper ground, panel fills |
| Parchment | `--paper-200` | `#E8D8B4` | land, tooltips |
| Shaded parchment | `--paper-300` | `#D3BC91` | inner coastal band, borders |
| Ochre | `--ochre-400` | `#C89A54` | relief, dunes, high ground |
| Dark ochre | `--ochre-600` | `#A2703A` | shaded face of relief |
| Deep petrol blue | `--sea-900` | `#0E3A47` | open sea |
| Petrol blue | `--sea-700` | `#17505F` | mid sea |
| Turquoise | `--sea-500` | `#2C8790` | coastal band |
| Light turquoise | `--sea-300` | `#5AB2AC` | surf, foam, wake |
| Brick red | `--brick-500` | `#B3462F` | route sailed, X, active markers |
| Dark brick | `--brick-700` | `#8A3221` | marker outlines, route shadow |
| Gold | `--gold-500` | `#D9A441` | compass rose, UI accents, frames |
| Light gold | `--gold-300` | `#F0C87A` | highlights on gold, text on dark |
| Ink | `--ink-900` | `#2B1F14` | primary outline |
| Soft ink | `--ink-600` | `#5A4632` | secondary outlines, hatching |
| Dark wood | `--wood-900` | `#1A130C` | UI shell, off-map panels |

**Saturation rule.** The sea is the only highly saturated area. Land stays
desaturated: the contrast of the scene comes from the land/sea jump, not from
bright colours on the ground.

**Accent rule.** Brick red and gold are reserved for what the user must look at:
route sailed, current stop, markers, calls to action. Never use them as
decorative colour.

### 1.2 Lines

The line work is soft ink: never dry, never purely geometric.

| Level | Weight @ scale 1 | Colour | Use |
| --- | --- | --- | --- |
| Primary outline | 2.4 px | `--ink-900` | coastlines, ship hull, islands |
| Secondary outline | 1.6 px | `--ink-900` at 85% | relief, trees, buildings, sails |
| Inner detail | 1.0 px | `--ink-600` at 60% | hatching, grain, deck planking |
| Coastal hatching | 1.2 px | `--ink-600` at 28% | bands parallel to the shore |
| Route | 3.2 px | `--brick-500` | dash `10 8`, round cap |

Non-negotiable rules:

- `stroke-linecap: round` and `stroke-linejoin: round` **everywhere**. No sharp corners.
- Absolute minimum weight 0.8 px: below that the line shimmers when animated.
- `vector-effect: non-scaling-stroke` on anything the camera enlarges, so the
  stroke does not thicken with zoom.
- No dashed strokes beyond the route and boundaries: a dash is a signal, not decoration.

### 1.3 Shadows

No heavy blurred shadows, no soft `drop-shadow` from 3D UI.

1. **Slab** — this is what gives the 3/4 perspective. Every landmass is repeated
   offset by `+8px` in Y, filled with `--ink-900` at 20%, and drawn *beneath* the
   main shape. The land reads as a thick plate resting on the sea.
2. **Shaded face** — on relief and buildings, the face turned to the lower right
   is filled with the darker variant of the colour (`--ochre-600` for rock).
   Light always from **upper-left**, shadows always towards **lower-right**.
3. **Contact shadow** — under ship and markers, an `--ink-900` ellipse at 14%, as
   wide as the object and a third as tall. Blur 2 px maximum.

Forbidden: radial gradients faking volume, bevels, glows, multiple shadows.

### 1.4 Texture

A single global texture, applied to the map group and to nothing else:

- `feTurbulence` `baseFrequency="0.8"` `numOctaves="3"` in `fractalNoise` mode,
  composited in `multiply` at **5–7% opacity**.
- Two or three ageing stains at the map edge: very blurred ellipses of
  `--ochre-600` at 6%.

The texture must never be applied to individual assets: if every piece carries
its own grain the scene gets dirty and the pieces stop looking drawn together.

### 1.5 Depth

Four planes, in this stacking order:

1. **Sea ground** — flat colour + coastal hatching + stylised waves
2. **Land** — slab, fill, outline, relief and vegetation
3. **Track** — dashed future route, solid sailed route
4. **Actors** — ship, wake, markers, labels

Depth comes **only** from overlap, slab and scale: no perspective
foreshortening, no vanishing points. Objects further south (lower on screen) are
slightly larger (max +12%): that is the only concession to depth of field.

### 1.6 Perspective

Consistent 3/4, achieved like this:

- the map plane is squashed vertically by **12%** (`scaleY 0.88`);
- vertical elements — ship, buildings, relief, trees — are drawn **in elevation**,
  not seen from above: you see the facade, and only a hint of the top face;
- every vertical element sits on its own bottom-centre anchor point.

---

## 2. Graphic components to produce

| # | Component | Contents | Variants |
| --- | --- | --- | --- |
| 1 | **Sea ground** | colour field, coastal hatching, stylised waves, currents | 3 wave densities (dense/medium/sparse) |
| 2 | **Islands and continents** | silhouette, slab, outline, beaches | each landmass is a unique piece |
| 3 | **Relief** | 3/4 mountains with shaded face, hills | 4 variants + 2 snow-capped |
| 4 | **Vegetation** | palms, conifers, broadleaves | 3 variants × 2 scales |
| 5 | **Ports and settlements** | isometric buildings, quays, towers | large port, town, outpost |
| 6 | **Ship** | 3/4 caravel, hull, 2–3 masts, sails, flag | still / under way / damaged |
| 7 | **Wake** | foam arcs behind the stern | 3 frames in a loop |
| 8 | **Route** | dashed future track, solid sailed track | + glowing head at the current point |
| 9 | **Stop marker** | engraved circle (not reached), brick X (reached) | + pulsing "current" state |
| 10 | **Tooltip** | parchment cartouche with name and date | left/right anchoring |
| 11 | **Event panels** | narrative card with ink frame | compact / extended |
| 12 | **Ornaments** | compass rose, sea monsters, cartouches, torn edge | 2 roses, 3 creatures |

---

## 3. Consistency rules

An asset is consistent with the others if it satisfies **all** of these.

**Geometry**
1. Drawn on an 8 px grid, anchored bottom-centre.
2. Rounded corners: minimum radius 2 px on exposed vertices.
3. Silhouette readable as a solid black shape at 32 px: if it is not, simplify it.

**Line work**
4. Only the three weights from table 1.2, no intermediate values.
5. Outlines always closed: no open lines that "fade out".
6. The outline is always darker than the fill, never the reverse.

**Colour**
7. Maximum **4 fills** per asset, all from the palette.
8. Each asset has exactly one lit face and one shaded face, consistent with the
   light from upper-left.
9. No colour sampled from a photograph or from an external asset.

**Volume**
10. Volume comes from two flat fills, never from a gradient.
11. A gradient is allowed only if the luminance step is ≤ 8% and linear.

**Scale**
12. Relative proportions are fixed: ship = 1.0, port building = 0.8,
    large mountain = 1.6, tree = 0.35.
13. An asset is never scaled beyond ±25% of its nominal size: past that, draw a
    variant instead.

**Behaviour**
14. Anything interactive has a gold or brick outline; anything decorative does not.
15. Every animated asset has a cycle whose duration is a multiple of 400 ms, so
    the cycles stay in phase with each other.

---

## 4. Web formats

| Component | Format | Why |
| --- | --- | --- |
| Sea ground, hatching, waves | **inline SVG** | generated at runtime, adapts to the viewport, zero requests |
| Islands and continents | **inline SVG** (paths from data) | must stay crisp at any zoom and receive clicks |
| Relief, trees, buildings | **SVG `<symbol>` + `<use>`** | one path in memory, hundreds of instances nearly free |
| Ship | **inline SVG**, group with an id | animated along the track and rotated to course |
| Wake | **SVG + CSS keyframes** | three arcs with offset opacity, no external asset |
| Route | **SVG `<path>`** + `stroke-dashoffset` | progress is a single animatable number |
| Markers | **SVG `<symbol>`** | same shape, state driven by a CSS class |
| Tooltips and panels | **HTML + CSS** | selectable, accessible, searchable text |
| Compass rose, cartouches | **inline SVG** | thin line work that must stay crisp |
| Paper texture | **SVG filter** (`feTurbulence`) | no file, no visible tiling |
| Torn edge | **SVG mask** | adapts to any aspect ratio |

**When PNG or a sprite sheet is the right call instead.** If assets later come
from an illustrator, the criteria are:

- illustration with painterly texture or irregular line work → **PNG @2x**
  (WebP with a PNG fallback), because vector cannot reproduce brush grain;
- more than 40 animation frames → **sprite sheet** in WebP, a single file;
- complex animation with authored easing (ship pitching, sails filling) →
  **Lottie**, which stays vector and stays small.

**Avoid.** GIF (256-colour palette and dirty edges), video for interface
elements, PNG for anything already geometric.

**Suggested budget**: under 400 KB for the whole scene, first render under 1.5 s
on 4G.

---

## 5. Consistency checklist for a new asset

Every item must pass before integration. If a single one fails, the asset does
not go in.

**Shape**
- [ ] Silhouette recognisable as a solid black shape at 32 px
- [ ] Anchored bottom-centre, aligned to the 8 px grid
- [ ] No sharp corners: round caps and joins throughout
- [ ] Closed outline, no line that fades out

**Line work**
- [ ] Only the three canonical weights (2.4 / 1.6 / 1.0 px)
- [ ] No stroke below 0.8 px
- [ ] `non-scaling-stroke` if the camera enlarges the element

**Colour**
- [ ] Every fill comes from the palette, no exceptions
- [ ] At most 4 fills
- [ ] The outline is darker than the fill

**Light and volume**
- [ ] Light from upper-left, shadow towards lower-right
- [ ] One lit face and one shaded face, both flat
- [ ] No gradient with a step > 8%, no bevel, no glow

**Perspective**
- [ ] Drawn in 3/4 elevation, not seen from above
- [ ] Vertical squash consistent with the map plane
- [ ] Relative scale within ±25% of the nominal value in rule 3.12

**Integration**
- [ ] No texture of its own: the grain comes from the map group
- [ ] If interactive, it has a gold or brick outline and `:hover`/`:focus` states
- [ ] If animated, the cycle is a multiple of 400 ms
- [ ] Contrast of any overlaid text ≥ 4.5:1

**Final test**
- [ ] Placed next to an already-approved ship and island, it looks drawn by the
      same hand in the same sitting

---

## 6. Marketplace keywords for commercially licensed assets

For Adobe Stock, Envato Elements, Creative Market, iStock, Shutterstock, itch.io
and Freepik. Always check for a **commercial and extended** licence if the asset
ends up inside a product.

**Full set / scene**
```
isometric treasure map illustration vector
pirate map game asset pack vector
hand drawn nautical chart vector set
adventure map ui kit vector
stylized world map game background vector
```

**Sea and background**
```
stylized ocean waves vector seamless
vintage sea chart wave lines vector
teal ocean map background flat illustration
hand inked water texture vector
```

**Land and relief**
```
isometric island vector illustration
hand drawn mountains map symbols vector
cartography mountain range icons vector
vintage map trees forest symbols vector
```

**Ship**
```
caravel sailing ship side view vector illustration
pirate galleon flat illustration vector
vintage sailing ship engraving vector
cartoon sailing ship game sprite
```

**Ornaments**
```
compass rose vector antique
sea monster kraken map illustration vector
vintage banner ribbon scroll vector
torn parchment paper edge vector
```

**Interface**
```
fantasy game ui parchment panel vector
adventure game ui kit wood gold vector
treasure map tooltip frame vector
```

**Ready-made animation**
```
lottie sailing ship animation
sprite sheet ship sailing loop
animated water waves lottie
```

**Recommended marketplace filters**: format `SVG` or `AI/EPS` (never JPG only),
orientation irrelevant, exclude "3D render" and "photo". On itch.io filter by
`2D` + `vector` + licence `commercial use allowed`.

**A warning on consistency.** A purchased pack still has to go through the
checklist in section 5: almost always the palette needs redoing and the stroke
weights need harmonising before it can be integrated.
