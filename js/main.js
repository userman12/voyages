import { VOYAGES, METHOD } from '../data/voyages.js';
import { UI } from './ui.js';
import { formatDay } from './format.js';

const SPEEDS = [0.5, 1, 2, 4];
/** Degrees visible while following the ship: wide, to see where it is heading. */
const FOLLOW = 74;
/** Degrees visible when jumping to a stop: tighter, to read the place. */
const CLOSE = 46;

const state = {
  voyage: null,
  route: null,
  progress: 0,
  playing: false,
  speedIndex: 1,
  started: false,
  ended: false,
  stopIndex: -1
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Which projection is on screen: the flat chart or the globe. */
let viewKind = 'map';
let sceneMods = null;

/** Space taken by the panels: the route should be framed beside them, not under. */
function panelInset() {
  const p = document.getElementById('context-panel');
  const open = p && !p.hidden && !p.classList.contains('panel--closed');
  if (!open) return { insetRight: 0, insetBottom: 90 };
  // on narrow screens the panel sits at the bottom, on wide ones at the right
  return window.matchMedia('(max-width: 900px)').matches
    ? { insetRight: 0, insetBottom: p.offsetHeight + 120 }
    : { insetRight: p.offsetWidth + 44, insetBottom: 90 };
}

let scene = null;
let geo = null;
let ui = null;
let routeFade = 0;

/* --------------------------------------------------------------- URL state */

function readUrl() {
  const p = new URLSearchParams(location.search);
  const id = p.get('voyage');
  const step = p.get('step');
  const view = p.get('view');
  return {
    id: VOYAGES.some((v) => v.id === id) ? id : null,
    step: step != null && /^\d+$/.test(step) ? Number(step) : null,
    view: view === 'globe' || view === 'map' ? view : null
  };
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.voyage) {
    p.set('voyage', state.voyage.id);
    if (state.started && state.stopIndex > 0) p.set('step', String(state.stopIndex));
  }
  if (viewKind === 'globe') p.set('view', 'globe');
  const q = p.toString();
  history.replaceState(null, '', q ? `?${q}` : location.pathname);
}

/* ---------------------------------------------------------------- playback */

const speed = () => SPEEDS[state.speedIndex];

function setProgress(p, { fromUser = false } = {}) {
  state.progress = Math.min(1, Math.max(0, p));
  scene.setProgress(state.progress);

  const idx = geo.stopIndexAt(state.route, state.progress);
  const changed = idx !== state.stopIndex;
  state.stopIndex = idx;

  if (state.progress >= 1 && !state.ended) {
    state.ended = true;
    state.playing = false;
    ui.setPlaying(false);
    ui.renderConclusion(state.voyage, state.route);
    scene.setFollow(false);
    ui.setFollow(false);
    scene.fitRoute(state.route, { duration: reducedMotion ? 0 : 2200, ...panelInset() });
  } else if (state.progress < 1 && state.ended) {
    state.ended = false;
    if (state.started) renderCurrentStop();
  } else if (state.started && !state.ended && (changed || fromUser)) {
    renderCurrentStop();
  }

  if (changed) writeUrl();
  updateReadout();
}

function renderCurrentStop() {
  const route = state.route;
  const stop = route.stops[state.stopIndex];
  const sample = geo.sampleRoute(route, state.progress);
  ui.renderStop(state.voyage, stop, {
    km: sample.km,
    dateLabel: formatDay(geo.dayAt(route, state.progress)),
    nextStop: route.stops[state.stopIndex + 1] || null,
    sailing: sample.moving
  });
}

function updateReadout() {
  const route = state.route;
  if (!route) return;
  const sample = geo.sampleRoute(route, state.progress);
  const stop = route.stops[state.stopIndex];
  const next = route.stops[state.stopIndex + 1];
  const legLabel = sample.moving && next
    ? `${stop.name} → ${next.name}`
    : `${stop.name} · in port`;
  ui.updateTimeline({
    progress: state.progress,
    dateLabel: formatDay(geo.dayAt(route, state.progress)),
    legLabel,
    km: sample.km,
    currentIndex: state.stopIndex
  });
}

function setPlaying(v) {
  if (v && state.progress >= 1) {
    state.ended = false;
    setProgress(0);
  }
  state.playing = v;
  ui.setPlaying(v);
  if (v && !state.started) beginVoyage();
}

function beginVoyage() {
  state.started = true;
  ui.hideOriginCard();
  ui.showIntro(false);
  scene.setFollow(true);
  ui.setFollow(true);
  scene.flyTo({
    lat: state.route.stops[0].lat,
    lon: state.route.stops[0].mapLon,
    deg: FOLLOW,
    duration: reducedMotion ? 0 : 1500
  });
  renderCurrentStop();
  writeUrl();
}

function goToStop(i, { instant = false } = {}) {
  const stop = state.route.stops[i];
  state.playing = false;
  ui.setPlaying(false);
  setProgress(stop.tp, { fromUser: true });
  scene.flyTo({
    lat: stop.lat, lon: stop.mapLon, deg: CLOSE,
    duration: instant || reducedMotion ? 0 : 1500
  });
}

/* ---------------------------------------------------------------- selection */

function selectVoyage(id, { step = null } = {}) {
  const voyage = VOYAGES.find((v) => v.id === id);
  if (!voyage) return;

  state.voyage = voyage;
  state.route = geo.buildRoute(voyage);
  state.progress = 0;
  state.playing = false;
  state.started = false;
  state.ended = false;
  state.stopIndex = 0;

  routeFade = 0;
  scene.setRoute(state.route);
  scene.setRouteOpacity(0);
  scene.setFollow(false);

  ui.renderVoyageList(id);
  ui.setNowPlaying(voyage);
  ui.buildTimeline(state.route);
  ui.buildPins(state.route);
  ui.renderOverview(voyage, state.route);
  ui.setPlaying(false);
  ui.setFollow(false);
  ui.showIntro(false);
  ui.showOriginCard(voyage, state.route.stops[0]);

  if (step != null && step > 0 && step < state.route.stops.length) {
    state.started = true;
    ui.hideOriginCard();
    goToStop(step, { instant: true });
  } else {
    setProgress(0);
    scene.fitRoute(state.route, { duration: reducedMotion ? 0 : 2000, ...panelInset() });
  }

  writeUrl();
}

/**
 * Swaps the projection. The voyage, the position along it and the follow state
 * carry across, so switching reads as the same journey seen another way rather
 * than a reload.
 */
function setViewKind(kind, { initial = false } = {}) {
  if (!initial && kind === viewKind) return;
  viewKind = kind;

  const following = scene ? scene.follow : true;
  if (scene) scene.dispose();

  const Ctor = kind === 'globe' ? sceneMods.globe.Globe : sceneMods.scene.Scene;
  scene = new Ctor(document.getElementById('stage'), { reducedMotion });
  scene.onUserInteract = () => ui.setFollow(false);
  window.__scene = scene;

  if (state.route) {
    scene.setRoute(state.route);
    scene.setProgress(state.progress);
    // the route is already on screen: bring it back at full strength, not faded in
    routeFade = 1;
    scene.setRouteOpacity(1);
    scene.setFollow(following);
    const stop = state.route.stops[Math.max(0, state.stopIndex)];
    if (following && state.started) {
      scene.flyTo({ lat: stop.lat, lon: stop.mapLon, deg: FOLLOW, duration: 0 });
    } else {
      scene.fitRoute(state.route, { duration: 0, ...panelInset() });
    }
  }

  ui.setViewKind(kind);
  writeUrl();
}

/* ------------------------------------------------------------------- boot */

async function boot() {
  ui = new UI({
    voyages: VOYAGES,
    method: METHOD,
    handlers: {
      onSelect: (id) => selectVoyage(id),
      onStart: () => setPlaying(true),
      onReplay: () => { state.ended = false; setProgress(0); setPlaying(true); },
      onPlayToggle: () => { if (state.route) setPlaying(!state.playing); },
      onSeek: (p) => {
        if (!state.route) return;
        if (!state.started) { state.started = true; ui.hideOriginCard(); }
        setProgress(p, { fromUser: true });
      },
      onStep: (dir) => {
        if (!state.route) return;
        if (!state.started) { state.started = true; ui.hideOriginCard(); }
        const stops = state.route.stops;
        let i = state.stopIndex + (dir > 0 ? 1 : -1);
        if (dir < 0 && state.progress > stops[state.stopIndex].tp + 0.004) i = state.stopIndex;
        goToStop(Math.max(0, Math.min(stops.length - 1, i)));
      },
      onJumpStop: (i) => {
        if (!state.route) return;
        if (!state.started) { state.started = true; ui.hideOriginCard(); }
        goToStop(i);
      },
      onSpeedCycle: () => {
        state.speedIndex = (state.speedIndex + 1) % SPEEDS.length;
        ui.setSpeed(speed());
      },
      onFollowToggle: () => {
        const on = !scene.follow;
        scene.setFollow(on);
        ui.setFollow(on);
        if (on && state.route) {
          scene.flyTo({
            lat: state.route.stops[state.stopIndex].lat,
            lon: state.route.stops[state.stopIndex].mapLon,
            deg: FOLLOW, duration: reducedMotion ? 0 : 1200
          });
        }
      },
      onViewToggle: () => setViewKind(viewKind === 'globe' ? 'map' : 'globe'),
      onShare: async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          ui.toast('Link copied to clipboard');
        } catch {
          ui.toast(location.href);
        }
      }
    }
  });

  ui.setSpeed(speed());

  let flat, globe;
  try {
    [flat, globe, geo] = await Promise.all([
      import('./scene.js'), import('./globe.js'), import('./geo.js')
    ]);
  } catch (err) {
    console.error(err);
    ui.loaderError('The map could not be drawn. Please reload the page.');
    return;
  }
  sceneMods = { scene: flat, globe };

  // when the panel comes or goes, the map reclaims the freed space
  ui.onPanelToggle = () => {
    if (!state.route || state.playing || scene.follow) return;
    scene.fitRoute(state.route, { duration: reducedMotion ? 0 : 900, ...panelInset() });
  };
  ui.hideLoader();

  const { id, step, view } = readUrl();
  setViewKind(view || 'map', { initial: true });
  if (id) selectVoyage(id, { step });
  else ui.showIntro(true);

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    if (state.playing && state.route) {
      const duration = (state.voyage.playbackSeconds || 80) / speed();
      setProgress(state.progress + dt / duration);
    }

    if (state.route) {
      routeFade = Math.min(1, routeFade + dt * 1.4);
      scene.setRouteOpacity(routeFade);
      ui.updatePins(scene, state.stopIndex);
    } else {
      routeFade = 0;
    }

    scene.update();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
