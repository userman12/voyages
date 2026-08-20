import { formatDay, formatKm, formatDurationDays } from './format.js';
import { worldPath, routePath, routeEnds } from './minimap.js';

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

export class UI {
  constructor({ voyages, method, handlers }) {
    this.voyages = voyages;
    this.method = method;
    this.h = handlers;
    this.pins = [];
    this.marks = [];
    this.scrubbing = false;

    this.dom = {
      list: $('#voyage-list'),
      chooser: $('#chooser'),
      openChooser: $('#open-chooser'),
      nowPlaying: $('#now-playing'),
      panel: $('#context-panel'),
      panelToggle: $('#panel-toggle'),
      intro: $('#intro'),
      introCta: $('#intro-cta'),
      timeline: $('#timeline'),
      play: $('#btn-play'),
      prev: $('#btn-prev'),
      next: $('#btn-next'),
      speed: $('#btn-speed'),
      follow: $('#btn-follow'),
      share: $('#btn-share'),
      range: $('#tl-range'),
      fill: $('#track-fill'),
      marks: $('#track-marks'),
      date: $('#tl-date'),
      leg: $('#tl-leg'),
      dist: $('#tl-dist'),
      start: $('#tl-start'),
      end: $('#tl-end'),
      pins: $('#pins'),
      modal: $('#method'),
      methodBody: $('#method-body'),
      methodSources: $('#method-sources'),
      openMethod: $('#open-method'),
      toggleView: $('#toggle-view'),
      toggleViewLabel: $('#toggle-view-label'),
      loader: $('#loader'),
      toast: $('#toast')
    };

    this._wire();
    this._renderMethod();
    this.renderVoyageList(null);
  }

  /* --------------------------------------------------------------- events */

  _wire() {
    const { dom, h } = this;

    dom.play.addEventListener('click', () => h.onPlayToggle());
    dom.prev.addEventListener('click', () => h.onStep(-1));
    dom.next.addEventListener('click', () => h.onStep(1));
    dom.speed.addEventListener('click', () => h.onSpeedCycle());
    dom.follow.addEventListener('click', () => h.onFollowToggle());
    dom.share.addEventListener('click', () => h.onShare());

    dom.openChooser.addEventListener('click', () => this.openChooser());
    dom.introCta.addEventListener('click', () => this.openChooser());
    dom.chooser.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close')) this.closeChooser();
    });

    dom.range.addEventListener('input', () => {
      this.scrubbing = true;
      h.onSeek(Number(dom.range.value) / 1000);
    });
    const endScrub = () => { this.scrubbing = false; };
    dom.range.addEventListener('change', endScrub);
    dom.range.addEventListener('pointerup', endScrub);
    dom.range.addEventListener('blur', endScrub);

    dom.panelToggle.addEventListener('click', () => {
      const open = dom.panelToggle.getAttribute('aria-expanded') === 'true';
      this.setPanelOpen(!open, { manual: true });
    });

    // while hovering or reading, the panel will not retract under the cursor
    dom.panel.addEventListener('pointerenter', () => this._holdPanel(true));
    dom.panel.addEventListener('pointerleave', () => this._holdPanel(false));
    dom.panel.addEventListener('focusin', () => this._holdPanel(true));
    dom.panel.addEventListener('focusout', () => this._holdPanel(false));

    dom.toggleView.addEventListener('click', () => h.onViewToggle());
    dom.openMethod.addEventListener('click', () => this.openMethod());
    dom.modal.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close')) this.closeMethod();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!dom.modal.hidden) { this.closeMethod(); return; }
        if (!dom.chooser.hidden) { this.closeChooser(); return; }
      }
      if (!dom.chooser.hidden || !dom.modal.hidden) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if (typing) return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); h.onPlayToggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); h.onStep(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); h.onStep(-1); }
    });
  }

  /* -------------------------------------------------------------- chooser */

  renderVoyageList(activeId) {
    const list = this.dom.list;
    list.innerHTML = '';
    const world = worldPath();

    for (const v of this.voyages) {
      const ends = routeEnds(v);
      const li = el('li');
      const btn = el('button', 'voyage-card');
      btn.type = 'button';
      btn.style.setProperty('--accent-color', v.accent);
      btn.setAttribute('aria-current', String(v.id === activeId));
      btn.innerHTML = `
        <svg class="card__map" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path class="card__land" d="${world}"/>
          <path class="card__route" d="${routePath(v)}"/>
          <circle class="card__dot" cx="${ends.start[0]}" cy="${ends.start[1]}" r="4"/>
          <circle class="card__dot" cx="${ends.end[0]}" cy="${ends.end[1]}" r="4"/>
        </svg>
        <span class="card__years">${esc(v.yearsLabel)}</span>
        <span class="card__title">${esc(v.title)}</span>
        <span class="card__meta">${esc(v.commanders)}</span>
        <span class="card__facts">
          <span>${esc(v.fleet.ships)}</span>
          <span>${esc(v.waypoints.length)} stops</span>
        </span>`;
      btn.addEventListener('click', () => {
        this.closeChooser();
        this.h.onSelect(v.id);
      });
      li.appendChild(btn);
      list.appendChild(li);
    }
  }

  openChooser() {
    this.dom.chooser.hidden = false;
    this._lastFocus = document.activeElement;
    const current = this.dom.list.querySelector('[aria-current="true"]')
      || this.dom.list.querySelector('.voyage-card');
    if (current) current.focus();
  }

  closeChooser() {
    if (this.dom.chooser.hidden) return;
    this.dom.chooser.hidden = true;
    this.dom.openChooser.focus();
  }

  /** The button names the view it leads to, not the one already on screen. */
  setViewKind(kind) {
    const globe = kind === 'globe';
    this.dom.toggleView.setAttribute('aria-pressed', String(globe));
    this.dom.toggleViewLabel.textContent = globe ? 'Flat chart' : 'Globe';
  }

  setNowPlaying(voyage) {
    const n = this.dom.nowPlaying;
    if (!voyage) { n.hidden = true; return; }
    n.hidden = false;
    n.innerHTML = `<b>${esc(voyage.title)}</b>`;
  }

  showIntro(show) {
    this.dom.intro.classList.toggle('intro--hidden', !show);
  }

  hideLoader() {
    this.dom.loader.classList.add('loader--done');
    setTimeout(() => { this.dom.loader.hidden = true; }, 800);
  }

  loaderError(msg) {
    this.dom.loader.querySelector('.loader__ring').style.display = 'none';
    $('#loader-text').textContent = msg;
  }

  toast(msg) {
    const t = this.dom.toast;
    t.textContent = msg;
    t.classList.add('toast--on');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('toast--on'), 2600);
  }

  /* -------------------------------------------------------- right panel */

  /**
   * Show the panel. With `autoHide` it retracts on its own after a few seconds,
   * so the map stays clear between one stop and the next.
   */
  _panel(html, accent, { autoHide = false } = {}) {
    const p = this.dom.panel;
    p.hidden = false;
    this.dom.panelToggle.hidden = false;
    p.style.setProperty('--accent-color', accent || 'var(--border)');
    p.innerHTML = `<div class="ctx">${html}</div>`;
    p.scrollTop = 0;
    this.setPanelOpen(true);
    if (autoHide) this._scheduleHide();
    else this._clearHide();
    return p;
  }

  setPanelOpen(open, { manual = false } = {}) {
    this.dom.panel.classList.toggle('panel--closed', !open);
    this.dom.panelToggle.setAttribute('aria-expanded', String(open));
    if (open) this.dom.panelToggle.classList.remove('has-news');
    // an explicit action overrides the automatic retraction
    if (manual) { this._clearHide(); this._pinned = open; }
    if (this.onPanelToggle) this.onPanelToggle(open);
  }

  _scheduleHide(delay = 10000) {
    this._clearHide();
    if (this._pinned) return;
    this._hideTimer = setTimeout(() => {
      if (this._panelHeld) { this._scheduleHide(2500); return; }
      this.setPanelOpen(false);
      this.dom.panelToggle.classList.add('has-news');
    }, delay);
  }

  _clearHide() {
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
  }

  _holdPanel(v) {
    this._panelHeld = v;
    if (v) this._clearHide();
    else if (this._hideTimer !== null || this.dom.panel.classList.contains('panel--closed') === false) {
      this._scheduleHide(3000);
    }
  }

  renderOverview(voyage, route) {
    const html = `
      <p class="ctx__eyebrow">${esc(voyage.yearsLabel)}</p>
      <h2 class="ctx__title">${esc(voyage.title)}</h2>
      <p class="ctx__sub">${esc(voyage.commanders)}</p>
      <p class="ctx__body">${esc(voyage.context)}</p>
      <hr class="ctx__divider">
      <dl class="facts">
        <div><dt>Fleet</dt><dd>${esc(voyage.fleet.ships)}</dd></div>
        <div><dt>Crew</dt><dd>${esc(voyage.fleet.crew)}</dd></div>
        <div><dt>Stops</dt><dd>${route.stops.length}</dd></div>
        <div><dt>Duration</dt><dd>${esc(formatDurationDays(route.totalDays))}</dd></div>
        <div><dt>Estimated distance</dt><dd>${formatKm(route.totalKm)} km</dd></div>
        <div><dt>Backing</dt><dd>${esc(voyage.sponsor.name.split('—')[0].trim())}</dd></div>
      </dl>
      <h4>Stated objective</h4>
      <p>${esc(voyage.goals)}</p>
      <div class="btn-row">
        <button class="cta" type="button" data-action="start">Begin the voyage</button>
        <button class="btn btn--outline" type="button" data-action="method">Sources</button>
      </div>`;
    const p = this._panel(html, voyage.accent);
    p.querySelector('[data-action="start"]').addEventListener('click', () => this.h.onStart());
    p.querySelector('[data-action="method"]').addEventListener('click', () => this.openMethod(voyage.id));
  }

  renderStop(voyage, stop, { km, dateLabel, nextStop, sailing }) {
    const approx = stop.approx ? '<span class="tag">approximate date</span>' : '';
    const html = `
      <p class="ctx__eyebrow">${esc(voyage.yearsLabel)} · stop ${stop.index + 1} of ${voyage.waypoints.length}</p>
      <article class="stop-card">
        <p class="stop-card__date">${esc(formatDay(stop.arriveDay))}</p>
        <h3 class="stop-card__title">${esc(stop.title)}</h3>
        <p class="stop-card__text">${esc(stop.text)}</p>
        <p class="stop-card__place">${esc(stop.name)} — ${esc(stop.place)}</p>
      </article>
      ${approx}
      <div class="live-stats">
        <span><b>${esc(dateLabel)}</b>ship's date</span>
        <span><b>${formatKm(km)} km</b>covered</span>
        <span><b>${sailing ? 'Under way' : 'In port'}</b>status</span>
      </div>
      ${nextStop ? `
      <hr class="ctx__divider">
      <h4>Next stop</h4>
      <p>${esc(nextStop.name)} — <span style="color:var(--foreground)">${esc(formatDay(nextStop.arriveDay))}</span></p>` : ''}
    `;
    this._panel(html, voyage.accent, { autoHide: true });
  }

  renderConclusion(voyage, route) {
    const o = voyage.outcome;
    const li = (arr) => arr.map((s) => `<li>${esc(s)}</li>`).join('');
    const html = `
      <p class="ctx__eyebrow">What the voyage came to</p>
      <h2 class="ctx__title">${esc(voyage.title)}</h2>
      <p class="ctx__sub">${esc(voyage.yearsLabel)} · ${esc(voyage.commanders)}</p>
      <hr class="ctx__divider">
      <dl class="facts">
        <div><dt>Duration</dt><dd>${esc(formatDurationDays(route.totalDays))}</dd></div>
        <div><dt>Estimated distance</dt><dd>${formatKm(route.totalKm)} km</dd></div>
        <div><dt>Ships</dt><dd>${esc(voyage.fleet.ships)}</dd></div>
        <div><dt>Crew</dt><dd>${esc(voyage.fleet.crew)}</dd></div>
      </dl>
      <p class="ctx__body" style="font-size:12.4px;opacity:.8">${esc(voyage.fleet.crewNote)}</p>

      <h4>What was achieved</h4>
      <ul>${li(o.achieved)}</ul>

      <h4>What was exchanged</h4>
      <ul>${li(o.exchanged)}</ul>

      <h4>What was claimed</h4>
      <p>${esc(o.claimed)}</p>

      <h4>Cost of the voyage</h4>
      <p>${esc(o.cost)}</p>

      <h4>Backers and political power</h4>
      <p><strong>${esc(voyage.sponsor.name)}</strong><br>${esc(voyage.sponsor.note)}</p>

      <h4>Legacy</h4>
      <p>${esc(voyage.legacy)}</p>

      <h4>Human and historical consequences</h4>
      <p>${esc(voyage.humanImpact)}</p>

      <h4>Margins of uncertainty</h4>
      <p>${esc(voyage.uncertainty)}</p>

      <h4>Sources</h4>
      <ul class="sources">
        ${voyage.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join('')}
      </ul>

      <div class="btn-row">
        <button class="cta" type="button" data-action="replay">Replay the voyage</button>
        <button class="btn btn--outline" type="button" data-action="other">Another expedition</button>
      </div>`;
    const p = this._panel(html, voyage.accent);
    p.querySelector('[data-action="replay"]').addEventListener('click', () => this.h.onReplay());
    p.querySelector('[data-action="other"]').addEventListener('click', () => this.openChooser());
  }

  /* ------------------------------------------------------------- timeline */

  buildTimeline(route) {
    const { dom } = this;
    dom.timeline.hidden = false;
    dom.timeline.style.setProperty('--accent-color', route.voyage.accent);
    dom.start.textContent = formatDay(route.startDay, { short: true });
    dom.end.textContent = formatDay(route.endDay, { short: true });
    dom.marks.innerHTML = '';
    this._lastMarkIndex = -1;
    this.marks = route.stops.map((stop, i) => {
      const b = el('button', 'mark');
      b.type = 'button';
      b.style.left = `${stop.tp * 100}%`;
      b.title = `${stop.name} — ${formatDay(stop.arriveDay)}`;
      b.setAttribute('aria-label', `Go to stop ${i + 1}: ${stop.name}`);
      b.addEventListener('click', () => this.h.onJumpStop(i));
      dom.marks.appendChild(b);
      return b;
    });
  }

  updateTimeline({ progress, dateLabel, legLabel, km, currentIndex }) {
    const { dom } = this;
    if (!this.scrubbing) dom.range.value = String(Math.round(progress * 1000));
    dom.range.setAttribute('aria-valuetext', `${dateLabel} — ${legLabel}`);
    dom.fill.style.width = `${progress * 100}%`;
    dom.date.textContent = dateLabel;
    dom.leg.textContent = legLabel;
    dom.dist.textContent = `${formatKm(km)} km percorsi`;
    if (this._lastMarkIndex !== currentIndex) {
      for (let i = 0; i < this.marks.length; i++) {
        this.marks[i].dataset.reached = String(i <= currentIndex);
      }
      this._lastMarkIndex = currentIndex;
    }
  }

  setPlaying(playing) {
    const g = this.dom.play.querySelector('.ctrl__glyph');
    g.dataset.glyph = playing ? 'pause' : 'play';
    this.dom.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  setSpeed(v) {
    this.dom.speed.textContent = `${String(v).replace('.', ',')}×`;
  }

  setFollow(on) {
    this.dom.follow.setAttribute('aria-pressed', String(on));
    this.dom.follow.textContent = on ? 'Follow ship' : 'Free view';
  }

  /* ---------------------------------------------------------------- pins */

  buildPins(route) {
    this.dom.pins.innerHTML = '';
    this.pins = route.stops.map((stop, i) => {
      const wrap = el('div', 'pin');
      const label = el('button', 'pin__label', esc(stop.name));
      label.type = 'button';
      label.tabIndex = -1;
      label.addEventListener('click', () => this.h.onJumpStop(i));
      wrap.appendChild(label);
      this.dom.pins.appendChild(wrap);
      return { wrap, label, stop, index: i };
    });
    this.originCard = null;
  }

  showOriginCard(voyage, stop) {
    if (this.originCard) this.originCard.remove();
    // on narrow screens the context panel already carries the same data
    if (window.matchMedia('(max-width: 900px)').matches) { this.originCard = null; return; }
    
    const card = el('div', 'origin-card');
    card.innerHTML = `
      <p class="origin-card__eyebrow">Port of departure</p>
      <h3>${esc(stop.name)}</h3>
      <dl>
        <div><dt>Date</dt><dd>${esc(formatDay(stop.arriveDay))}</dd></div>
        <div><dt>Command</dt><dd>${esc(voyage.commanders)}</dd></div>
        <div><dt>Fleet</dt><dd>${esc(voyage.fleet.ships)} · ${esc(voyage.fleet.crew)}</dd></div>
        <div><dt>Backer</dt><dd>${esc(voyage.sponsor.name)}</dd></div>
      </dl>`;
    this.dom.pins.appendChild(card);
    this.originCard = card;
  }

  hideOriginCard() {
    if (this.originCard) { this.originCard.remove(); this.originCard = null; }
  }

  /** Panel rectangles, recomputed rarely: used to hide pins underneath. */
  _obstacles() {
    const now = performance.now();
    if (this._obsCache && now - this._obsAt < 400) return this._obsCache;
    const els = [
      this.dom.panel, this.dom.timeline, this.dom.intro,
      document.querySelector('.topbar')
    ];
    // note: offsetParent is always null for position:fixed, so measure the rect
    this._obsCache = els
      .filter((e) => e && !e.hidden &&
        !e.classList.contains('panel--closed') && !e.classList.contains('intro--hidden'))
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    this._obsAt = now;
    return this._obsCache;
  }

  updatePins(scene, currentIndex) {
    const placed = [];
    const out = {};
    const obstacles = this._obstacles();
    const covered = (x, y) => obstacles.some((r) =>
      x > r.left - 130 && x < r.right + 8 && y > r.top - 10 && y < r.bottom + 10);

    const rank = (i) => (i === currentIndex ? 3 : i === currentIndex + 1 ? 2 : i === 0 ? 1 : 0);
    // the most important labels claim their space first
    const order = [...this.pins].sort((a, b) => rank(b.index) - rank(a.index));

    for (const pin of order) {
      scene.project(pin.stop.lat, pin.stop.mapLon ?? pin.stop.lon, out);
      if (!out.visible || covered(out.x, out.y)) {
        pin.wrap.classList.add('pin--hidden');
        continue;
      }
      let clash = false;
      for (const p of placed) {
        if (Math.abs(p.x - out.x) < 132 && Math.abs(p.y - out.y) < 26) { clash = true; break; }
      }
      pin.wrap.classList.toggle('pin--hidden', clash);
      if (clash) continue;

      placed.push({ x: out.x, y: out.y });
      // kept inside the viewport: the label is wide and would overflow at the edges
      const half = pin.label.offsetWidth / 2 + 8;
      const x = Math.min(Math.max(out.x, half), window.innerWidth - half);
      pin.wrap.style.transform = `translate(${x}px, ${out.y}px) translate(-50%, -50%)`;
      pin.wrap.dataset.reached = String(pin.index <= currentIndex);
    }

    if (this.originCard) {
      const stop = this.pins[0]?.stop;
      if (stop) {
        scene.project(stop.lat, stop.mapLon ?? stop.lon, out);
        this.originCard.style.display = out.visible && !covered(out.x + 120, out.y) ? '' : 'none';
        this.originCard.style.transform =
          `translate(${out.x}px, ${out.y}px) translate(18px, -50%)`;
      }
    }
  }

  clearPins() {
    this.dom.pins.innerHTML = '';
    this.pins = [];
    this.originCard = null;
  }

  /* ----------------------------------------------------------------- modal */

  _renderMethod() {
    this.dom.methodBody.innerHTML = this.method.paragraphs.map((p) => `<p>${p}</p>`).join('');
    this.dom.methodSources.innerHTML = this.voyages.map((v) => `
      <h4 id="sources-${esc(v.id)}">${esc(v.title)} <span style="opacity:.6">(${esc(v.yearsLabel)})</span></h4>
      <ul class="sources">
        ${v.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join('')}
      </ul>`).join('');
  }

  openMethod(voyageId) {
    this.dom.modal.hidden = false;
    this._lastFocus = document.activeElement;
    this.dom.modal.querySelector('.sheet__close').focus();
    if (voyageId) {
      const target = this.dom.modal.querySelector(`#sources-${CSS.escape(voyageId)}`);
      if (target) target.scrollIntoView({ block: 'center' });
    }
  }

  closeMethod() {
    this.dom.modal.hidden = true;
    if (this._lastFocus) this._lastFocus.focus();
  }
}
