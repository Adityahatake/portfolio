// Initialize GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Custom Cursor — Golden Ember
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

if (cursorDot && cursorOutline) {
    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;
        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;
        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });

    const interactiveElements = document.querySelectorAll('a, button, .tilt-card, .focus-chip, .skill-tag, .cert-card, .social-link');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursorOutline.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursorOutline.classList.remove('hover'));
    });
}

// Golden Lotus Transition Effect
function triggerMechaFlower(targetId) {
    const container = document.getElementById('mechaFlower');
    container.innerHTML = '';

    // Create the golden lotus structure
    const spinner = document.createElement('div');
    spinner.className = 'royal-flower-spinner';

    const flower = document.createElement('div');
    flower.className = 'royal-flower';

    for (let i = 1; i <= 8; i++) {
        const petal = document.createElement('div');
        petal.className = 'royal-petal';
        flower.appendChild(petal);
    }

    spinner.appendChild(flower);
    container.appendChild(spinner);

    // Activate transition
    requestAnimationFrame(() => {
        container.classList.add('active');
        flower.classList.add('active');
    });

    // Navigate and cleanup after animation
    setTimeout(() => {
        if (targetId) {
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // Fade out
        flower.classList.remove('active');
        flower.style.transform = 'scale(0.5) rotate(180deg)';
        flower.style.opacity = '0';
        container.classList.remove('active');

        setTimeout(() => {
            container.innerHTML = '';
        }, 800);
    }, 800);
}

// Sacred Flame Embers & Living Temple Atmosphere
const canvas = document.getElementById('neural-canvas');
const ctx = canvas.getContext('2d');
let width, height, dpr;
let stars = [];
let embers = [];
let bokehOrbs = [];
const starCount = 38;
const emberCount = 45;
const bokehCount = 10;
const connectionDistance = 140;
let mouseCanvasX = -1000, mouseCanvasY = -1000;
let normMouseX = 0, normMouseY = 0;

const templeBg = document.getElementById('templeBg');
const torchGlow = document.getElementById('templeTorchGlow');

function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.width = window.innerWidth * dpr;
    height = canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);
}

// Track mouse for torch illumination, parallax, and ember attraction
window.addEventListener('mousemove', (e) => {
    mouseCanvasX = e.clientX;
    mouseCanvasY = e.clientY;
    normMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    normMouseY = (e.clientY / window.innerHeight) * 2 - 1;

    // Subtle parallax on the ancient temple stone background
    if (templeBg) {
        const moveX = -normMouseX * 14;
        const moveY = -normMouseY * 10;
        templeBg.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.04)`;
    }

    // Dynamic torchlight glow follows cursor smoothly
    if (torchGlow) {
        torchGlow.style.left = `${e.clientX}px`;
        torchGlow.style.top = `${e.clientY}px`;
    }
});

// 1. Constellation Star Nodes (Faint celestial geometry)
class StarNode {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = (Math.random() - 0.5) * 0.25;
        this.radius = Math.random() * 1.6 + 0.6;
        this.baseAlpha = Math.random() * 0.25 + 0.12;
        this.pulseSpeed = Math.random() * 0.002 + 0.001;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > window.innerWidth) this.vx *= -1;
        if (this.y < 0 || this.y > window.innerHeight) this.vy *= -1;
    }
    draw() {
        const pulse = Math.sin(Date.now() * this.pulseSpeed) * 0.12 + this.baseAlpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${pulse})`;
        ctx.fill();
    }
}

// 2. Sacred Flame Embers — Rising glowing sparks with organic turbulence
class FlameEmber {
    constructor(initialScattered = false) {
        this.reset(initialScattered);
    }
    reset(initialScattered = false) {
        this.x = Math.random() * window.innerWidth;
        this.y = initialScattered ? Math.random() * window.innerHeight : window.innerHeight + Math.random() * 40;
        this.size = Math.random() * 2.8 + 0.9;
        this.speedY = -(Math.random() * 1.2 + 0.5); // Upward convection
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.wobbleAmp = Math.random() * 25 + 8;
        this.wobbleFreq = Math.random() * 0.0025 + 0.001;
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.maxLife = Math.random() * 380 + 220;
        this.life = this.maxLife;
        this.colorType = Math.random(); // Variety of fire hues
    }
    update() {
        this.life--;
        this.wobblePhase += this.wobbleFreq * 16;
        this.x += this.speedX + Math.sin(this.wobblePhase) * 0.45;
        this.y += this.speedY;

        // Subtle heat attraction toward mouse cursor
        const dx = mouseCanvasX - this.x;
        const dy = mouseCanvasY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160 && dist > 10) {
            this.x += (dx / dist) * 0.35;
        }

        if (this.life <= 0 || this.y < -30) {
            this.reset(false);
        }
    }
    draw() {
        const progress = 1 - (this.life / this.maxLife);
        // Fade in quickly, then gently fade out
        let alpha = this.life < 50 ? (this.life / 50) : Math.min(1, (1 - progress) * 1.2);
        alpha = Math.max(0, Math.min(1, alpha * 0.85));

        const haloRadius = this.size * 3.5;
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, haloRadius);

        if (this.colorType > 0.5) {
            // Saffron Gold Ember
            glow.addColorStop(0, `rgba(255, 248, 220, ${alpha})`);
            glow.addColorStop(0.35, `rgba(245, 158, 11, ${alpha * 0.8})`);
            glow.addColorStop(0.8, `rgba(220, 38, 38, ${alpha * 0.25})`);
            glow.addColorStop(1, `rgba(180, 83, 9, 0)`);
        } else {
            // Deep Sacred Fire Ember
            glow.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
            glow.addColorStop(0.4, `rgba(217, 119, 6, ${alpha * 0.85})`);
            glow.addColorStop(0.85, `rgba(185, 28, 28, ${alpha * 0.3})`);
            glow.addColorStop(1, `rgba(120, 20, 20, 0)`);
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Incandescent core spark
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.6, this.size * 0.45), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 240, ${alpha * 0.95})`;
        ctx.fill();
    }
}

// 3. Soft Temple Bokeh Heat Orbs (Atmospheric out-of-focus Diya warmth)
class BokehOrb {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.radius = Math.random() * 22 + 12;
        this.vy = -(Math.random() * 0.25 + 0.08);
        this.vx = (Math.random() - 0.5) * 0.15;
        this.alpha = Math.random() * 0.06 + 0.025;
        this.hue = Math.random() > 0.4 ? 42 : 28; // Gold / Amber
    }
    update() {
        this.y += this.vy;
        this.x += this.vx;
        if (this.y < -50) this.y = window.innerHeight + 50;
        if (this.x < -50) this.x = window.innerWidth + 50;
        if (this.x > window.innerWidth + 50) this.x = -50;
    }
    draw() {
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, `hsla(${this.hue}, 90%, 55%, ${this.alpha})`);
        grad.addColorStop(0.6, `hsla(${this.hue}, 85%, 45%, ${this.alpha * 0.4})`);
        grad.addColorStop(1, `hsla(${this.hue}, 80%, 40%, 0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
    }
}

function initAtmosphere() {
    stars = [];
    embers = [];
    bokehOrbs = [];

    for (let i = 0; i < starCount; i++) stars.push(new StarNode());
    for (let i = 0; i < emberCount; i++) embers.push(new FlameEmber(true));
    for (let i = 0; i < bokehCount; i++) bokehOrbs.push(new BokehOrb());
}

function renderAtmosphere() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 1. Draw soft out-of-focus background heat orbs
    bokehOrbs.forEach(b => {
        b.update();
        b.draw();
    });

    // 2. Draw sacred star constellation connections
    for (let i = 0; i < stars.length; i++) {
        const s1 = stars[i];
        s1.update();
        s1.draw();

        for (let j = i + 1; j < stars.length; j++) {
            const s2 = stars[j];
            const dx = s1.x - s2.x;
            const dy = s1.y - s2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connectionDistance) {
                const alpha = (1 - dist / connectionDistance) * 0.08;
                ctx.beginPath();
                ctx.moveTo(s1.x, s1.y);
                ctx.lineTo(s2.x, s2.y);
                ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
                ctx.lineWidth = 0.6;
                ctx.stroke();
            }
        }

        // Connect star nodes to mouse cursor
        const dxM = s1.x - mouseCanvasX;
        const dyM = s1.y - mouseCanvasY;
        const distM = Math.sqrt(dxM * dxM + dyM * dyM);
        if (distM < 160) {
            const alphaM = (1 - distM / 160) * 0.16;
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(mouseCanvasX, mouseCanvasY);
            ctx.strokeStyle = `rgba(245, 158, 11, ${alphaM})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    }

    // 3. Draw rising sacred flame embers with radiant blend
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    embers.forEach(e => {
        e.update();
        e.draw();
    });
    ctx.restore();

    requestAnimationFrame(renderAtmosphere);
}

window.addEventListener('resize', () => {
    resize();
    initAtmosphere();
});
resize();
initAtmosphere();
renderAtmosphere();

// ============================================
// 3D HERO MANDALA — Sacred Geometry Sri Yantra
// ============================================
const heroContainer = document.getElementById('hero-3d-container');
if (heroContainer && typeof THREE !== 'undefined') {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    const size = Math.min(560, heroContainer.clientWidth || 500);
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    heroContainer.appendChild(renderer.domElement);

    // Sacred Mandala Master Group
    const mandalaGroup = new THREE.Group();
    scene.add(mandalaGroup);

    // 1. Inner Sacred Crystal (Icosahedron)
    const crystalGeo = new THREE.IcosahedronGeometry(1.6, 0);
    const crystalWireMat = new THREE.MeshBasicMaterial({
        color: 0xFBBF24,
        wireframe: true,
        transparent: true,
        opacity: 0.35
    });
    const crystalSolidMat = new THREE.MeshBasicMaterial({
        color: 0x9A3412,
        transparent: true,
        opacity: 0.12,
        wireframe: false
    });
    const crystalWire = new THREE.Mesh(crystalGeo, crystalWireMat);
    const crystalSolid = new THREE.Mesh(crystalGeo, crystalSolidMat);
    mandalaGroup.add(crystalWire);
    mandalaGroup.add(crystalSolid);

    // 2. Intermediate Sacred Octahedron
    const octaGeo = new THREE.OctahedronGeometry(2.4, 0);
    const octaMat = new THREE.MeshBasicMaterial({
        color: 0xD4AF37,
        wireframe: true,
        transparent: true,
        opacity: 0.25
    });
    const octaMesh = new THREE.Mesh(octaGeo, octaMat);
    mandalaGroup.add(octaMesh);

    // 3. Sacred Geometry Concentric Rings
    const ring1Geo = new THREE.TorusGeometry(3.1, 0.02, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({
        color: 0xF59E0B,
        transparent: true,
        opacity: 0.4
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 4;
    mandalaGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(3.8, 0.025, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({
        color: 0xD4AF37,
        transparent: true,
        opacity: 0.35
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 3;
    mandalaGroup.add(ring2);

    // 4. Orbiting Star Dust Constellation Points
    const particleCount = 140;
    const starCoords = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.cbrt(Math.random()) * 2.5 + 2.2;
        starCoords[i] = r * Math.sin(phi) * Math.cos(theta);
        starCoords[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        starCoords[i + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({
        color: 0xF3C64C,
        size: 0.065,
        transparent: true,
        opacity: 0.55
    });
    const starCloud = new THREE.Points(starGeo, starMat);
    mandalaGroup.add(starCloud);

    // Mouse Parallax Easing
    let targetRotX = 0;
    let targetRotY = 0;

    window.addEventListener('mousemove', (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        targetRotX = ny * 0.4;
        targetRotY = nx * 0.5;
    });

    function animate3D() {
        requestAnimationFrame(animate3D);

        // Gentle, regal continuous rotation
        crystalWire.rotation.x += 0.004;
        crystalWire.rotation.y += 0.006;
        crystalSolid.rotation.x += 0.004;
        crystalSolid.rotation.y += 0.006;

        octaMesh.rotation.y -= 0.005;
        octaMesh.rotation.z += 0.003;

        ring1.rotation.z += 0.004;
        ring2.rotation.z -= 0.003;
        starCloud.rotation.y += 0.002;

        // Smooth mouse orbit damping
        mandalaGroup.rotation.x += (targetRotX - mandalaGroup.rotation.x) * 0.05;
        mandalaGroup.rotation.y += (targetRotY - mandalaGroup.rotation.y) * 0.05;

        // Subtle breathing levitation
        mandalaGroup.position.y = Math.sin(Date.now() * 0.0015) * 0.15;

        renderer.render(scene, camera);
    }
    animate3D();

    window.addEventListener('resize', () => {
        if (!heroContainer) return;
        const newSize = Math.min(560, heroContainer.clientWidth || 500);
        renderer.setSize(newSize, newSize);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
    });
}

// Typing Effect — Updated roles for recruiter impact
const typingText = document.getElementById('typingText');
const texts = [
    'AI Engineer',
    'Generative AI Developer',
    'Agentic AI Builder',
    'LLM Applications',
    'Computer Vision Expert',
    'NLP Specialist'
];
let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
function type() {
    const currentText = texts[textIndex];
    if (isDeleting) {
        typingText.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typingText.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
    }
    let typeSpeed = isDeleting ? 40 : 80;
    if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2200;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        typeSpeed = 400;
    }

    setTimeout(type, typeSpeed);
}
type();

// Scroll Reveal Animation
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            const skillFills = entry.target.querySelectorAll('.skill-fill');
            skillFills.forEach(fill => fill.classList.add('active'));
        }
    });
}, { threshold: 0.1 });
revealElements.forEach(el => revealObserver.observe(el));

// 3D Tilt Effect for Cards
const tiltCards = document.querySelectorAll('.tilt-card');
tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 25;
        const rotateY = (centerX - x) / 25;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
});

// Sacred Ember Rain Effect (replaces Binary Rain)
const binaryContainer = document.getElementById('binaryRain');
const sacredSymbols = ['✦', '◆', '❖', '✧', '⟡', '◇', '⬡', '✶', '❋', '⊹'];
function createBinaryDrop() {
    const drop = document.createElement('div');
    drop.className = 'binary-rain';
    drop.textContent = sacredSymbols[Math.floor(Math.random() * sacredSymbols.length)];
    drop.style.left = Math.random() * 100 + '%';
    drop.style.animationDuration = (Math.random() * 4 + 3) + 's';
    drop.style.opacity = Math.random() * 0.3;
    drop.style.fontSize = Math.random() * 8 + 10 + 'px';
    binaryContainer.appendChild(drop);
    setTimeout(() => drop.remove(), 7000);
}
setInterval(createBinaryDrop, 200);

// Mobile Menu Toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('hidden');
}

// Close mobile menu when a link is clicked
document.querySelectorAll('#mobileMenu a').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.add('hidden');
    });
});

// Gold Dust Particle Trail Effect
document.addEventListener('mousemove', (e) => {
    if (Math.random() > 0.92) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = e.clientX + 'px';
        particle.style.top = e.clientY + 'px';
        // Randomize gold hues
        const goldHues = ['#D4AF37', '#FBBF24', '#F59E0B', '#C59B27'];
        particle.style.background = goldHues[Math.floor(Math.random() * goldHues.length)];
        document.body.appendChild(particle);
        gsap.to(particle, {
            opacity: 1,
            duration: 0.1,
            onComplete: () => {
                gsap.to(particle, {
                    opacity: 0,
                    y: e.clientY + 20,
                    duration: 0.5,
                    onComplete: () => particle.remove()
                });
            }
        });
    }
});

// Navbar Scroll Effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    const currentScroll = window.pageYOffset;
    if (currentScroll > 80) {
        navbar.style.background = 'rgba(21, 15, 10, 0.94)';
        navbar.style.borderBottom = '1px solid rgba(212, 175, 55, 0.08)';
    } else {
        navbar.style.background = 'transparent';
        navbar.style.borderBottom = 'none';
    }
    lastScroll = currentScroll;
});

// Initialize EmailJS
(function () {
    // Note: Replace "YOUR_PUBLIC_KEY" with your actual EmailJS public key
    if (typeof emailjs !== 'undefined') {
        emailjs.init({
            publicKey: "VICKYinxREoyl32r-",
        });
    }
})();

// Form Submit Handler for EmailJS
function handleSubmit(e) {
    e.preventDefault();
    const contactForm = e.target;

    // UI update
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Sending... ⏳';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';

    // Trigger visual effect
    if (typeof triggerMechaFlower === 'function') {
        triggerMechaFlower();
    }

    // Replace 'YOUR_SERVICE_ID' and 'YOUR_TEMPLATE_ID' with the actual EmailJS IDs
    emailjs.sendForm('service_6wy2r9p', 'template_ee9i7hl', contactForm)
        .then(() => {
            setTimeout(() => {
                alert('Message sent successfully! ✅');
                contactForm.reset();
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }, 600); // 600ms timeout to align with visual effect
        }, (error) => {
            alert('Failed to send message: ' + JSON.stringify(error));
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        });
}
