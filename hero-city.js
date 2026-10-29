// ---------------------------------------------------------------
// The Golden City — 3D hero centerpiece
// A small floating architectural sculpture: rounded towers, setback
// blocks and skybridges on a turned bronze platform, rotating once
// every 40 seconds. Built procedurally with Three.js r128 (loaded from
// CDN, no build step).
//
// Smoothness notes:
// - Every surface is generated with analytic vertex normals (rounded
//   boxes, filleted lathe profiles, tori), so curves shade without facets.
// - No hairline geometry: the thinnest element is several pixels wide.
// - MSAA is always on and the drawing buffer matches the CSS size × DPR.
// - Rotation is driven by the rAF timestamp, so speed is frame-rate
//   independent and nothing else in the scene moves.
// ---------------------------------------------------------------
(function () {
    'use strict';

    const container = document.getElementById('hero-3d-container');
    if (!container) return;

    const PALETTE = {
        gold: 0xD9A63A,
        antiqueGold: 0xB88624,
        bronze: 0x5C3F22,
        charcoal: 0x2B2520,
        plaza: 0x3A2A1A,
        window: 0xF0B45A
    };
    const TAU = Math.PI * 2;
    const FOV = 30;
    const FIT_RADIUS = 3.25;       // world-space radius that must stay in frame
    const CAMERA_PITCH = 0.3;      // radians above the horizon
    const CITY_LIFT = -0.66;       // centres the city's bounding box on the origin
    const SPIN_SPEED = TAU / 40;   // one revolution every 40 seconds
    const REST_ANGLE = -0.55;      // first pose, and the only pose under reduced motion
    const MAX_PIXEL_RATIO = 2;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const RADIAL_SEGMENTS = isMobile ? 64 : 96;
    const FILLET_STEPS = isMobile ? 5 : 8;

    function webglAvailable() {
        try {
            const c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
        } catch (e) {
            return false;
        }
    }

    // Static SVG rendition of the city for browsers without WebGL
    function showFallback() {
        container.classList.add('city-fallback');
        if (container.querySelector('.city-fallback-art')) return;
        const art = document.createElement('div');
        art.className = 'city-fallback-art';
        art.setAttribute('aria-hidden', 'true');
        art.innerHTML =
            '<svg viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg">' +
            '<defs>' +
            '<linearGradient id="cityFbGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E5B52E"/><stop offset="1" stop-color="#7A5418"/></linearGradient>' +
            '<linearGradient id="cityFbBronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6B4A28"/><stop offset="1" stop-color="#1F1A16"/></linearGradient>' +
            '</defs>' +
            '<path d="M42 252 Q200 400 358 252 Z" fill="url(#cityFbBronze)"/>' +
            '<ellipse cx="200" cy="252" rx="158" ry="34" fill="#2A2018" stroke="#B88624" stroke-width="3"/>' +
            '<rect x="78" y="186" width="30" height="70" rx="14" fill="url(#cityFbGold)"/>' +
            '<rect x="118" y="146" width="42" height="112" rx="10" fill="url(#cityFbBronze)"/>' +
            '<rect x="182" y="78" width="38" height="186" rx="16" fill="url(#cityFbBronze)"/>' +
            '<rect x="190" y="44" width="22" height="44" rx="11" fill="url(#cityFbGold)"/>' +
            '<rect x="238" y="122" width="46" height="138" rx="9" fill="#2B2520"/>' +
            '<rect x="234" y="116" width="54" height="10" rx="5" fill="url(#cityFbGold)"/>' +
            '<rect x="214" y="160" width="28" height="8" rx="4" fill="#B88624"/>' +
            '<rect x="294" y="196" width="42" height="62" rx="9" fill="url(#cityFbGold)"/>' +
            '<g fill="#F0B45A" opacity="0.8">' +
            '<rect x="196" y="120" width="5" height="8" rx="1.5"/><rect x="204" y="176" width="5" height="8" rx="1.5"/>' +
            '<rect x="250" y="150" width="5" height="8" rx="1.5"/><rect x="264" y="196" width="5" height="8" rx="1.5"/>' +
            '<rect x="132" y="186" width="5" height="8" rx="1.5"/>' +
            '</g></svg>';
        container.appendChild(art);
    }

    if (typeof THREE === 'undefined' || !webglAvailable()) {
        showFallback();
        return;
    }

    function init() {
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        } catch (err) {
            console.warn('Golden City: WebGL init failed, using fallback.', err);
            showFallback();
            return;
        }

        renderer.setClearColor(0x000000, 0);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        const canvas = renderer.domElement;
        canvas.classList.add('city-canvas');
        canvas.setAttribute('aria-hidden', 'true');
        container.appendChild(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

        // -----------------------------------------------------------
        // Geometry helpers (all produce indexed geometry with analytic
        // normals and a per-vertex colour used for contact shading)
        // -----------------------------------------------------------
        const col = (hex) => new THREE.Color(hex).convertSRGBToLinear();
        const smoothstep = (a, b, x) => {
            const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
            return t * t * (3 - 2 * t);
        };
        // Darkens surfaces near the plaza: a cheap, static ambient-occlusion stand-in
        const groundShade = (y) => 0.55 + 0.45 * smoothstep(0, 0.45, y);

        function makeGeometry(pos, nor, colr, idx) {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
            g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
            g.setIndex(idx);
            return g;
        }

        // Rounds each interior corner of a 2D polyline with a circular fillet.
        // Points are [x, y, radius?]; radius defaults to `radius`, 0 keeps the corner.
        function roundCorners(points, radius) {
            const out = [[points[0][0], points[0][1]]];
            const push = (x, y) => {
                const last = out[out.length - 1];
                if (Math.abs(last[0] - x) > 1e-5 || Math.abs(last[1] - y) > 1e-5) out.push([x, y]);
            };
            for (let i = 1; i < points.length - 1; i++) {
                const [bx, by] = points[i];
                const r = points[i][2] !== undefined ? points[i][2] : radius;
                const ax = points[i - 1][0] - bx, ay = points[i - 1][1] - by;
                const cx = points[i + 1][0] - bx, cy = points[i + 1][1] - by;
                const la = Math.hypot(ax, ay), lc = Math.hypot(cx, cy);
                const ux = ax / la, uy = ay / la, vx = cx / lc, vy = cy / lc;
                const theta = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)));
                if (r <= 0 || theta > Math.PI - 1e-3) {
                    push(bx, by);
                    continue;
                }
                const tanHalf = Math.tan(theta / 2);
                const d = Math.min(r / tanHalf, la * 0.5, lc * 0.5);
                const rr = d * tanHalf;
                const bl = Math.hypot(ux + vx, uy + vy);
                const h = rr / Math.sin(theta / 2);
                const ox = bx + ((ux + vx) / bl) * h, oy = by + ((uy + vy) / bl) * h;
                const a0 = Math.atan2(by + uy * d - oy, bx + ux * d - ox);
                let sweep = Math.atan2(by + vy * d - oy, bx + vx * d - ox) - a0;
                while (sweep > Math.PI) sweep -= TAU;
                while (sweep < -Math.PI) sweep += TAU;
                const steps = Math.max(2, Math.ceil(FILLET_STEPS * Math.abs(sweep) / (Math.PI / 2)));
                for (let s = 0; s <= steps; s++) {
                    const a = a0 + (sweep * s) / steps;
                    push(ox + Math.cos(a) * rr, oy + Math.sin(a) * rr);
                }
            }
            const end = points[points.length - 1];
            push(end[0], end[1]);
            return out;
        }

        // Outward 2D normals from central differences along a [r, y] profile
        function profileNormals(pts) {
            return pts.map((p, i) => {
                const a = pts[Math.max(0, i - 1)];
                const b = pts[Math.min(pts.length - 1, i + 1)];
                const tx = b[0] - a[0], ty = b[1] - a[1];
                const l = Math.hypot(tx, ty) || 1;
                return [ty / l, -tx / l];
            });
        }

        // Revolves a profile slice [from, to] around Y with exact normals
        function lathe(pts, normals, from, to, shade) {
            const P = to - from + 1;
            const pos = [], nor = [], colr = [], idx = [];
            for (let i = 0; i <= RADIAL_SEGMENTS; i++) {
                const phi = (i / RADIAL_SEGMENTS) * TAU;
                const s = Math.sin(phi), c = Math.cos(phi);
                for (let j = from; j <= to; j++) {
                    const [r, y] = pts[j], [nr, ny] = normals[j];
                    pos.push(r * s, y, r * c);
                    nor.push(nr * s, ny, nr * c);
                    const k = shade ? shade(y) : 1;
                    colr.push(k, k, k);
                }
            }
            for (let i = 0; i < RADIAL_SEGMENTS; i++) {
                for (let j = 0; j < P - 1; j++) {
                    const a = i * P + j, b = a + P, c = b + 1, d = a + 1;
                    idx.push(a, b, d, b, c, d);
                }
            }
            return makeGeometry(pos, nor, colr, idx);
        }

        // Filleted lathe split into material bands: parts = [[material, fromY], ...]
        function lathePieces(corners, fillet, parts, shade) {
            const pts = roundCorners(corners, fillet);
            const normals = profileNormals(pts);
            const starts = parts.map(([, fromY], k) => {
                if (k === 0) return 0;
                const j = pts.findIndex(p => p[1] >= fromY);
                return j < 0 ? pts.length - 1 : j;
            });
            return parts.map(([material], k) => {
                const to = k + 1 < parts.length ? starts[k + 1] : pts.length - 1;
                return [material, lathe(pts, normals, starts[k], to, shade)];
            });
        }

        // Box with truly rounded edges and corners: grid points on each face are
        // pushed onto a sphere of radius r around the inner box, so normals are exact.
        function roundedBox(w, h, d, r) {
            const half = [w / 2, h / 2, d / 2];
            r = Math.min(r, half[0], half[1], half[2]);
            const inner = half.map(v => v - r);
            // Each face carries half of every 90° edge arc
            const steps = Math.max(2, Math.ceil(FILLET_STEPS / 2));
            const coords = inner.map((e, axis) => {
                const band = [];
                for (let k = 0; k <= steps; k++) {
                    band.push(e + r * Math.tan((k / steps) * (Math.PI / 4)));
                }
                // Extra rows up the walls so contact shading has vertices to vary across
                const flat = axis === 1 ? Math.max(1, Math.ceil((2 * e) / 0.12)) : 1;
                const mid = [];
                for (let k = 1; k < flat; k++) mid.push(-e + (2 * e * k) / flat);
                const list = band.slice().reverse().map(v => -v).concat(mid, band);
                return list.filter((v, i) => i === 0 || v - list[i - 1] > 1e-6);
            });

            const pos = [], nor = [], colr = [], idx = [];
            const p = [0, 0, 0];
            for (let axis = 0; axis < 3; axis++) {
                for (const sign of [-1, 1]) {
                    const ua = (axis + 1) % 3, va = (axis + 2) % 3;
                    const cu = coords[ua], cv = coords[va];
                    const base = pos.length / 3;
                    for (let i = 0; i < cu.length; i++) {
                        for (let j = 0; j < cv.length; j++) {
                            p[axis] = sign * half[axis];
                            p[ua] = cu[i];
                            p[va] = cv[j];
                            const c = p.map((v, k) => Math.max(-inner[k], Math.min(inner[k], v)));
                            const n = p.map((v, k) => v - c[k]);
                            const len = Math.hypot(n[0], n[1], n[2]);
                            for (let k = 0; k < 3; k++) {
                                n[k] /= len;
                                pos.push(c[k] + n[k] * r);
                                nor.push(n[k]);
                                colr.push(1);
                            }
                        }
                    }
                    for (let i = 0; i < cu.length - 1; i++) {
                        for (let j = 0; j < cv.length - 1; j++) {
                            const a = base + i * cv.length + j, b = a + cv.length, c = b + 1, dd = a + 1;
                            if (sign > 0) idx.push(a, b, dd, b, c, dd);
                            else idx.push(a, dd, b, b, dd, c);
                        }
                    }
                }
            }
            return makeGeometry(pos, nor, colr, idx);
        }

        function withWhiteColor(geo) {
            const count = geo.attributes.position.count;
            geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
            geo.deleteAttribute('uv');
            return geo;
        }

        // Deterministic RNG so the lit windows are identical on every load
        let seed = 7;
        const rng = () => {
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };

        const tmpQuat = new THREE.Quaternion();
        const tmpScale = new THREE.Vector3(1, 1, 1);
        const UP = new THREE.Vector3(0, 1, 0);
        const placement = (x, y, z, rotY) => new THREE.Matrix4().compose(
            new THREE.Vector3(x, y, z),
            new THREE.Quaternion().setFromAxisAngle(UP, rotY || 0),
            tmpScale
        );

        // -----------------------------------------------------------
        // Environment: a smooth HDR gradient sphere with soft light lobes,
        // so metal reflections never show hard-edged softbox panels
        // -----------------------------------------------------------
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envScene = new THREE.Scene();
        const skyGeo = new THREE.SphereGeometry(20, 64, 32);
        const lobes = [
            [new THREE.Vector3(0.6, 0.6, 0.55).normalize(), [1.0, 0.8, 0.52], 2.6, 6],   // warm key
            [new THREE.Vector3(-0.7, 0.3, -0.65).normalize(), [1.0, 0.6, 0.25], 1.6, 5], // amber rim
            [new THREE.Vector3(0, 1, 0), [1.0, 0.88, 0.7], 0.7, 2]                       // soft top
        ];
        const skyColors = [];
        const dir = new THREE.Vector3();
        const skyPos = skyGeo.attributes.position;
        for (let i = 0; i < skyPos.count; i++) {
            dir.fromBufferAttribute(skyPos, i).normalize();
            const h = smoothstep(-0.3, 1, dir.y);
            const rgb = [0.012 + 0.09 * h, 0.009 + 0.06 * h, 0.006 + 0.035 * h];
            lobes.forEach(([ld, lc, strength, sharpness]) => {
                const f = strength * Math.pow(Math.max(0, dir.dot(ld)), sharpness);
                for (let k = 0; k < 3; k++) rgb[k] += lc[k] * f;
            });
            skyColors.push(rgb[0], rgb[1], rgb[2]);
        }
        skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
        const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
        envScene.add(new THREE.Mesh(skyGeo, skyMat));
        const envTarget = pmrem.fromScene(envScene, 0.02);
        skyGeo.dispose();
        skyMat.dispose();
        pmrem.dispose();
        scene.environment = envTarget.texture;

        // -----------------------------------------------------------
        // Materials: a few golds for accents, darker metals for mass
        // -----------------------------------------------------------
        const std = (hex, metalness, roughness, extra) => new THREE.MeshStandardMaterial(
            Object.assign({ color: col(hex), metalness, roughness, vertexColors: true }, extra || {})
        );
        const mat = {
            gold: std(PALETTE.gold, 1, 0.3),
            antique: std(PALETTE.antiqueGold, 1, 0.4),
            bronze: std(PALETTE.bronze, 0.9, 0.42),
            charcoal: std(PALETTE.charcoal, 0.6, 0.5)
        };

        // Geometry is merged per material: a handful of draw calls for the whole city
        const batches = new Map();
        function add(material, geo, matrix, shadeByHeight) {
            if (matrix) geo.applyMatrix4(matrix);
            if (shadeByHeight !== false) {
                const p = geo.attributes.position, c = geo.attributes.color;
                for (let i = 0; i < p.count; i++) {
                    const k = groundShade(p.getY(i));
                    c.setXYZ(i, k, k, k);
                }
            }
            if (!batches.has(material)) batches.set(material, []);
            batches.get(material).push(geo);
        }

        function mergeGeometries(list) {
            let vertices = 0, indices = 0;
            list.forEach(g => {
                vertices += g.attributes.position.count;
                indices += g.index.count;
            });
            const pos = new Float32Array(vertices * 3);
            const nor = new Float32Array(vertices * 3);
            const colr = new Float32Array(vertices * 3);
            const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
            let vo = 0, io = 0;
            list.forEach(g => {
                pos.set(g.attributes.position.array, vo * 3);
                nor.set(g.attributes.normal.array, vo * 3);
                colr.set(g.attributes.color.array, vo * 3);
                const src = g.index.array;
                for (let k = 0; k < src.length; k++) index[io + k] = src[k] + vo;
                vo += g.attributes.position.count;
                io += src.length;
                g.dispose();
            });
            const merged = new THREE.BufferGeometry();
            merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
            merged.setAttribute('color', new THREE.BufferAttribute(colr, 3));
            merged.setIndex(new THREE.BufferAttribute(index, 1));
            return merged;
        }

        // -----------------------------------------------------------
        // Scene graph: scene → city (spins about Y) → merged meshes
        // -----------------------------------------------------------
        const city = new THREE.Group();
        city.position.y = CITY_LIFT;
        city.rotation.y = REST_ANGLE;
        scene.add(city);

        // -----------------------------------------------------------
        // Floating platform: bronze bowl, antique-gold rim, paved plaza
        // -----------------------------------------------------------
        const PLAZA_R = 2.2;
        const platformCorners = [];
        for (let k = 0; k <= 24; k++) {
            const t = k / 24;
            platformCorners.push([2.3 * t, -0.19 - 1.15 * (1 - Math.pow(t, 1.5)), 0]);
        }
        platformCorners.push([2.42, -0.12, 0.08], [2.42, 0, 0.05], [PLAZA_R, 0, 0]);
        const underShade = (y) => 0.45 + 0.55 * smoothstep(-1.34, -0.15, y);
        lathePieces(platformCorners, 0, [[mat.bronze, -2]], underShade)
            .forEach(([m, g]) => add(m, g, null, false));

        const inlay = withWhiteColor(new THREE.TorusGeometry(2.02, 0.022, 16, isMobile ? 160 : 256));
        inlay.rotateX(Math.PI / 2);
        add(mat.gold, inlay, null, false);

        // -----------------------------------------------------------
        // Buildings (plaza top is y = 0)
        // -----------------------------------------------------------
        const footprints = [];
        const windows = [];
        const bridges = [
            // [x1, z1, x2, z2, y]
            [0.15, -0.1, 0.95, 0.45, 0.98],
            [-0.75, 0.55, -0.9, -0.55, 0.66],
            [-0.15, 1.15, 0.75, 1.05, 0.26]
        ];

        const WINDOW_DENSITY = 0.3;
        const FLOOR_STEP = 0.125;

        function nearBridge(m) {
            const x = m.elements[12], y = m.elements[13], z = m.elements[14];
            return bridges.some(([x1, z1, x2, z2, by]) => {
                if (Math.abs(y - by) > 0.075) return false;
                const dx = x2 - x1, dz = z2 - z1;
                const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz)));
                return Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t)) < 0.12;
            });
        }

        function addWindow(building, x, y, z, faceAngle) {
            if (rng() > WINDOW_DENSITY) return;
            tmpQuat.setFromAxisAngle(UP, faceAngle);
            const m = new THREE.Matrix4()
                .compose(new THREE.Vector3(x, y, z), tmpQuat, tmpScale)
                .premultiply(building);
            if (!nearBridge(m)) windows.push({ matrix: m, glow: 0.6 + 0.3 * rng() });
        }

        // Round towers: lathe corners [radius, height, fillet?]
        const towers = [
            {   // Central spire
                x: 0.15, z: -0.1, fillet: 0.05,
                corners: [[0.36, -0.02], [0.36, 0.9], [0.29, 0.9], [0.29, 1.75], [0.21, 1.75],
                    [0.21, 2.3], [0.16, 2.36], [0.16, 2.5], [0.09, 2.57], [0.09, 2.66], [0.035, 2.74], [0, 2.74]],
                parts: [[mat.bronze, -1], [mat.gold, 2.3]],
                bands: [[0.36, 0.45], [0.29, 1.32]],
                lit: [[0.36, 0.12, 0.8], [0.29, 1.06, 1.65], [0.21, 1.86, 2.2]]
            },
            {
                x: -0.75, z: 0.55, fillet: 0.05,
                corners: [[0.26, -0.02], [0.26, 1.5], [0.2, 1.62], [0.2, 1.75], [0, 1.75]],
                parts: [[mat.charcoal, -1], [mat.antique, 1.48]],
                bands: [[0.26, 1.0]],
                lit: [[0.26, 0.12, 1.4]]
            },
            {
                x: 1.25, z: -0.25, fillet: 0.04,
                corners: [[0.2, -0.02], [0.2, 0.75, 0.02]].concat(domeCorners(0.2, 0.75, 0.2)),
                parts: [[mat.antique, -1], [mat.gold, 0.76]],
                lit: []
            },
            {
                x: -1.45, z: 0, fillet: 0.04,
                corners: [[0.22, -0.02], [0.22, 0.82], [0.26, 0.87], [0.26, 0.94], [0.16, 1.0], [0, 1.0]],
                parts: [[mat.bronze, -1], [mat.gold, 0.8]],
                lit: [[0.22, 0.12, 0.72]]
            },
            {   // Domed pavilion
                x: -0.45, z: -1.35, fillet: 0.04,
                corners: [[0.32, -0.02], [0.32, 0.14], [0.27, 0.14, 0.02]].concat(domeCorners(0.27, 0.14, 0.24)),
                parts: [[mat.charcoal, -1], [mat.gold, 0.15]],
                lit: []
            },
            {
                x: -1.25, z: 0.95, fillet: 0.06,
                corners: [[0.17, -0.02], [0.17, 0.65], [0, 0.65]],
                parts: [[mat.antique, -1]],
                bands: [[0.17, 0.3]],
                lit: []
            }
        ];

        // Quarter-ellipse cap from (r, y) up to the axis; corners already smooth
        function domeCorners(r, y, height) {
            const pts = [];
            const n = FILLET_STEPS * 2;
            for (let k = 1; k <= n; k++) {
                const a = (k / n) * (Math.PI / 2);
                pts.push([r * Math.cos(a), y + height * Math.sin(a), 0]);
            }
            return pts;
        }

        towers.forEach(t => {
            const m = placement(t.x, 0, t.z);
            lathePieces(t.corners, t.fillet, t.parts).forEach(([material, g]) => add(material, g, m));
            (t.bands || []).forEach(([r, y]) => {
                const band = withWhiteColor(new THREE.TorusGeometry(r, 0.022, 14, RADIAL_SEGMENTS));
                band.rotateX(Math.PI / 2);
                band.translate(0, y, 0);
                add(mat.gold, band, m);
            });
            t.lit.forEach(([r, y0, y1]) => {
                const columns = Math.floor((TAU * r) / 0.12);
                for (let y = y0; y <= y1 + 1e-6; y += FLOOR_STEP) {
                    if ((t.bands || []).some(([, by]) => Math.abs(by - y) < 0.06)) continue;
                    for (let c = 0; c < columns; c++) {
                        const phi = (c / columns) * TAU;
                        addWindow(m, r * Math.sin(phi), y, r * Math.cos(phi), phi);
                    }
                }
            });
            footprints.push({ x: t.x, z: t.z, r: t.corners[0][0] });
        });

        // Rounded blocks: tiers stack upward, each [w, d, h, cornerRadius, material, lit]
        const blocks = [
            { x: 0.95, z: 0.45, rot: 0, tiers: [
                [0.55, 0.45, 1.35, 0.06, mat.charcoal, true], [0.61, 0.51, 0.08, 0.035, mat.gold]] },
            { x: -0.9, z: -0.55, rot: 0, tiers: [
                [0.7, 0.55, 0.7, 0.06, mat.bronze, true], [0.76, 0.61, 0.06, 0.03, mat.antique],
                [0.42, 0.36, 0.5, 0.05, mat.bronze, true], [0.48, 0.42, 0.06, 0.03, mat.antique]] },
            { x: 0.6, z: -0.95, rot: 0, tiers: [
                [0.8, 0.4, 0.5, 0.06, mat.antique], [0.84, 0.44, 0.05, 0.025, mat.charcoal]] },
            { x: -0.15, z: 1.15, rot: 0, tiers: [
                [0.6, 0.35, 0.38, 0.06, mat.charcoal, true], [0.64, 0.39, 0.05, 0.025, mat.antique]] },
            { x: 0.75, z: 1.05, rot: 0, tiers: [
                [0.35, 0.35, 0.72, 0.06, mat.bronze, true], [0.4, 0.4, 0.06, 0.03, mat.gold]] },
            { x: 1.55, z: 0.55, rot: 0.4, tiers: [
                [0.3, 0.3, 0.5, 0.05, mat.charcoal, true], [0.35, 0.35, 0.06, 0.03, mat.gold]] }
        ];

        blocks.forEach(b => {
            const m = placement(b.x, 0, b.z, b.rot);
            let y0 = -0.02;
            b.tiers.forEach(([w, d, h, r, material, lit]) => {
                const g = roundedBox(w, h, d, r);
                g.translate(0, y0 + h / 2, 0);
                add(material, g, m);
                if (lit) {
                    // [face half-width, offset along normal, angle] for each wall
                    [[d / 2, w / 2, Math.PI / 2], [d / 2, -w / 2, -Math.PI / 2],
                        [w / 2, d / 2, 0], [w / 2, -d / 2, Math.PI]].forEach(([halfWidth, offset, angle]) => {
                        const usable = halfWidth - r - 0.04;
                        const count = Math.max(1, Math.floor((2 * usable) / 0.1) + 1);
                        for (let y = y0 + 0.14; y <= y0 + h - 0.12; y += FLOOR_STEP) {
                            for (let c = 0; c < count; c++) {
                                const u = count > 1 ? -usable + (2 * usable * c) / (count - 1) : 0;
                                const sin = Math.sin(angle), cos = Math.cos(angle);
                                // u runs along the wall (perpendicular to its normal)
                                addWindow(m, offset * sin + u * cos, y, offset * cos - u * sin, angle);
                            }
                        }
                    });
                }
                y0 += h - 0.01;
            });
            footprints.push({ x: b.x, z: b.z, w: b.tiers[0][0], d: b.tiers[0][1], rot: b.rot });
        });

        // Skybridges between neighbouring buildings (ends sit inside each building)
        bridges.forEach(([x1, z1, x2, z2, y]) => {
            const dx = x2 - x1, dz = z2 - z1;
            const g = roundedBox(Math.hypot(dx, dz), 0.05, 0.12, 0.022);
            add(mat.antique, g, placement((x1 + x2) / 2, y, (z1 + z2) / 2, -Math.atan2(dz, dx)));
        });

        batches.forEach((list, material) => city.add(new THREE.Mesh(mergeGeometries(list), material)));

        // Lit windows: one instanced draw call, steady warm glow
        const windowGeo = new THREE.BoxGeometry(0.036, 0.062, 0.016);
        const windowMat = new THREE.MeshBasicMaterial({ color: col(PALETTE.window), toneMapped: false });
        const windowMesh = new THREE.InstancedMesh(windowGeo, windowMat, windows.length);
        const glowColor = new THREE.Color();
        windows.forEach((w, i) => {
            windowMesh.setMatrixAt(i, w.matrix);
            windowMesh.setColorAt(i, glowColor.setScalar(w.glow));
        });
        windowMesh.instanceMatrix.needsUpdate = true;
        if (windowMesh.instanceColor) windowMesh.instanceColor.needsUpdate = true;
        city.add(windowMesh);

        // -----------------------------------------------------------
        // Plaza surface: soft contact shadows baked into a canvas texture
        // -----------------------------------------------------------
        const plazaCanvas = document.createElement('canvas');
        const TEX = isMobile ? 512 : 1024;
        plazaCanvas.width = plazaCanvas.height = TEX;
        const ctx = plazaCanvas.getContext('2d');
        const toPx = (v) => ((v / PLAZA_R + 1) / 2) * TEX;
        const scale = TEX / (PLAZA_R * 2);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TEX, TEX);
        // Faint concentric paving rings
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = TEX / 512;
        [0.55, 1.05, 1.55].forEach(r => {
            ctx.beginPath();
            ctx.arc(TEX / 2, TEX / 2, r * scale, 0, TAU);
            ctx.stroke();
        });
        const vignette = ctx.createRadialGradient(TEX / 2, TEX / 2, TEX * 0.3, TEX / 2, TEX / 2, TEX / 2);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, TEX, TEX);

        // Shapes are drawn off-canvas so only their blurred shadow lands in place
        const OFF = TEX * 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 0.09 * scale;
        ctx.shadowOffsetX = OFF;
        ctx.fillStyle = '#000';
        footprints.forEach(f => {
            ctx.save();
            ctx.translate(toPx(f.x) - OFF, toPx(f.z));
            ctx.beginPath();
            if (f.r) {
                ctx.arc(0, 0, f.r * scale * 1.05, 0, TAU);
            } else {
                ctx.rotate(-f.rot); // canvas y is world z, which flips the handedness
                const w = f.w * scale * 1.05, d = f.d * scale * 1.05;
                ctx.rect(-w / 2, -d / 2, w, d);
            }
            ctx.fill();
            ctx.restore();
        });

        const plazaTex = new THREE.CanvasTexture(plazaCanvas);
        plazaTex.encoding = THREE.sRGBEncoding;
        plazaTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        const plazaMat = new THREE.MeshStandardMaterial({
            color: col(PALETTE.plaza), map: plazaTex, metalness: 0.7, roughness: 0.55
        });
        const plaza = new THREE.Mesh(new THREE.CircleGeometry(PLAZA_R, RADIAL_SEGMENTS * 2), plazaMat);
        plaza.rotation.x = -Math.PI / 2;
        city.add(plaza);

        // -----------------------------------------------------------
        // Lighting: warm key, gentle fill, golden rim. No shadow maps.
        // -----------------------------------------------------------
        scene.add(new THREE.HemisphereLight(col(0x6B5030), col(0x080604), 0.55));
        const key = new THREE.DirectionalLight(col(0xFFE2B8), 1.35);
        key.position.set(4, 6, 5);
        const fill = new THREE.DirectionalLight(col(0xC08A4A), 0.35);
        fill.position.set(-5, 1.5, 4);
        const rim = new THREE.DirectionalLight(col(0xE5B52E), 0.9);
        rim.position.set(-2, 3, -6);
        scene.add(key, fill, rim);

        // -----------------------------------------------------------
        // Sizing: drawing buffer always equals CSS size × capped DPR
        // -----------------------------------------------------------
        function resize() {
            const w = container.clientWidth || 1;
            const h = container.clientHeight || 1;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            const halfTan = Math.tan((FOV * Math.PI) / 360);
            const distance = FIT_RADIUS / (halfTan * Math.min(1, camera.aspect));
            camera.position.set(0, Math.sin(CAMERA_PITCH) * distance, Math.cos(CAMERA_PITCH) * distance);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
            if (!running) renderer.render(scene, camera);
        }

        // Moving the window to a screen with another DPR fires no resize event
        let dprQuery = null;
        function watchPixelRatio() {
            if (dprQuery && dprQuery.removeEventListener) dprQuery.removeEventListener('change', onPixelRatioChange);
            dprQuery = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
            if (dprQuery.addEventListener) dprQuery.addEventListener('change', onPixelRatioChange);
        }
        function onPixelRatioChange() {
            resize();
            watchPixelRatio();
        }

        // -----------------------------------------------------------
        // Animation: constant-speed spin from rAF timestamps
        // -----------------------------------------------------------
        let angle = REST_ANGLE;
        let running = false;
        let frameId = 0;
        let lastTime = -1;

        function frame(now) {
            frameId = requestAnimationFrame(frame);
            if (lastTime >= 0) {
                // Cap long gaps (e.g. a stalled tab) instead of jumping ahead
                angle = (angle + Math.min((now - lastTime) / 1000, 0.1) * SPIN_SPEED) % TAU;
            }
            lastTime = now;
            city.rotation.y = angle;
            renderer.render(scene, camera);
        }

        function start() {
            if (running || reducedMotion) return;
            running = true;
            lastTime = -1;
            frameId = requestAnimationFrame(frame);
        }

        function stop() {
            if (!running) return;
            running = false;
            cancelAnimationFrame(frameId);
        }

        let inView = true;
        const syncRunning = () => (inView && !document.hidden ? start() : stop());
        const onVisibility = () => syncRunning();

        const intersection = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            syncRunning();
        });
        intersection.observe(container);

        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
        if (resizeObserver) resizeObserver.observe(container);
        else window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', onVisibility);
        watchPixelRatio();

        const onContextLost = (e) => {
            e.preventDefault();
            stop();
            canvas.style.display = 'none';
            showFallback();
        };
        canvas.addEventListener('webglcontextlost', onContextLost);

        // -----------------------------------------------------------
        // Cleanup
        // -----------------------------------------------------------
        let disposed = false;
        function dispose() {
            if (disposed) return;
            disposed = true;
            stop();
            intersection.disconnect();
            if (resizeObserver) resizeObserver.disconnect();
            else window.removeEventListener('resize', resize);
            if (dprQuery && dprQuery.removeEventListener) dprQuery.removeEventListener('change', onPixelRatioChange);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
            canvas.removeEventListener('webglcontextlost', onContextLost);

            scene.traverse(o => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) [].concat(o.material).forEach(m => m.dispose());
            });
            plazaTex.dispose();
            envTarget.dispose();
            renderer.dispose();
            canvas.remove();
        }
        const onPageHide = (e) => { if (!e.persisted) dispose(); };
        window.addEventListener('pagehide', onPageHide);

        // First frame, then fade the canvas in
        resize();
        renderer.render(scene, camera);
        requestAnimationFrame(() => container.classList.add('city-ready'));
        syncRunning();

        window.GoldenCity = { dispose };
    }

    // Defer scene construction so hero text paints first
    if ('requestIdleCallback' in window) window.requestIdleCallback(init, { timeout: 800 });
    else setTimeout(init, 60);
})();
