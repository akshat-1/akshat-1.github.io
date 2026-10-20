import * as THREE from 'three';
import { portfolio } from './data/portfolio.js';
import { createRoboticsLab } from './experiments/robotics.js';
import { createNeuralLab } from './experiments/neural.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function renderContent() {
    document.querySelector('[data-education]').innerHTML = portfolio.education.map((item) => `
        <article class="education-item reveal"><div class="item-period">${escapeHtml(item.period)}</div><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.org)}</p><span>${escapeHtml(item.detail)}</span></div></article>
    `).join('');
    document.querySelector('[data-achievements]').innerHTML = portfolio.achievements.map((item, index) => `<p class="achievement"><span>0${index + 1}</span>${escapeHtml(item)}</p>`).join('');

    document.querySelector('[data-experience]').innerHTML = portfolio.experience.map((item) => `
        <a class="experience-card experience-card-link reveal" href="./experience.html?role=${encodeURIComponent(item.slug)}" target="_blank" rel="noopener"><div class="experience-number">${escapeHtml(item.accent)}</div><div class="experience-main"><div class="card-topline"><span>${escapeHtml(item.period)}</span><span class="card-status">VIEW CASE FILE ↗</span></div><h3>${escapeHtml(item.company)}</h3><p class="experience-role">${escapeHtml(item.role)}</p><p class="experience-summary">${escapeHtml(item.summary)}</p><ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul><div class="tag-row">${item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div></a>
    `).join('');

    document.querySelector('[data-current-copy]').innerHTML = `<p class="micro-label">${escapeHtml(portfolio.current.label)}</p><p class="current-statement">${escapeHtml(portfolio.current.title)}</p><p class="current-note">${escapeHtml(portfolio.current.copy)}<br><br>${escapeHtml(portfolio.current.detail)}</p>`;
    document.querySelector('[data-current-focus]').innerHTML = portfolio.current.focus.map((item, index) => `<div class="focus-item"><span>0${index + 1}</span><strong>${escapeHtml(item)}</strong><i>↗</i></div>`).join('');

    document.querySelector('[data-projects]').innerHTML = portfolio.projects.map((project) => `
        <article class="project-card reveal" data-project-scene="${escapeHtml(project.scene)}"><div class="project-card-top"><span>${escapeHtml(project.number)}</span><span>${escapeHtml(project.type)}</span></div><div class="project-card-body"><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}</p><div class="project-result">${escapeHtml(project.result)}</div><div class="tag-row">${project.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div></article>
    `).join('');

    document.querySelector('[data-leadership]').innerHTML = portfolio.leadership.map((item) => `
        <article class="leadership-item reveal"><div class="leadership-marker"><span>${escapeHtml(item.metric)}</span></div><div class="leadership-copy"><p class="item-period">${escapeHtml(item.period)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail)}</p></div></article>
    `).join('');

    document.querySelector('[data-skills]').innerHTML = Object.entries(portfolio.skills).map(([group, items], index) => `<div class="skill-group reveal"><div class="skill-group-title"><span>0${index + 1}</span><h3>${escapeHtml(group)}</h3></div><div class="skill-tags">${items.map((skill) => `<span>${escapeHtml(skill)}</span>`).join('')}</div></div>`).join('');
    document.querySelector('[data-coursework]').innerHTML = portfolio.coursework.map((item) => `<span>${escapeHtml(item.code)} <b>${escapeHtml(item.title)}</b></span>`).join('');
    document.querySelector('[data-awards]').innerHTML = portfolio.awards.map((item, index) => `<article class="award-item"><span>0${index + 1}</span><p>${escapeHtml(item)}</p></article>`).join('');
}

function makeAmbientScene(root, type) {
    const canvas = document.createElement('canvas');
    canvas.className = 'ambient-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    root.appendChild(canvas);
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
        root.classList.add('scene-fallback');
        root.insertAdjacentHTML('beforeend', '<span class="scene-fallback-label">3D visual paused · WebGL unavailable</span>');
        return () => {};
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0x000000, 0);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);
    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0x99b8ff, 1.7));
    const light = new THREE.PointLight(0x62eed1, 3.5, 14);
    light.position.set(2, 2, 3);
    scene.add(light);
    const secondary = new THREE.PointLight(0x927aff, 2.5, 12);
    secondary.position.set(-3, -1, 2);
    scene.add(secondary);
    const cyan = new THREE.MeshBasicMaterial({ color: 0x62eed1, transparent: true, opacity: 0.78 });
    const violet = new THREE.MeshBasicMaterial({ color: 0x927aff, transparent: true, opacity: 0.7 });
    const blue = new THREE.MeshBasicMaterial({ color: 0x6ba2ff, transparent: true, opacity: 0.55 });
    const muted = new THREE.MeshBasicMaterial({ color: 0x415984, transparent: true, opacity: 0.35 });
    const geometries = [];
    const add = (mesh) => { mesh.userData.baseY = mesh.position.y; group.add(mesh); geometries.push(mesh); return mesh; };

    if (type === 'hero') {
        add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 2), new THREE.MeshBasicMaterial({ color: 0x62eed1, wireframe: true, transparent: true, opacity: 0.32 })));
        add(new THREE.Mesh(new THREE.TorusGeometry(2, 0.012, 8, 96), cyan)).rotation.set(0.7, 0.25, 0);
        add(new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.009, 8, 96), violet)).rotation.set(-0.45, 0.5, 0.4);
        for (let i = 0; i < 30; i += 1) { const point = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.035, 8, 8), i % 3 ? blue : cyan); point.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 2); add(point); }
    } else if (type === 'education') {
        for (let i = 0; i < 6; i += 1) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45 + i * 0.28, 0.018, 8, 48), i % 2 ? violet : cyan); ring.rotation.set(Math.PI / 2 + i * 0.12, i * 0.28, i * 0.2); ring.position.x = (i - 2.5) * 0.55; add(ring); }
        add(new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), blue));
    } else if (type === 'experience') {
        const nodes = [];
        for (let i = 0; i < 12; i += 1) { const node = new THREE.Mesh(new THREE.SphereGeometry(0.075 + (i % 3) * 0.025, 10, 10), i % 3 ? blue : cyan); node.position.set((i % 4 - 1.5) * 0.85, (Math.floor(i / 4) - 1) * 0.72, (i % 2) * 0.25); add(node); nodes.push(node); }
        for (let i = 0; i < nodes.length - 1; i += 1) { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([nodes[i].position, nodes[i + 1].position]), new THREE.LineBasicMaterial({ color: i % 2 ? 0x927aff : 0x62eed1, transparent: true, opacity: 0.5 })); add(line); }
    } else if (type === 'projects') {
        add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), new THREE.MeshBasicMaterial({ color: 0x62eed1, wireframe: true, transparent: true, opacity: 0.2 })));
        add(new THREE.Mesh(new THREE.TorusKnotGeometry(1.15, 0.06, 96, 12), violet));
        add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), cyan));
    } else if (type === 'leadership') {
        add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 20), cyan));
        for (let i = 0; i < 9; i += 1) { const angle = (i / 9) * Math.PI * 2; const node = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), i % 2 ? blue : violet); node.position.set(Math.cos(angle) * 1.65, Math.sin(angle) * 1.05, Math.sin(angle * 2) * 0.35); add(node); const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), node.position]), new THREE.LineBasicMaterial({ color: 0x62eed1, transparent: true, opacity: 0.35 })); add(line); }
    } else if (type === 'skills') {
        for (let i = 0; i < 18; i += 1) { const angle = (i / 18) * Math.PI * 2; const node = new THREE.Mesh(new THREE.IcosahedronGeometry(i % 4 === 0 ? 0.18 : 0.09, 1), i % 3 === 0 ? cyan : i % 3 === 1 ? violet : blue); node.position.set(Math.cos(angle) * (1.2 + (i % 2) * 0.5), Math.sin(angle) * (0.75 + (i % 3) * 0.18), Math.sin(angle * 3) * 0.4); add(node); }
    } else if (type === 'awards') {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.22, 48), violet));
        add(new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.035, 10, 64), cyan));
        add(new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({ color: 0xffc96b, wireframe: true, transparent: true, opacity: 0.8 })));
    } else {
        add(new THREE.Mesh(new THREE.TorusKnotGeometry(1.25, 0.055, 100, 10), cyan));
        add(new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.012, 8, 80), violet)).rotation.x = Math.PI / 2;
        for (let i = 0; i < 10; i += 1) { const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), muted); dot.position.set((Math.random() - 0.5) * 4.3, (Math.random() - 0.5) * 1.8, -0.4 + Math.random() * 0.8); add(dot); }
    }

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event) => {
        const rect = root.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
            pointer.x += (0 - pointer.x) * 0.08;
            pointer.y += (0 - pointer.y) * 0.08;
            return;
        }
        pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
        pointer.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    let width = 0; let height = 0;
    const resize = () => { width = Math.max(root.clientWidth, 320); height = Math.max(root.clientHeight, 180); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(root);
    else window.addEventListener('resize', resize, { passive: true });
    resize();
    let active = true; let frameId = 0; const clock = new THREE.Clock();
    const render = () => { if (!active) return; const elapsed = clock.getElapsedTime(); if (!reduceMotion) { group.rotation.y += 0.0022; group.rotation.x += 0.0005; } group.rotation.y += (pointer.x * 0.1 - group.rotation.y) * 0.008; group.rotation.x += (-pointer.y * 0.07 - group.rotation.x) * 0.008; group.position.x += (pointer.x * 0.075 - group.position.x) * 0.025; group.position.y += (-pointer.y * 0.045 - group.position.y) * 0.025; light.position.x += (2 + pointer.x * 1.5 - light.position.x) * 0.03; light.position.y += (2 - pointer.y * 1.1 - light.position.y) * 0.03; geometries.forEach((mesh, index) => { if (mesh.isMesh) mesh.position.y = mesh.userData.baseY + Math.sin(elapsed * 0.7 + index) * (reduceMotion ? 0 : 0.00035); }); renderer.render(scene, camera); frameId = requestAnimationFrame(render); };
    const visibilityObserver = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => { active = entries[0].isIntersecting; if (active && !frameId) render(); if (!active && frameId) { cancelAnimationFrame(frameId); frameId = 0; } }, { threshold: 0.05 }) : null;
    if (visibilityObserver) visibilityObserver.observe(root);
    render();
    return () => { active = false; cancelAnimationFrame(frameId); visibilityObserver?.disconnect(); resizeObserver?.disconnect(); if (!resizeObserver) window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onPointerMove); geometries.forEach((mesh) => { mesh.geometry?.dispose(); if (mesh.material) mesh.material.dispose(); }); renderer.dispose(); };
}

function setupInteractions() {
    const header = document.querySelector('[data-header]');
    const progress = document.querySelector('[data-scroll-progress]');
    const onScroll = () => { header.classList.toggle('is-scrolled', window.scrollY > 24); const max = document.documentElement.scrollHeight - window.innerHeight; progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`; };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    const menuToggle = document.querySelector('[data-menu-toggle]'); const mobileMenu = document.querySelector('[data-mobile-menu]');
    menuToggle.addEventListener('click', () => { const open = menuToggle.getAttribute('aria-expanded') === 'true'; menuToggle.setAttribute('aria-expanded', String(!open)); mobileMenu.classList.toggle('is-open', !open); });
    mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { menuToggle.setAttribute('aria-expanded', 'false'); mobileMenu.classList.remove('is-open'); }));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
    const copyButton = document.querySelector('[data-copy-email]'); const toast = document.querySelector('[data-toast]');
    copyButton.addEventListener('click', async () => { try { await navigator.clipboard.writeText(portfolio.profile.email); toast.textContent = 'Email copied to clipboard'; toast.classList.add('is-visible'); setTimeout(() => toast.classList.remove('is-visible'), 2400); } catch { window.location.href = `mailto:${portfolio.profile.email}`; } });
}

function init() {
    renderContent(); setupInteractions();
    document.querySelectorAll('[data-ambient-scene]').forEach((root) => makeAmbientScene(root, root.dataset.ambientScene));
    createRoboticsLab(document.querySelector('#robotics-root'));
    createNeuralLab(document.querySelector('#neural-root'));
}

init();
