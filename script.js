// ---------------------------------------------------------------
// Config
// ---------------------------------------------------------------
const CONFIG = {
    // EmailJS public key / IDs are designed to be public; restrict them
    // to your domain in the EmailJS dashboard to prevent abuse.
    emailjs: {
        publicKey: 'VICKYinxREoyl32r-',
        serviceId: 'service_6wy2r9p',
        templateId: 'template_ee9i7hl'
    },
    form: { cooldownMs: 30000, minMessageLength: 10 },
    // Kept sparse and faint so the hero city stays the focal point
    neural: { particleCount: window.innerWidth < 768 ? 22 : 42, connectionDistance: 120 },
    binaryRain: { intervalMs: 160, maxDrops: 24, lifetimeMs: 5000 },
    trail: { chance: 0.08, maxParticles: 25 },
    typing: { typeSpeed: 80, deleteSpeed: 40, holdMs: 2200, pauseMs: 400 },
    flowerMs: 800
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

// ---------------------------------------------------------------
// Custom Cursor (only while mouse is in use; keyboard users get the native cursor)
// ---------------------------------------------------------------
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

if (cursorDot && cursorOutline && hasFinePointer) {
    window.addEventListener('mousemove', (e) => {
        document.body.classList.add('custom-cursor-active');
        const posX = e.clientX;
        const posY = e.clientY;
        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;
        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: 'forwards' });
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') document.body.classList.remove('custom-cursor-active');
    });

    document.querySelectorAll('a, button, .tilt-card, .focus-chip, .skill-tag, .cert-card, .social-link').forEach(el => {
        el.addEventListener('mouseenter', () => cursorOutline.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursorOutline.classList.remove('hover'));
    });
}

// ---------------------------------------------------------------
// Royal Flower Transition Effect
// ---------------------------------------------------------------
let flowerBusy = false;

function triggerMechaFlower(targetId) {
    const container = document.getElementById('mechaFlower');
    if (!container) {
        const el = targetId && document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    if (flowerBusy) return;
    flowerBusy = true;
    container.innerHTML = '';

    const spinner = document.createElement('div');
    spinner.className = 'royal-flower-spinner';

    const flower = document.createElement('div');
    flower.className = 'royal-flower';

    for (let i = 0; i < 8; i++) {
        const petal = document.createElement('div');
        petal.className = 'royal-petal';
        flower.appendChild(petal);
    }

    spinner.appendChild(flower);
    container.appendChild(spinner);

    requestAnimationFrame(() => {
        container.classList.add('active');
        flower.classList.add('active');
    });

    setTimeout(() => {
        if (targetId) {
            const element = document.getElementById(targetId);
            if (element) element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }

        flower.classList.remove('active');
        flower.style.transform = 'scale(0.5) rotate(180deg)';
        flower.style.opacity = '0';
        container.classList.remove('active');

        setTimeout(() => {
            container.innerHTML = '';
            flowerBusy = false;
        }, CONFIG.flowerMs);
    }, CONFIG.flowerMs);
}

// ---------------------------------------------------------------
// Neural Network Background (paused when tab is hidden)
// ---------------------------------------------------------------
const canvas = document.getElementById('neural-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let width, height;
let particles = [];
let neuralRunning = false;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 2 + 0.5;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(229, 181, 46, 0.32)';
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < CONFIG.neural.particleCount; i++) particles.push(new Particle());
}

function animateParticles() {
    if (!neuralRunning) return;
    const maxDist = CONFIG.neural.connectionDistance;
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p, i) => {
        p.update();
        p.draw();
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(229, 181, 46, ${0.07 * (1 - dist / maxDist)})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    });
    requestAnimationFrame(animateParticles);
}

function setNeuralRunning(run) {
    if (!ctx || run === neuralRunning) return;
    neuralRunning = run;
    if (run) animateParticles();
}

if (canvas && ctx) {
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { resize(); initParticles(); }, 150);
    });
    resize();
    initParticles();
    if (prefersReducedMotion) {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => p.draw());
    } else {
        setNeuralRunning(true);
    }
}

// The hero 3D centerpiece ("The Golden City") lives in hero-city.js

// Pause background animations while the tab is hidden
document.addEventListener('visibilitychange', () => {
    if (!prefersReducedMotion) setNeuralRunning(!document.hidden);
});

// ---------------------------------------------------------------
// Typing Effect
// ---------------------------------------------------------------
const typingText = document.getElementById('typingText');
const texts = [
    'AI/ML Engineer',
    'Generative AI Developer',
    'LLM Applications',
    'RAG Systems',
    'Computer Vision Expert',
    'NLP Specialist'
];

if (typingText) {
    if (prefersReducedMotion) {
        typingText.textContent = texts[0];
    } else {
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        const type = () => {
            const currentText = texts[textIndex];
            charIndex += isDeleting ? -1 : 1;
            typingText.textContent = currentText.substring(0, charIndex);

            let delay = isDeleting ? CONFIG.typing.deleteSpeed : CONFIG.typing.typeSpeed;
            if (!isDeleting && charIndex === currentText.length) {
                delay = CONFIG.typing.holdMs;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
                delay = CONFIG.typing.pauseMs;
            }
            setTimeout(type, delay);
        };
        type();
    }
}

// ---------------------------------------------------------------
// Scroll Reveal Animation
// ---------------------------------------------------------------
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            entry.target.querySelectorAll('.skill-fill').forEach(fill => fill.classList.add('active'));
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ---------------------------------------------------------------
// 3D Tilt Effect for Cards
// ---------------------------------------------------------------
if (hasFinePointer && !prefersReducedMotion) {
    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const rotateX = (e.clientY - rect.top - rect.height / 2) / 25;
            const rotateY = (rect.width / 2 - (e.clientX - rect.left)) / 25;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        });
    });
}

// ---------------------------------------------------------------
// Binary Rain Effect (capped, paused when tab hidden)
// ---------------------------------------------------------------
const binaryContainer = document.getElementById('binaryRain');
if (binaryContainer && !prefersReducedMotion) {
    setInterval(() => {
        if (document.hidden || binaryContainer.childElementCount >= CONFIG.binaryRain.maxDrops) return;
        const drop = document.createElement('div');
        drop.className = 'binary-rain';
        drop.textContent = Math.random() > 0.5 ? '1' : '0';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (Math.random() * 3 + 2) + 's';
        drop.style.opacity = Math.random() * 0.4;
        binaryContainer.appendChild(drop);
        setTimeout(() => drop.remove(), CONFIG.binaryRain.lifetimeMs);
    }, CONFIG.binaryRain.intervalMs);
}

// ---------------------------------------------------------------
// Mobile Menu
// ---------------------------------------------------------------
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');

function setMobileMenu(open) {
    if (!mobileMenu) return;
    mobileMenu.classList.toggle('hidden', !open);
    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', String(open));
}

function toggleMobileMenu() {
    setMobileMenu(mobileMenu.classList.contains('hidden'));
}

if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setMobileMenu(false));
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMobileMenu(false);
    });
}

// ---------------------------------------------------------------
// Particle Trail Effect (capped)
// ---------------------------------------------------------------
if (hasFinePointer && !prefersReducedMotion && typeof gsap !== 'undefined') {
    let activeTrail = 0;
    document.addEventListener('mousemove', (e) => {
        if (Math.random() > CONFIG.trail.chance || activeTrail >= CONFIG.trail.maxParticles) return;
        activeTrail++;
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = e.clientX + 'px';
        particle.style.top = e.clientY + 'px';
        document.body.appendChild(particle);
        gsap.timeline({
            onComplete: () => { particle.remove(); activeTrail--; }
        })
            .to(particle, { opacity: 1, duration: 0.1 })
            .to(particle, { opacity: 0, y: 20, duration: 0.5 });
    });
}

// ---------------------------------------------------------------
// Navbar Scroll Effect (class toggle, rAF-throttled)
// ---------------------------------------------------------------
const navbar = document.getElementById('navbar');
if (navbar) {
    let ticking = false;
    const updateNavbar = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 80);
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(updateNavbar);
        }
    }, { passive: true });
    updateNavbar();
}

// ---------------------------------------------------------------
// Contact Form (EmailJS) with validation, inline status and cooldown
// ---------------------------------------------------------------
if (typeof emailjs !== 'undefined') {
    emailjs.init({ publicKey: CONFIG.emailjs.publicKey });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setFieldError(input, message) {
    const id = `${input.id}-error`;
    let err = document.getElementById(id);
    if (message) {
        if (!err) {
            err = document.createElement('span');
            err.id = id;
            err.className = 'field-error';
            input.insertAdjacentElement('afterend', err);
        }
        err.textContent = message;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', id);
    } else {
        if (err) err.remove();
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
    }
}

function validateForm(form) {
    const fields = {
        name: form.elements.name,
        email: form.elements.email,
        subject: form.elements.subject,
        message: form.elements.message
    };
    let firstInvalid = null;
    const check = (input, msg) => {
        setFieldError(input, msg);
        if (msg && !firstInvalid) firstInvalid = input;
    };

    check(fields.name, fields.name.value.trim() ? '' : 'Please enter your name.');
    check(fields.email, EMAIL_RE.test(fields.email.value.trim()) ? '' : 'Please enter a valid email address.');
    check(fields.subject, fields.subject.value.trim() ? '' : 'Please enter a subject.');
    check(fields.message, fields.message.value.trim().length >= CONFIG.form.minMessageLength
        ? '' : `Message should be at least ${CONFIG.form.minMessageLength} characters.`);

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
}

function showFormStatus(type, text) {
    const status = document.getElementById('form-status');
    if (!status) return;
    status.className = `form-status ${type}`;
    status.textContent = text;
}

let lastSubmitAt = 0;

function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (typeof emailjs === 'undefined') {
        showFormStatus('error', 'Email service failed to load. Please email me directly.');
        return;
    }
    if (!validateForm(form)) {
        showFormStatus('error', 'Please fix the highlighted fields.');
        return;
    }
    const wait = CONFIG.form.cooldownMs - (Date.now() - lastSubmitAt);
    if (wait > 0) {
        showFormStatus('error', `Please wait ${Math.ceil(wait / 1000)}s before sending another message.`);
        return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Sending... ⏳';
    submitBtn.disabled = true;
    showFormStatus('', 'Sending your message...');
    triggerMechaFlower();

    emailjs.sendForm(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateId, form)
        .then(() => {
            lastSubmitAt = Date.now();
            form.reset();
            showFormStatus('success', 'Message sent successfully! ✅ I will get back to you soon.');
        })
        .catch((error) => {
            console.error('EmailJS error:', error);
            showFormStatus('error', 'Could not send your message. Please check your connection and try again.');
        })
        .finally(() => {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
}
