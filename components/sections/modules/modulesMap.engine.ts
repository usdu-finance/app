import { clamp, lerp, rgba } from '@/components/pages/godeye/godeye.format';

/**
 * Compact canvas engine of the modules map. Same look and interaction as the GodEye engine
 * (soft sprite nodes, curved faint links, exponential camera tween, cursor anchored wheel zoom,
 * pointer drag / pinch) but without its token-flow, 3D and kind specific code, so it stays small.
 */
export type MapStatus = 'pending' | 'active' | 'revoked' | 'expired' | 'unknown';

export type MapNodeInput = {
	id: string;
	/** hub indexes this node is registered on; a hub holds its own index, a shared module several */
	hubs: number[];
	isHub: boolean;
	label: string;
	color: string;
	/** category sector (index into CATEGORIES) */
	cat: number;
	/** worst-to-best aggregate: pending if any is pending, faded only if all registrations are inactive */
	status: MapStatus;
	/** pulse halo regardless of status (open proposal on an active module) */
	pulse?: boolean;
	/** hubs only: compact second label line, drawn when zoomed in */
	sub?: string;
};

const CATEGORIES = ['curve', 'vault', 'bridge', 'streamer', 'other'];

export type MapEvents = {
	onSelect: (id: string | null) => void;
	onHover: (info: { id: string; x: number; y: number } | null) => void;
};

type SNode = MapNodeInput & {
	hub: number;
	/** displayed position, eased towards x / y so layout changes glide */
	px: number;
	py: number; x: number; y: number; vx: number; vy: number; r: number; sx: number; sy: number; sr: number };

const MAX_ZOOM = 5;
const MIN_ZOOM = 0.15;

function rng(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export class ModulesMapEngine {
	private ctx: CanvasRenderingContext2D;
	private W = 1;
	private H = 1;
	private DPR = 1;
	private raf = 0;
	private last = 0;
	private time = 0;
	private ro: ResizeObserver;
	private nodes: SNode[] = [];
	private byId = new Map<string, SNode>();
	private hubs: SNode[] = [];
	private sig = '';
	private selected: string | null = null;
	private hover: string | null = null;
	private cam = { x: 0, y: 0, zoom: 0.8 };
	private tween: { z: number; x: number; y: number } | null = null;
	private touched = false;
	private sprites = new Map<string, HTMLCanvasElement>();
	private stars = Array.from({ length: 70 }, (_, i) => ({ x: ((i * 97) % 100) / 100, y: ((i * 53) % 100) / 100, z: ((i * 31) % 10) / 10 }));
	private font = 'sans-serif';
	private pts = new Map<number, [number, number]>();
	private ptr = { down: false, x: 0, y: 0, moved: 0, pinch: 0 };
	private tap = { id: '', t: 0 };

	constructor(private canvas: HTMLCanvasElement, private events: MapEvents) {
		this.ctx = canvas.getContext('2d')!;
		this.font = getComputedStyle(canvas).fontFamily || 'sans-serif';
		this.resize();
		this.ro = new ResizeObserver(() => {
			this.resize();
			if (!this.touched) this.fit(false);
		});
		this.ro.observe(canvas.parentElement ?? canvas);
		const c = canvas;
		c.style.touchAction = 'none';
		c.style.cursor = 'grab';
		c.addEventListener('pointerdown', this.onDown);
		c.addEventListener('pointermove', this.onMove);
		c.addEventListener('pointerup', this.onUp);
		c.addEventListener('pointercancel', this.onUp);
		c.addEventListener('pointerleave', this.onLeave);
		c.addEventListener('wheel', this.onWheel, { passive: false });
		this.raf = requestAnimationFrame(this.frame);
	}

	destroy() {
		cancelAnimationFrame(this.raf);
		this.ro.disconnect();
		const c = this.canvas;
		c.removeEventListener('pointerdown', this.onDown);
		c.removeEventListener('pointermove', this.onMove);
		c.removeEventListener('pointerup', this.onUp);
		c.removeEventListener('pointercancel', this.onUp);
		c.removeEventListener('pointerleave', this.onLeave);
		c.removeEventListener('wheel', this.onWheel);
	}

	setSelected(id: string | null) {
		this.selected = id;
	}

	has(id: string) {
		return this.byId.has(id);
	}

	/**
	 * Applies the node set. Unchanged topology only refreshes attributes; otherwise the layout is relaxed again
	 * from the previous positions and the nodes glide there (camera refits unless the user has moved it).
	 */
	setData(input: MapNodeInput[]) {
		const sig = input.map((n) => `${n.id}|${n.hubs.join(',')}`).join(';');
		if (sig === this.sig) {
			for (const i of input) Object.assign(this.byId.get(i.id)!, i);
			return;
		}
		const first = this.nodes.length === 0;
		this.sig = sig;
		const old = this.byId;
		const rand = rng(7);
		const nodes: SNode[] = [];
		const hubInputs = input.filter((n) => n.isHub);
		hubInputs.forEach((h) => {
			const hub = h.hubs[0];
			const prev = old.get(h.id);
			const a = (hub / Math.max(hubInputs.length, 1)) * Math.PI * 2 - Math.PI / 2;
			const x = prev?.x ?? Math.cos(a) * 300,
				y = prev?.y ?? Math.sin(a) * 170;
			nodes.push({ ...h, hub, x, y, px: prev?.px ?? x, py: prev?.py ?? y, vx: 0, vy: 0, r: 26, sx: 0, sy: 0, sr: 0 });
		});
		const hubs = nodes.slice();
		const hubOf = (i: number) => hubs.find((x) => x.hub === i)!;
		input
			.filter((n) => !n.isHub)
			.forEach((n) => {
				const hs = n.hubs.map(hubOf);
				const prev = old.get(n.id);
				const cx = hs.reduce((t, h) => t + h.x, 0) / hs.length;
				const cy = hs.reduce((t, h) => t + h.y, 0) / hs.length;
				const a = this.sectorAngle(n.cat) + (rand() - 0.5) * 0.5;
				const d = hs.length > 1 ? 20 * rand() : 70 + rand() * 40;
				const x = prev?.x ?? cx + Math.cos(a) * d,
					y = prev?.y ?? cy + Math.sin(a) * d;
				nodes.push({
					...n,
					hub: n.hubs[0],
					x,
					y,
					px: prev?.px ?? cx,
					py: prev?.py ?? cy,
					vx: 0,
					vy: 0,
					r: hs.length > 1 ? 11 : 9,
					sx: 0,
					sy: 0,
					sr: 0,
				});
			});
		this.nodes = nodes;
		this.hubs = hubs;
		this.byId = new Map(nodes.map((n) => [n.id, n]));
		const steps = first ? 480 : 360;
		for (let i = 0; i < steps; i++) this.relax((1 - i / steps) * (first ? 1 : 0.6));
		if (first) {
			for (const n of nodes) {
				n.px = n.x;
				n.py = n.y;
			}
		}
		if (!this.touched) this.fit(!first);
	}

	private sectorAngle(cat: number) {
		return (cat / CATEGORIES.length) * Math.PI * 2 - Math.PI / 2;
	}

	private hubOf(i: number) {
		return this.hubs.find((x) => x.hub === i)!;
	}

	private relax(heat: number) {
		const ns = this.nodes;
		for (let i = 0; i < ns.length; i++) {
			const a = ns[i];
			for (let j = i + 1; j < ns.length; j++) {
				const b = ns[j];
				let dx = b.x - a.x,
					dy = b.y - a.y;
				const d2 = dx * dx + dy * dy || 0.01;
				const d = Math.sqrt(d2);
				const hubPair = a.isHub && b.isHub;
				// repulsion, plus a hard-ish collision radius so labels have room
				let f = (hubPair ? 40000 : a.isHub || b.isHub ? 5200 : 2600) / d2;
				const min = a.r + b.r + (hubPair ? 60 : 30);
				if (d < min) f += (min - d) * 0.12;
				dx /= d;
				dy /= d;
				a.vx -= dx * f;
				a.vy -= dy * f;
				b.vx += dx * f;
				b.vy += dy * f;
			}
		}
		const size = new Map<number, number>();
		ns.forEach((n) => !n.isHub && n.hubs.length === 1 && size.set(n.hub, (size.get(n.hub) ?? 0) + 1));
		for (const n of ns) {
			if (n.isHub) {
				n.vx -= n.x * 0.01;
				n.vy -= n.y * 0.02;
				continue;
			}
			if (n.hubs.length > 1) {
				// shared module: pulled to the middle of all its hubs, linked to each
				const hs = n.hubs.map((i) => this.hubOf(i));
				const mx = hs.reduce((t, h) => t + h.x, 0) / hs.length;
				const my = hs.reduce((t, h) => t + h.y, 0) / hs.length;
				n.vx += (mx - n.x) * 0.03;
				n.vy += (my - n.y) * 0.03;
				continue;
			}
			// category sector: a target point on the module's sector ray, plus a loose radial spring
			const h = this.hubOf(n.hub);
			const rest = 80 + Math.sqrt(size.get(n.hub) ?? 1) * 18;
			const a = this.sectorAngle(n.cat);
			const tx = h.x + Math.cos(a) * rest,
				ty = h.y + Math.sin(a) * rest;
			n.vx += (tx - n.x) * 0.035;
			n.vy += (ty - n.y) * 0.035;
			const dx = h.x - n.x,
				dy = h.y - n.y,
				d = Math.hypot(dx, dy) || 1;
			const k = (d - rest) * 0.01;
			n.vx += (dx / d) * k;
			n.vy += (dy / d) * k;
			h.vx -= (dx / d) * k * 0.15;
			h.vy -= (dy / d) * k * 0.15;
		}
		for (const n of ns) {
			n.vx *= 0.82;
			n.vy *= 0.82;
			n.x += clamp(n.vx, -20, 20) * (0.3 + 0.7 * heat);
			n.y += clamp(n.vy, -20, 20) * (0.3 + 0.7 * heat);
		}
	}

	// ---------------------------------------------------------------- camera
	fit(animate = true) {
		if (!this.nodes.length) return;
		let x0 = Infinity,
			x1 = -Infinity,
			y0 = Infinity,
			y1 = -Infinity;
		for (const n of this.nodes) {
			x0 = Math.min(x0, n.x - n.r - 30);
			x1 = Math.max(x1, n.x + n.r + 30);
			y0 = Math.min(y0, n.y - n.r - 30);
			y1 = Math.max(y1, n.y + n.r + 90);
		}
		const z = clamp(Math.min(this.W / (x1 - x0), this.H / (y1 - y0)) * 0.94, MIN_ZOOM, 1.6);
		const t = { z, x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
		if (animate) this.tween = t;
		else {
			this.cam = { x: t.x, y: t.y, zoom: t.z };
			this.tween = null;
		}
	}

	flyTo(id: string) {
		const n = this.byId.get(id);
		if (!n) return;
		this.touched = true;
		this.tween = { z: Math.max(this.cam.zoom, 1.5), x: n.x, y: n.y };
	}

	zoomBy(f: number) {
		this.touched = true;
		this.tween = { z: clamp((this.tween?.z ?? this.cam.zoom) * f, MIN_ZOOM, MAX_ZOOM), x: this.tween?.x ?? this.cam.x, y: this.tween?.y ?? this.cam.y };
	}

	private resize() {
		this.DPR = Math.min(window.devicePixelRatio || 1, 2);
		const r = (this.canvas.parentElement ?? this.canvas).getBoundingClientRect();
		this.W = Math.max(r.width, 1);
		this.H = Math.max(r.height, 1);
		this.canvas.width = this.W * this.DPR;
		this.canvas.height = this.H * this.DPR;
		this.canvas.style.width = this.W + 'px';
		this.canvas.style.height = this.H + 'px';
	}

	private project(n: SNode) {
		const c = this.cam;
		n.sx = (n.px - c.x) * c.zoom + this.W / 2;
		n.sy = (n.py - c.y) * c.zoom + this.H / 2;
		n.sr = n.r * clamp(c.zoom, 0.6, 2.2);
	}

	// ---------------------------------------------------------------- render
	private sprite(color: string) {
		let c = this.sprites.get(color);
		if (c) return c;
		c = document.createElement('canvas');
		const s = 128;
		c.width = c.height = s;
		const g = c.getContext('2d')!;
		const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
		grd.addColorStop(0, rgba(color, 0.9));
		grd.addColorStop(0.18, rgba(color, 0.55));
		grd.addColorStop(0.4, rgba(color, 0.16));
		grd.addColorStop(1, rgba(color, 0));
		g.fillStyle = grd;
		g.fillRect(0, 0, s, s);
		this.sprites.set(color, c);
		return c;
	}

	private frame = (now: number) => {
		const dt = Math.min((now - this.last) / 1000, 0.05);
		this.last = now;
		this.time += dt;
		if (this.tween) {
			const c = this.cam,
				t = this.tween,
				k = 1 - Math.pow(0.01, dt);
			c.zoom = lerp(c.zoom, t.z, k);
			c.x = lerp(c.x, t.x, k);
			c.y = lerp(c.y, t.y, k);
			if (Math.abs(c.zoom - t.z) < t.z * 0.003 && Math.abs(c.x - t.x) < 0.5 && Math.abs(c.y - t.y) < 0.5) this.tween = null;
		}
		const ke = 1 - Math.pow(0.004, dt);
		for (const n of this.nodes) {
			n.px = lerp(n.px, n.x, ke);
			n.py = lerp(n.py, n.y, ke);
		}
		this.render();
		this.raf = requestAnimationFrame(this.frame);
	};

	private render() {
		const { ctx, W, H, DPR, cam } = this;
		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		const bg = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
		bg.addColorStop(0, '#fbfaf8');
		bg.addColorStop(0.6, '#f2f0ec');
		bg.addColorStop(1, '#e8e6e4');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = '#6b7280';
		for (const s of this.stars) {
			ctx.globalAlpha = (0.12 + 0.25 * s.z) * (0.6 + 0.4 * Math.sin(this.time * 0.8 + s.x * 20));
			ctx.fillRect(s.x * W, s.y * H, 0.6 + s.z * 1.2, 0.6 + s.z * 1.2);
		}
		ctx.globalAlpha = 1;
		if (!this.nodes.length) return;
		for (const n of this.nodes) this.project(n);

		const focusId = this.hover || this.selected;
		const focus = focusId ? this.byId.get(focusId) : undefined;
		const inactive = (n: SNode) => n.status === 'expired' || n.status === 'revoked' || n.status === 'unknown';
		const related = (n: SNode) =>
			!focus ||
			n === focus ||
			(focus.isHub && !n.isHub && n.hubs.includes(focus.hub)) ||
			(n.isHub && !focus.isHub && focus.hubs.includes(n.hub));

		// curved hub -> module links, plus faint hub <-> hub links
		ctx.lineCap = 'round';
		const curve = (a: SNode, b: SNode, curv: number) => {
			const dx = b.sx - a.sx,
				dy = b.sy - a.sy,
				len = Math.hypot(dx, dy) || 1,
				sgn = a.id < b.id ? 1 : -1;
			return { cx: (a.sx + b.sx) / 2 + (-dy / len) * len * curv * sgn, cy: (a.sy + b.sy) / 2 + (dx / len) * len * curv * sgn };
		};
		const draw = (a: SNode, b: SNode, alpha: number, lw: number, curv: number, dash: boolean) => {
			const c = curve(a, b, curv);
			ctx.strokeStyle = rgba(b.isHub ? '#0c0c0c' : b.color, alpha);
			ctx.lineWidth = lw;
			ctx.setLineDash(dash ? [4, 5] : []);
			ctx.beginPath();
			ctx.moveTo(a.sx, a.sy);
			ctx.quadraticCurveTo(c.cx, c.cy, b.sx, b.sy);
			ctx.stroke();
		};
		for (let i = 0; i < this.hubs.length; i++)
			for (let j = i + 1; j < this.hubs.length; j++) draw(this.hubs[i], this.hubs[j], focus ? 0.04 : 0.07, 1, 0.1, false);
		for (const n of this.nodes) {
			if (n.isHub) continue;
			for (const hi of n.hubs) {
				const h = this.hubOf(hi);
				const hl = !!focus && (focus === n || focus === h);
				const alpha = focus ? (hl ? 0.6 : 0.05) : inactive(n) ? 0.14 : n.hubs.length > 1 ? 0.38 : 0.3;
				draw(h, n, alpha, (hl ? 1.8 : 1.1) * clamp(cam.zoom * 1.4, 0.7, 2), 0.16, inactive(n));
			}
		}
		ctx.setLineDash([]);

		// nodes: hubs last so they sit on top
		const order = [...this.nodes].sort((p, q) => Number(p.isHub) - Number(q.isHub));
		for (const n of order) {
			const R = n.sr;
			if (n.sx < -R * 6 || n.sx > W + R * 6 || n.sy < -R * 6 || n.sy > H + R * 6) continue;
			const dim = !related(n);
			const off = inactive(n);
			const al = dim ? 0.2 : off ? 0.5 : 1;
			if (n.status === 'pending' || n.pulse) {
				const p = (this.time % 2) / 2;
				ctx.globalAlpha = al * 0.5 * (1 - p);
				ctx.fillStyle = rgba(n.color, 0.5);
				ctx.beginPath();
				ctx.arc(n.sx, n.sy, R * (1.1 + 2.4 * p), 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = al * (off ? 0.25 : 0.4);
			const gs = R * (n.isHub ? 4.5 : 4);
			ctx.drawImage(this.sprite(n.color), n.sx - gs, n.sy - gs, gs * 2, gs * 2);
			ctx.globalAlpha = al;
			ctx.beginPath();
			ctx.arc(n.sx, n.sy, R, 0, Math.PI * 2);
			if (off) {
				ctx.fillStyle = rgba(n.color, 0.12);
				ctx.fill();
				ctx.setLineDash([4, 4]);
				ctx.strokeStyle = rgba(n.color, 0.8);
				ctx.lineWidth = 1.2;
				ctx.stroke();
				ctx.setLineDash([]);
			} else {
				const body = ctx.createRadialGradient(n.sx - R * 0.35, n.sy - R * 0.35, R * 0.1, n.sx, n.sy, R);
				body.addColorStop(0, rgba(n.color, 0.55));
				body.addColorStop(0.3, n.color);
				body.addColorStop(1, n.color);
				ctx.fillStyle = body;
				ctx.fill();
			}
			if (n.isHub) {
				ctx.strokeStyle = rgba(n.color, 0.5);
				ctx.lineWidth = 1.4;
				ctx.beginPath();
				ctx.arc(n.sx, n.sy, R + 5 + 1.5 * Math.sin(this.time * 1.4), 0, Math.PI * 2);
				ctx.stroke();
			}
			if (n.id === this.selected || n.id === this.hover) {
				ctx.strokeStyle = 'rgba(12,12,12,0.85)';
				ctx.lineWidth = 1.6;
				ctx.beginPath();
				ctx.arc(n.sx, n.sy, R + 4, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
		}

		// labels: hubs, hover and selection first, then modules wherever they fit
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		const placed: [number, number, number][] = [];
		const prio = (n: SNode) => (n.id === this.hover || n.id === this.selected ? 3 : n.isHub ? 2 : 1);
		for (const n of [...this.nodes].sort((p, q) => prio(q) - prio(p))) {
			if (!related(n) && prio(n) < 3) continue;
			const fs = n.isHub ? 14 : clamp(9.5 + cam.zoom * 1.6, 10, 13);
			ctx.font = `${n.isHub ? 700 : 500} ${fs}px ${this.font}`;
			const txt = n.label;
			const w = ctx.measureText(txt).width;
			const x = n.sx,
				y = n.sy + n.sr + 6;
			if (x < -w || x > W + w || y < -20 || y > H + 20) continue;
			if (prio(n) < 3 && placed.some((p) => Math.abs(p[0] - x) < (p[2] + w) / 2 + 2 && Math.abs(p[1] - y) < fs + 3)) continue;
			placed.push([x, y, w]);
			ctx.globalAlpha = inactive(n) ? 0.6 : 1;
			ctx.lineWidth = 3.5;
			ctx.strokeStyle = 'rgba(242,240,236,.95)';
			ctx.strokeText(txt, x, y);
			ctx.fillStyle = '#0c0c0c';
			ctx.fillText(txt, x, y);
			if (n.isHub && n.sub && cam.zoom > 1.1) {
				ctx.font = `500 ${fs - 3}px ${this.font}`;
				ctx.lineWidth = 3;
				ctx.strokeStyle = 'rgba(242,240,236,.95)';
				ctx.strokeText(n.sub, x, y + fs + 2);
				ctx.fillStyle = '#6b7280';
				ctx.fillText(n.sub, x, y + fs + 2);
			}
			ctx.globalAlpha = 1;
		}
	}

	// ---------------------------------------------------------------- input
	private local(e: { clientX: number; clientY: number }) {
		const r = this.canvas.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	private nodeAt(mx: number, my: number, pad = 6) {
		let best: SNode | null = null;
		let bd = Infinity;
		for (const n of this.nodes) {
			const d = Math.hypot(n.sx - mx, n.sy - my);
			if (d <= n.sr + pad && d < bd) {
				best = n;
				bd = d;
			}
		}
		return best;
	}

	private onDown = (e: PointerEvent) => {
		this.canvas.setPointerCapture(e.pointerId);
		this.pts.set(e.pointerId, [e.clientX, e.clientY]);
		const p = this.ptr;
		p.down = true;
		p.x = e.clientX;
		p.y = e.clientY;
		p.moved = 0;
		if (this.pts.size === 2) {
			const [a, b] = [...this.pts.values()];
			p.pinch = Math.hypot(a[0] - b[0], a[1] - b[1]);
		}
		this.canvas.style.cursor = 'grabbing';
	};

	private onMove = (e: PointerEvent) => {
		const p = this.ptr,
			cam = this.cam;
		if (this.pts.has(e.pointerId)) this.pts.set(e.pointerId, [e.clientX, e.clientY]);
		if (this.pts.size === 2) {
			const [a, b] = [...this.pts.values()];
			const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
			if (p.pinch) cam.zoom = clamp(cam.zoom * (d / p.pinch), MIN_ZOOM, MAX_ZOOM);
			p.pinch = d;
			p.moved = 99;
			this.touched = true;
			this.tween = null;
			return;
		}
		const l = this.local(e);
		if (!p.down) {
			const n = this.nodeAt(l.x, l.y);
			this.hover = n ? n.id : null;
			this.canvas.style.cursor = n ? 'pointer' : 'grab';
			this.events.onHover(n ? { id: n.id, x: l.x, y: l.y } : null);
			return;
		}
		const dx = e.clientX - p.x,
			dy = e.clientY - p.y;
		p.x = e.clientX;
		p.y = e.clientY;
		p.moved += Math.abs(dx) + Math.abs(dy);
		if (p.moved >= 5) {
			this.touched = true;
			this.tween = null;
			cam.x -= dx / cam.zoom;
			cam.y -= dy / cam.zoom;
			this.hover = null;
			this.events.onHover(null);
		}
	};

	private onUp = (e: PointerEvent) => {
		const p = this.ptr;
		this.pts.delete(e.pointerId);
		p.pinch = 0;
		this.canvas.style.cursor = 'grab';
		if (e.type === 'pointerup' && p.moved < 5 && this.pts.size === 0) {
			const l = this.local(e);
			const n = this.nodeAt(l.x, l.y, e.pointerType === 'touch' ? 14 : 6);
			const now = performance.now();
			if (n && this.tap.id === n.id && now - this.tap.t < 350) {
				this.flyTo(n.id);
				this.tap = { id: '', t: 0 };
			} else {
				this.tap = { id: n?.id ?? '', t: now };
				this.events.onSelect(n && !n.isHub ? n.id : null);
			}
		}
		if (this.pts.size === 0) p.down = false;
	};

	private onLeave = () => {
		if (!this.ptr.down) {
			this.hover = null;
			this.events.onHover(null);
		}
	};

	private onWheel = (e: WheelEvent) => {
		e.preventDefault();
		this.touched = true;
		this.tween = null;
		const cam = this.cam;
		const nz = clamp(cam.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), MIN_ZOOM, MAX_ZOOM);
		const l = this.local(e);
		const wx = cam.x + (l.x - this.W / 2) / cam.zoom,
			wy = cam.y + (l.y - this.H / 2) / cam.zoom;
		cam.zoom = nz;
		cam.x = wx - (l.x - this.W / 2) / nz;
		cam.y = wy - (l.y - this.H / 2) / nz;
	};
}
