// Initialize GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Custom Cursor
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

// Royal Flower Transition Effect
function triggerMechaFlower(targetId) {
    const container = document.getElementById('mechaFlower');
    container.innerHTML = '';

    // Create the royal flower structure
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

// Neural Network Background
const canvas = document.getElementById('neural-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];
const particleCount = 70;
const connectionDistance = 140;

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
        ctx.fillStyle = 'rgba(0, 212, 255, 0.45)';
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) particles.push(new Particle());
}

function animateParticles() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p, i) => {
        p.update();
        p.draw();
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connectionDistance) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(0, 212, 255, ${0.15 * (1 - dist / connectionDistance)})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    });
    requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', () => { resize(); initParticles(); });
resize();
initParticles();
animateParticles();

// 3D Hero Scene with Three.js
const heroContainer = document.getElementById('hero-3d-container');
if (heroContainer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(600, 600);
    heroContainer.appendChild(renderer.domElement);
    const geometries = [
        new THREE.IcosahedronGeometry(2, 0),
        new THREE.OctahedronGeometry(1.5, 0),
        new THREE.TetrahedronGeometry(1.8, 0)
    ];
    const materials = [
        new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.25 }),
        new THREE.MeshBasicMaterial({ color: 0x7c3aed, wireframe: true, transparent: true, opacity: 0.25 }),
        new THREE.MeshBasicMaterial({ color: 0xf472b6, wireframe: true, transparent: true, opacity: 0.25 })
    ];
    const meshes = [];
    geometries.forEach((geo, i) => {
        const mesh = new THREE.Mesh(geo, materials[i]);
        mesh.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        scene.add(mesh);
        meshes.push(mesh);
    });
    camera.position.z = 8;
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    function animate3D() {
        requestAnimationFrame(animate3D);
        meshes.forEach((mesh, i) => {
            mesh.rotation.x += 0.004 * (i + 1);
            mesh.rotation.y += 0.004 * (i + 1);
            mesh.position.y += Math.sin(Date.now() * 0.001 + i) * 0.008;
        });
        camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
        camera.position.y += (mouseY * 2 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }
    animate3D();
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

// Binary Rain Effect
const binaryContainer = document.getElementById('binaryRain');
function createBinaryDrop() {
    const drop = document.createElement('div');
    drop.className = 'binary-rain';
    drop.textContent = Math.random() > 0.5 ? '1' : '0';
    drop.style.left = Math.random() * 100 + '%';
    drop.style.animationDuration = (Math.random() * 3 + 2) + 's';
    drop.style.opacity = Math.random() * 0.4;
    binaryContainer.appendChild(drop);
    setTimeout(() => drop.remove(), 5000);
}
setInterval(createBinaryDrop, 120);

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

// Particle Trail Effect
document.addEventListener('mousemove', (e) => {
    if (Math.random() > 0.92) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = e.clientX + 'px';
        particle.style.top = e.clientY + 'px';
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
        navbar.style.background = 'rgba(17, 17, 24, 0.92)';
        navbar.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
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
