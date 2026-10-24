// ---------------------------------------------------------------
// The Golden Relic — interactive 3D hero centerpiece
// A floating gyroscopic artifact: nested gimbal rings, an engraved
// astrolabe dial, a lathe-turned spindle and a pulsing amber core.
// Built procedurally with Three.js r128 (loaded from CDN, no build step).
// ---------------------------------------------------------------
(function () {
    'use strict';

    const container = document.getElementById('hero-3d-container');
    if (!container) return;

    const PALETTE = {
        black: 0x080705,
        brown: 0x15100B,
        antiqueGold: 0xB88624,
        warmGold: 0xE5B52E,
        amber: 0xD97916,
        teal: 0x00BFC0
    };
    const TAU = Math.PI * 2;
    const FOV = 38;
    const FIT_RADIUS = 4.5; // world-space radius that must stay in frame

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    function webglAvailable() {
        try {
            const c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
        } catch (e) {
            return false;
        }
    }

    // Static CSS rendition of the relic for browsers without WebGL
    function showFallback() {
        container.classList.add('relic-fallback');
        if (container.querySelector('.relic-fallback-art')) return;
        const art = document.createElement('div');
        art.className = 'relic-fallback-art';
        art.setAttribute('aria-hidden', 'true');
        art.innerHTML = '<span></span><span></span><span></span><i></i>';
        container.appendChild(art);
    }

    if (typeof THREE === 'undefined' || !webglAvailable()) {
        showFallback();
        return;
    }

    function init() {
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: !isMobile || window.devicePixelRatio < 2,
                powerPreference: 'high-performance'
            });
        } catch (err) {
            console.warn('Golden Relic: WebGL init failed, using fallback.', err);
            showFallback();
            return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
        renderer.setClearColor(0x000000, 0);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        const canvas = renderer.domElement;
        canvas.classList.add('relic-canvas');
        canvas.setAttribute('aria-hidden', 'true');
        container.appendChild(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

        // -----------------------------------------------------------
        // Helpers
        // -----------------------------------------------------------
        const col = (hex) => new THREE.Color(hex).convertSRGBToLinear();
        const segs = (desktop, mobile) => (isMobile ? mobile : desktop);

        function canvasTexture(w, h, draw, srgb) {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            draw(c.getContext('2d'), w, h);
            const tex = new THREE.CanvasTexture(c);
            if (srgb) tex.encoding = THREE.sRGBEncoding;
            return tex;
        }

        // Bump map: edge grooves plus a band of geometric glyphs
        const engravingTex = canvasTexture(1024, 128, (ctx, w, h) => {
            ctx.fillStyle = '#808080';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#2e2e2e';
            [12, 18, h - 20, h - 14].forEach(y => ctx.fillRect(0, y, w, 2));
            ctx.fillStyle = '#c8c8c8';
            [24, h - 26].forEach(y => ctx.fillRect(0, y, w, 1));

            const cy = h / 2;
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 3;
            for (let i = 0; i < 16; i++) {
                const cx = 32 + i * 64;
                ctx.beginPath();
                switch (i % 4) {
                    case 0:
                        ctx.arc(cx, cy, 13, 0, TAU);
                        ctx.moveTo(cx + 4, cy);
                        ctx.arc(cx, cy, 4, 0, TAU);
                        break;
                    case 1:
                        ctx.moveTo(cx, cy - 14);
                        ctx.lineTo(cx + 13, cy + 10);
                        ctx.lineTo(cx - 13, cy + 10);
                        ctx.closePath();
                        break;
                    case 2:
                        ctx.moveTo(cx - 6, cy - 14); ctx.lineTo(cx - 6, cy + 14);
                        ctx.moveTo(cx + 6, cy - 14); ctx.lineTo(cx + 6, cy + 14);
                        ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
                        break;
                    default:
                        ctx.moveTo(cx, cy - 15);
                        ctx.lineTo(cx + 11, cy);
                        ctx.lineTo(cx, cy + 15);
                        ctx.lineTo(cx - 11, cy);
                        ctx.closePath();
                }
                ctx.stroke();
                ctx.fillStyle = '#3a3a3a';
                ctx.fillRect(cx + 30, cy - 22, 2, 8);
                ctx.fillRect(cx + 30, cy + 14, 2, 8);
            }
        });

        const glowTex = canvasTexture(256, 256, (ctx, w, h) => {
            const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            g.addColorStop(0, 'rgba(255, 214, 140, 1)');
            g.addColorStop(0.25, 'rgba(229, 150, 40, 0.55)');
            g.addColorStop(0.6, 'rgba(217, 121, 22, 0.12)');
            g.addColorStop(1, 'rgba(217, 121, 22, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        }, true);

        const dotTex = canvasTexture(64, 64, (ctx, w, h) => {
            const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            g.addColorStop(0, 'rgba(255, 255, 255, 1)');
            g.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
            g.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        }, true);

        function extrude(shape, depth, bevel) {
            const geo = new THREE.ExtrudeGeometry(shape, {
                depth,
                bevelEnabled: true,
                bevelThickness: bevel,
                bevelSize: bevel,
                bevelSegments: 2,
                curveSegments: segs(24, 12)
            });
            geo.translate(0, 0, -depth / 2);
            return geo;
        }

        function annulusShape(r0, r1) {
            const s = new THREE.Shape();
            s.absarc(0, 0, r1, 0, TAU, false);
            const hole = new THREE.Path();
            hole.absarc(0, 0, r0, 0, TAU, true);
            s.holes.push(hole);
            return s;
        }

        function arcSectorShape(r0, r1, a0, a1) {
            const s = new THREE.Shape();
            s.absarc(0, 0, r1, a0, a1, false);
            s.absarc(0, 0, r0, a1, a0, true);
            return s;
        }

        function gearShape(teeth, rOuter, rRoot, rAxle, holeCount, holeR, holeOrbit) {
            const s = new THREE.Shape();
            const step = TAU / teeth;
            for (let i = 0; i < teeth; i++) {
                const a = i * step;
                [[rRoot, a], [rOuter, a + step * 0.2], [rOuter, a + step * 0.45], [rRoot, a + step * 0.65]]
                    .forEach(([r, ang], j) => {
                        const x = Math.cos(ang) * r;
                        const y = Math.sin(ang) * r;
                        if (i === 0 && j === 0) s.moveTo(x, y);
                        else s.lineTo(x, y);
                    });
            }
            s.closePath();
            const axle = new THREE.Path();
            axle.absarc(0, 0, rAxle, 0, TAU, true);
            s.holes.push(axle);
            for (let i = 0; i < holeCount; i++) {
                const a = (i * TAU) / holeCount;
                const h = new THREE.Path();
                h.absarc(Math.cos(a) * holeOrbit, Math.sin(a) * holeOrbit, holeR, 0, TAU, true);
                s.holes.push(h);
            }
            return s;
        }

        function spikeShape(length, width) {
            const s = new THREE.Shape();
            s.moveTo(0, 0);
            s.lineTo(length * 0.35, width);
            s.lineTo(length, 0);
            s.lineTo(length * 0.35, -width);
            s.closePath();
            return s;
        }

        // -----------------------------------------------------------
        // Environment (procedural softbox studio for metal reflections)
        // -----------------------------------------------------------
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envScene = new THREE.Scene();
        envScene.add(new THREE.Mesh(
            new THREE.SphereGeometry(20, 32, 16),
            new THREE.MeshBasicMaterial({ color: col(PALETTE.brown), side: THREE.BackSide })
        ));
        [
            [0xffd9a0, 6, [6, 8, 8], [10, 6]],          // warm key softbox
            [PALETTE.amber, 4, [-10, 2, -6], [6, 12]],  // amber rim
            [PALETTE.warmGold, 2.5, [8, -6, -8], [8, 4]],
            [0xffffff, 1.5, [0, 14, 0], [8, 8]]
        ].forEach(([hex, intensity, pos, size]) => {
            const panel = new THREE.Mesh(
                new THREE.PlaneGeometry(size[0], size[1]),
                new THREE.MeshBasicMaterial({ color: col(hex).multiplyScalar(intensity), side: THREE.DoubleSide })
            );
            panel.position.set(pos[0], pos[1], pos[2]);
            panel.lookAt(0, 0, 0);
            envScene.add(panel);
        });
        const envTarget = pmrem.fromScene(envScene, 0.04);
        envScene.traverse(o => {
            if (o.isMesh) {
                o.geometry.dispose();
                o.material.dispose();
            }
        });
        pmrem.dispose();
        scene.environment = envTarget.texture;

        // -----------------------------------------------------------
        // Materials
        // -----------------------------------------------------------
        const std = (hex, metalness, roughness, extra) =>
            new THREE.MeshStandardMaterial(Object.assign({ color: col(hex), metalness, roughness }, extra || {}));

        const mat = {
            gold: std(PALETTE.warmGold, 1, 0.24),
            antique: std(PALETTE.antiqueGold, 1, 0.38),
            antiqueDouble: std(PALETTE.antiqueGold, 1, 0.4, { side: THREE.DoubleSide }),
            brass: std(0x8a6420, 1, 0.48),
            bandInner: std(0x6e4c16, 1, 0.5, { side: THREE.BackSide }),
            coreShell: std(0x3a1a06, 0.2, 0.35, { emissive: col(PALETTE.amber), emissiveIntensity: 1.8 })
        };

        function engravedMaterial(hex, roughness, repeat) {
            const tex = engravingTex.clone();
            tex.needsUpdate = true;
            tex.wrapS = THREE.RepeatWrapping;
            tex.repeat.set(repeat, 1);
            return std(hex, 1, roughness, { bumpMap: tex, bumpScale: 0.025 });
        }

        const glowMaterial = (hex, opacity) => new THREE.MeshBasicMaterial({
            color: col(hex),
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // -----------------------------------------------------------
        // Scene graph: scene → pivot (float, entrance, parallax) → relic
        // -----------------------------------------------------------
        const pivot = new THREE.Group();
        scene.add(pivot);
        const relic = new THREE.Group();
        relic.rotation.set(0.12, -0.35, 0); // three-quarter view
        pivot.add(relic);

        // Energy points flicker intermittently; collected for the animation loop
        const energyPoints = [];
        function addEnergyPoint(parent, x, y, z, size) {
            const coreMat = glowMaterial(PALETTE.teal, 0.6);
            const dot = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), coreMat);
            dot.position.set(x, y, z);
            const haloMat = new THREE.SpriteMaterial({
                map: dotTex,
                color: col(PALETTE.teal),
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const halo = new THREE.Sprite(haloMat);
            halo.scale.setScalar(size * 9);
            dot.add(halo);
            parent.add(dot);
            energyPoints.push({ coreMat, haloMat, phase: energyPoints.length * 2.39 });
        }

        // --- Gimbal band: engraved outer face, plain inner face, rolled lips
        function makeBand(radius, thickness, height, material) {
            const band = new THREE.Group();
            const seg = segs(160, 96);
            const ro = radius + thickness / 2;
            const ri = radius - thickness / 2;
            band.add(new THREE.Mesh(new THREE.CylinderGeometry(ro, ro, height, seg, 1, true), material));
            band.add(new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, height, seg, 1, true), mat.bandInner));

            const faceGeo = new THREE.RingGeometry(ri, ro, seg, 1);
            const top = new THREE.Mesh(faceGeo, mat.antique);
            top.rotation.x = -Math.PI / 2;
            top.position.y = height / 2;
            const bottom = new THREE.Mesh(faceGeo, mat.antique);
            bottom.rotation.x = Math.PI / 2;
            bottom.position.y = -height / 2;
            band.add(top, bottom);

            const lipGeo = new THREE.TorusGeometry(ro, Math.min(0.016, thickness * 0.35), 8, seg);
            [height / 2, -height / 2].forEach(y => {
                const lip = new THREE.Mesh(lipGeo, mat.gold);
                lip.rotation.x = Math.PI / 2;
                lip.position.y = y;
                band.add(lip);
            });

            // Bands are modelled around Y; stand them up into the XY plane
            band.rotation.x = Math.PI / 2;
            return band;
        }

        // --- Axle pins + bearing caps joining two rings along an axis
        const pinCapGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.06, 20);
        const pinFinialGeo = new THREE.ConeGeometry(0.035, 0.12, 12);
        function addPivot(parent, axis, rInner, rOuter) {
            [-1, 1].forEach(sign => {
                const len = rOuter - rInner;
                const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, len, 12), mat.brass);
                const cap = new THREE.Mesh(pinCapGeo, mat.gold);
                const finial = new THREE.Mesh(pinFinialGeo, mat.gold);
                const mid = (sign * (rInner + rOuter)) / 2;
                const capAt = sign * (rOuter + 0.04);
                const finialAt = sign * (rOuter + 0.12);
                if (axis === 'x') {
                    [pin, cap].forEach(m => { m.rotation.z = Math.PI / 2; });
                    pin.position.x = mid;
                    cap.position.x = capAt;
                    finial.position.x = finialAt;
                    finial.rotation.z = -sign * Math.PI / 2;
                } else {
                    pin.position.y = mid;
                    cap.position.y = capAt;
                    finial.position.y = finialAt;
                    finial.rotation.x = sign > 0 ? 0 : Math.PI;
                }
                parent.add(pin, cap, finial);
            });
        }

        // -----------------------------------------------------------
        // Nested gimbals: A spins about Y, B about A's X, C about B's Y
        // -----------------------------------------------------------
        const R = { a: 2.55, b: 2.2, c: 1.86 };
        const bandRepeat = (radius, height) => Math.max(3, Math.round((TAU * radius) / (height * 8)));

        const gimbalA = new THREE.Group();
        relic.add(gimbalA);
        gimbalA.add(makeBand(R.a, 0.06, 0.26, engravedMaterial(PALETTE.warmGold, 0.28, bandRepeat(R.a, 0.26))));
        addPivot(gimbalA, 'x', R.b + 0.03, R.a - 0.03);
        addPivot(gimbalA, 'y', R.a - 0.03, R.a + 0.03);

        const gimbalB = new THREE.Group();
        gimbalB.rotation.x = 1.05;
        gimbalA.add(gimbalB);
        gimbalB.add(makeBand(R.b, 0.05, 0.2, engravedMaterial(PALETTE.antiqueGold, 0.36, bandRepeat(R.b, 0.2))));
        addPivot(gimbalB, 'y', R.c + 0.03, R.b - 0.025);

        const gimbalC = new THREE.Group();
        gimbalC.rotation.y = 0.7;
        gimbalB.add(gimbalC);
        gimbalC.add(makeBand(R.c, 0.045, 0.15, engravedMaterial(PALETTE.warmGold, 0.26, bandRepeat(R.c, 0.15))));

        // -----------------------------------------------------------
        // Astrolabe dial behind the gimbals, with a compass-rose of spikes
        // -----------------------------------------------------------
        const halo = new THREE.Group();
        halo.position.z = -0.35;
        relic.add(halo);
        halo.add(new THREE.Mesh(extrude(annulusShape(3.2, 3.3), 0.04, 0.01), mat.antique));

        const innerTrack = new THREE.Mesh(new THREE.TorusGeometry(3.02, 0.008, 6, segs(180, 96)), mat.brass);
        halo.add(innerTrack);

        const tickCount = segs(144, 72);
        const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat.gold, tickCount);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < tickCount; i++) {
            const a = (i / tickCount) * TAU;
            const len = i % 12 === 0 ? 0.16 : 0.07;
            const r = 3.19 - len / 2;
            dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
            dummy.rotation.set(0, 0, a);
            dummy.scale.set(len, 0.012, 0.025);
            dummy.updateMatrix();
            ticks.setMatrixAt(i, dummy.matrix);
        }
        ticks.instanceMatrix.needsUpdate = true;
        halo.add(ticks);

        const longSpikeGeo = extrude(spikeShape(0.75, 0.07), 0.03, 0.008);
        const shortSpikeGeo = extrude(spikeShape(0.38, 0.045), 0.03, 0.008);
        for (let k = 0; k < 8; k++) {
            const a = (k / 8) * TAU + Math.PI / 2;
            const cardinal = k % 2 === 0;
            const spike = new THREE.Mesh(cardinal ? longSpikeGeo : shortSpikeGeo, cardinal ? mat.gold : mat.antique);
            spike.position.set(Math.cos(a) * 3.28, Math.sin(a) * 3.28, 0);
            spike.rotation.z = a;
            halo.add(spike);
            if (cardinal) addEnergyPoint(halo, Math.cos(a) * 4.1, Math.sin(a) * 4.1, 0, 0.03);
        }

        // Tilted "ecliptic" track with teal beads riding along it
        const ecliptic = new THREE.Group();
        ecliptic.rotation.set(Math.PI / 2 - 0.42, 0, 0.35);
        relic.add(ecliptic);
        ecliptic.add(new THREE.Mesh(new THREE.TorusGeometry(2.92, 0.009, 6, segs(180, 96)), mat.brass));
        const beads = new THREE.Group();
        ecliptic.add(beads);
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * TAU + 0.4;
            addEnergyPoint(beads, Math.cos(a) * 2.92, Math.sin(a) * 2.92, 0, 0.035);
        }

        // -----------------------------------------------------------
        // Core assembly: spindle, split housing, fin cage, gears, amber heart
        // -----------------------------------------------------------
        const core = new THREE.Group();
        relic.add(core);

        const spindleProfile = [
            [0.001, -1.62], [0.03, -1.58], [0.05, -1.46], [0.025, -1.38], [0.08, -1.3],
            [0.1, -1.24], [0.1, -1.18], [0.06, -1.14], [0.045, -1.0], [0.045, -0.86],
            [0.13, -0.82], [0.15, -0.77], [0.13, -0.72], [0.07, -0.68], [0.07, -0.56]
        ].map(([x, y]) => new THREE.Vector2(x, y));
        const spindleGeo = new THREE.LatheGeometry(spindleProfile, segs(40, 24));
        const spindleBottom = new THREE.Mesh(spindleGeo, mat.gold);
        const spindleTop = new THREE.Mesh(spindleGeo, mat.gold);
        spindleTop.rotation.x = Math.PI;
        core.add(spindleBottom, spindleTop);

        // Housing caps leave an equatorial gap that reveals the heart
        const capTheta = Math.PI * 0.3;
        const capGeo = new THREE.SphereGeometry(0.62, segs(48, 32), 16, 0, TAU, 0, capTheta);
        const capTop = new THREE.Mesh(capGeo, mat.antiqueDouble);
        const capBottom = new THREE.Mesh(capGeo, mat.antiqueDouble);
        capBottom.rotation.x = Math.PI;
        core.add(capTop, capBottom);

        const capEdgeR = 0.62 * Math.sin(capTheta);
        const capEdgeY = 0.62 * Math.cos(capTheta);
        [1, -1].forEach(sign => {
            const lip = new THREE.Mesh(new THREE.TorusGeometry(capEdgeR, 0.022, 10, segs(64, 40)), mat.gold);
            lip.rotation.x = Math.PI / 2;
            lip.position.y = sign * capEdgeY;
            core.add(lip);
            // engraved latitude grooves
            [0.08, 0.15, 0.22].forEach(f => {
                const th = Math.PI * f;
                const groove = new THREE.Mesh(new THREE.TorusGeometry(0.625 * Math.sin(th), 0.006, 6, 48), mat.gold);
                groove.rotation.x = Math.PI / 2;
                groove.position.y = sign * 0.625 * Math.cos(th);
                core.add(groove);
            });
        });

        const rivetCount = 16;
        const rivets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 8, 6), mat.gold, rivetCount * 2);
        const rivetTheta = Math.PI * 0.27;
        for (let i = 0; i < rivetCount * 2; i++) {
            const a = (i % rivetCount) / rivetCount * TAU;
            const sign = i < rivetCount ? 1 : -1;
            const r = 0.625 * Math.sin(rivetTheta);
            dummy.position.set(Math.cos(a) * r, sign * 0.625 * Math.cos(rivetTheta), Math.sin(a) * r);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.setScalar(1);
            dummy.updateMatrix();
            rivets.setMatrixAt(i, dummy.matrix);
        }
        rivets.instanceMatrix.needsUpdate = true;
        core.add(rivets);

        // Amber heart + thin orbiting glow rings
        const heart = new THREE.Mesh(new THREE.SphereGeometry(0.4, segs(40, 24), segs(24, 16)), mat.coreShell);
        core.add(heart);
        const heartRings = [];
        [[Math.PI / 2 + 0.3, 0], [Math.PI / 2 - 0.5, 1.1]].forEach(([rx, ry]) => {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.006, 6, 64), glowMaterial(PALETTE.warmGold, 0.8));
            ring.rotation.set(rx, ry, 0);
            core.add(ring);
            heartRings.push(ring);
        });

        const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        coreGlow.scale.setScalar(2.4);
        core.add(coreGlow);

        // Fin cage: six pierced blades hugging the housing
        const finShape = new THREE.Shape();
        const finA = Math.PI * 0.36;
        finShape.moveTo(0.64 * Math.cos(finA), 0.64 * Math.sin(finA));
        finShape.bezierCurveTo(0.62, 0.86, 1.08, 0.4, 1.04, 0);
        finShape.bezierCurveTo(1.08, -0.4, 0.62, -0.86, 0.64 * Math.cos(finA), -0.64 * Math.sin(finA));
        finShape.absarc(0, 0, 0.64, -finA, finA, false);
        const finHole = new THREE.Path();
        finHole.absarc(0.82, 0, 0.075, 0, TAU, true);
        finShape.holes.push(finHole);
        const finGeo = extrude(finShape, 0.03, 0.008);

        const filamentMats = [];
        const filamentGeos = [1, -1].map(sign => new THREE.TubeGeometry(
            new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(1.0, sign * 0.05, 0),
                new THREE.Vector3(0.95, sign * 0.8, 0),
                new THREE.Vector3(0.3, sign * 0.93, 0)
            ),
            segs(32, 16), 0.005, 5
        ));

        const finCount = 6;
        for (let k = 0; k < finCount; k++) {
            const arm = new THREE.Group();
            arm.rotation.y = (k / finCount) * TAU;
            arm.add(new THREE.Mesh(finGeo, mat.gold));
            const filamentMat = glowMaterial(PALETTE.warmGold, 0.35);
            filamentMats.push({ mat: filamentMat, phase: k * 1.31 });
            filamentGeos.forEach(g => arm.add(new THREE.Mesh(g, filamentMat)));
            addEnergyPoint(arm, 1.1, 0, 0, 0.028);
            core.add(arm);
        }

        // Counter-rotating gears on the spindle
        const gearGeo = extrude(gearShape(18, 0.34, 0.3, 0.06, 5, 0.05, 0.18), 0.04, 0.008);
        const gearTop = new THREE.Mesh(gearGeo, mat.antique);
        const gearBottom = new THREE.Mesh(gearGeo, mat.antique);
        gearTop.rotation.x = gearBottom.rotation.x = Math.PI / 2;
        gearTop.position.y = 0.93;
        gearBottom.position.y = -0.93;
        core.add(gearTop, gearBottom);

        // -----------------------------------------------------------
        // Suspended fragments that drift independently
        // -----------------------------------------------------------
        const fragmentGeos = [
            extrude(arcSectorShape(0.42, 0.5, 0, 0.9), 0.08, 0.01),
            extrude(arcSectorShape(0.6, 0.66, 0, 0.6), 0.06, 0.01),
            extrude(gearShape(8, 0.16, 0.13, 0.04, 0, 0, 0), 0.04, 0.006),
            extrude((() => {
                const s = new THREE.Shape();
                s.moveTo(0, 0); s.lineTo(0.22, 0.05); s.lineTo(0.12, 0.3); s.closePath();
                return s;
            })(), 0.04, 0.008),
            extrude((() => {
                const s = new THREE.Shape();
                s.moveTo(0, 0); s.lineTo(0.18, -0.04); s.lineTo(0.26, 0.12); s.lineTo(0.06, 0.2); s.closePath();
                return s;
            })(), 0.035, 0.008)
        ];
        fragmentGeos.forEach(g => g.center());

        // [angle (deg), radius, z, geometry index]
        const fragmentLayout = [
            [22, 3.85, 0.6, 0], [68, 3.7, -0.7, 3], [115, 3.9, 0.4, 2], [158, 3.75, -0.3, 1],
            [205, 3.8, 0.8, 4], [250, 3.7, -0.6, 0], [295, 3.9, 0.3, 3], [338, 3.75, -0.8, 2]
        ].slice(0, segs(8, 5));
        const fragments = fragmentLayout.map(([deg, r, z, gi], i) => {
            const a = (deg * Math.PI) / 180;
            const mesh = new THREE.Mesh(fragmentGeos[gi], i % 2 ? mat.antique : mat.gold);
            const base = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
            mesh.position.copy(base);
            mesh.rotation.set(i * 0.7, i * 1.3, a);
            relic.add(mesh);
            return { mesh, base, phase: i * 1.7, spin: 0.08 + (i % 3) * 0.04 };
        });

        // -----------------------------------------------------------
        // Atmosphere: haze behind the relic and a few drifting motes
        // -----------------------------------------------------------
        const haze = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        haze.scale.setScalar(10);
        haze.position.z = -2.5;
        scene.add(haze);

        const moteCount = segs(110, 45);
        const motePositions = new Float32Array(moteCount * 3);
        for (let i = 0; i < moteCount; i++) {
            const r = 2.6 + Math.random() * 3.4;
            const theta = Math.random() * TAU;
            const phi = Math.acos(2 * Math.random() - 1);
            motePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            motePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            motePositions[i * 3 + 2] = r * Math.cos(phi) * 0.6;
        }
        const moteGeo = new THREE.BufferGeometry();
        moteGeo.setAttribute('position', new THREE.Float32BufferAttribute(motePositions, 3));
        const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
            size: 0.06,
            map: dotTex,
            color: col(PALETTE.warmGold),
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        }));
        scene.add(motes);

        // -----------------------------------------------------------
        // Lighting: warm key, amber + gold rims, pulsing core
        // -----------------------------------------------------------
        scene.add(new THREE.HemisphereLight(col(0x7a5520), col(PALETTE.black), 0.6));
        const key = new THREE.DirectionalLight(col(0xffd38a), 2.2);
        key.position.set(4, 5, 6);
        const rimAmber = new THREE.DirectionalLight(col(PALETTE.amber), 3);
        rimAmber.position.set(-5, 2, -6);
        const rimGold = new THREE.DirectionalLight(col(PALETTE.warmGold), 1.5);
        rimGold.position.set(6, -3, -5);
        // Teal comes only from the energy points: teal light on gold reads as green
        const coreLight = new THREE.PointLight(col(PALETTE.amber), 2, 6, 2);
        core.add(coreLight);
        scene.add(key, rimAmber, rimGold);

        // -----------------------------------------------------------
        // Sizing
        // -----------------------------------------------------------
        function resize() {
            const w = container.clientWidth || 1;
            const h = container.clientHeight || 1;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            const halfTan = Math.tan((FOV * Math.PI) / 360);
            camera.position.z = FIT_RADIUS / (halfTan * Math.min(1, camera.aspect));
            camera.updateProjectionMatrix();
            if (!running) renderer.render(scene, camera);
        }

        // -----------------------------------------------------------
        // Animation
        // -----------------------------------------------------------
        const pointer = { x: 0, y: 0 };
        const onPointerMove = (e) => {
            pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
            pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
        };

        const clock = new THREE.Clock(false);
        let elapsed = reducedMotion ? 4 : 0; // reduced motion starts at the settled pose
        let running = false;
        let frameId = 0;

        function update(dt) {
            elapsed += dt;
            const t = elapsed;

            // Entrance: rise into place and settle in scale
            const p = Math.min(1, t / 2.4);
            const ease = 1 - Math.pow(1 - p, 3);
            pivot.position.y = Math.sin(t * 0.45) * 0.12 - (1 - ease) * 0.8;
            pivot.scale.setScalar(0.88 + 0.12 * ease);

            // Parallax toward the pointer
            pivot.rotation.y += (pointer.x * 0.35 - pivot.rotation.y) * 0.04;
            pivot.rotation.x += (pointer.y * 0.2 - pivot.rotation.x) * 0.04;

            gimbalA.rotation.y += dt * 0.14;
            gimbalB.rotation.x += dt * 0.21;
            gimbalC.rotation.y -= dt * 0.3;
            core.rotation.y += dt * 0.12;
            gearTop.rotation.z += dt * 0.6;
            gearBottom.rotation.z -= dt * 0.6;
            heartRings[0].rotation.z += dt * 0.5;
            heartRings[1].rotation.z -= dt * 0.35;
            beads.rotation.z += dt * 0.25;

            const pulse = 0.5 + 0.5 * Math.sin(t * 1.15);
            mat.coreShell.emissiveIntensity = 1.4 + 0.9 * pulse;
            coreLight.intensity = 1.6 + 1.4 * pulse;
            coreGlow.material.opacity = 0.55 + 0.3 * pulse;

            // Sharp, infrequent sparks
            const spark = (phase, speed) => Math.pow(Math.max(0, Math.sin(t * speed + phase)), 12);
            energyPoints.forEach(ep => {
                const s = spark(ep.phase, 0.6);
                ep.coreMat.opacity = 0.3 + 0.7 * s;
                ep.haloMat.opacity = 0.15 + 0.75 * s;
            });
            filamentMats.forEach(f => {
                f.mat.opacity = 0.3 + 0.6 * spark(f.phase, 0.45);
            });

            fragments.forEach(f => {
                f.mesh.position.set(
                    f.base.x + Math.sin(t * 0.3 + f.phase) * 0.08,
                    f.base.y + Math.cos(t * 0.25 + f.phase) * 0.1,
                    f.base.z + Math.sin(t * 0.2 + f.phase) * 0.06
                );
                f.mesh.rotation.x += dt * f.spin;
                f.mesh.rotation.y += dt * f.spin * 0.6;
            });

            motes.rotation.y += dt * 0.02;
            motes.position.y = Math.sin(t * 0.15) * 0.15;
        }

        function frame() {
            frameId = requestAnimationFrame(frame);
            update(Math.min(clock.getDelta(), 0.05));
            renderer.render(scene, camera);
        }

        function start() {
            if (running || reducedMotion) return;
            running = true;
            clock.start();
            clock.getDelta();
            frameId = requestAnimationFrame(frame);
        }

        function stop() {
            if (!running) return;
            running = false;
            cancelAnimationFrame(frameId);
            clock.stop();
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

        if (!reducedMotion) window.addEventListener('pointermove', onPointerMove, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);

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
            window.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
            canvas.removeEventListener('webglcontextlost', onContextLost);

            const textures = new Set([engravingTex, glowTex, dotTex]);
            scene.traverse(o => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) {
                    [].concat(o.material).forEach(m => {
                        ['map', 'bumpMap'].forEach(k => { if (m[k]) textures.add(m[k]); });
                        m.dispose();
                    });
                }
            });
            textures.forEach(tex => tex.dispose());
            envTarget.dispose();
            renderer.dispose();
            canvas.remove();
        }
        const onPageHide = (e) => { if (!e.persisted) dispose(); };
        window.addEventListener('pagehide', onPageHide);

        // First frame, then fade the canvas in
        resize();
        update(0);
        renderer.render(scene, camera);
        requestAnimationFrame(() => container.classList.add('relic-ready'));
        syncRunning();

        window.GoldenRelic = { dispose };
    }

    // Defer heavy scene construction so hero text paints first
    if ('requestIdleCallback' in window) window.requestIdleCallback(init, { timeout: 800 });
    else setTimeout(init, 60);
})();
