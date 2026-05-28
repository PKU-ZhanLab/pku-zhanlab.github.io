import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("brain-canvas");

setupHomeInteractions();

if (canvas) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.2, 7.4);

  const root = new THREE.Group();
  root.position.set(1.55, 0, 0);
  scene.add(root);

  const pointer = new THREE.Vector2(0, 0);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const brainPoints = createBrainPoints(460);
  const pointGeometry = new THREE.BufferGeometry().setFromPoints(brainPoints);
  const pointMaterial = new THREE.PointsMaterial({
    color: 0x151515,
    size: 0.028,
    transparent: true,
    opacity: 0.88,
    sizeAttenuation: true
  });
  root.add(new THREE.Points(pointGeometry, pointMaterial));

  const nodeGlowGeometry = new THREE.BufferGeometry().setFromPoints(brainPoints.filter((_, index) => index % 9 === 0));
  const nodeGlowMaterial = new THREE.PointsMaterial({
    color: 0xba232a,
    size: 0.052,
    transparent: true,
    opacity: 0.62,
    sizeAttenuation: true
  });
  root.add(new THREE.Points(nodeGlowGeometry, nodeGlowMaterial));

  const hubGeometry = new THREE.BufferGeometry().setFromPoints(brainPoints.filter(point => point.y > 0.18 && Math.abs(point.x) > 0.55).filter((_, index) => index % 7 === 0));
  const hubMaterial = new THREE.PointsMaterial({
    color: 0x147486,
    size: 0.064,
    transparent: true,
    opacity: 0.72,
    sizeAttenuation: true
  });
  root.add(new THREE.Points(hubGeometry, hubMaterial));

  const connectionGeometry = new THREE.BufferGeometry().setFromPoints(createConnections(brainPoints));
  const connectionMaterial = new THREE.LineBasicMaterial({
    color: 0x147486,
    transparent: true,
    opacity: 0.24
  });
  root.add(new THREE.LineSegments(connectionGeometry, connectionMaterial));

  const pulseGeometry = new THREE.BufferGeometry().setFromPoints(createPulsePath(brainPoints));
  const pulseMaterial = new THREE.LineBasicMaterial({
    color: 0xba232a,
    transparent: true,
    opacity: 0.82
  });
  const pulseLine = new THREE.Line(pulseGeometry, pulseMaterial);
  root.add(pulseLine);

  const particlePoints = createParticleField(340);
  const particleGeometry = new THREE.BufferGeometry().setFromPoints(particlePoints);
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x8f8a7f,
    size: 0.018,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(3, 4, 5);
  scene.add(light);

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    root.position.x = width < 900 ? 0.36 : 1.55;
    root.scale.setScalar(width < 900 ? 0.78 : 1);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", event => {
    pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  });

  resize();

  let frame = 0;
  function animate() {
    frame += 0.01;

    const targetY = pointer.x * 0.18;
    const targetX = pointer.y * 0.08;
    root.rotation.y += (targetY + Math.sin(frame * 0.65) * 0.05 - root.rotation.y) * 0.035;
    root.rotation.x += (targetX + Math.cos(frame * 0.48) * 0.025 - root.rotation.x) * 0.035;
    pulseLine.rotation.z = Math.sin(frame * 1.4) * 0.05;
    pulseMaterial.opacity = reducedMotion ? 0.5 : 0.36 + Math.abs(Math.sin(frame * 3.2)) * 0.48;
    const breath = reducedMotion ? 1 : 1 + Math.sin(frame * 0.9) * 0.012;
    root.scale.setScalar((window.innerWidth < 900 ? 0.78 : 1) * breath);
    particles.rotation.y += reducedMotion ? 0 : 0.0009;
    particles.rotation.x += reducedMotion ? 0 : 0.0003;

    renderer.render(scene, camera);
    document.body.classList.add("canvas-ready");

    if (!reducedMotion) {
      requestAnimationFrame(animate);
    }
  }

  animate();
}

function setupHomeInteractions() {
  document.body.classList.add("motion-ready");
  const cursorGlow = document.querySelector(".cursor-glow");

  const updateScrollState = () => {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    document.body.classList.toggle("is-scrolled", window.scrollY > 8);
    document.documentElement.style.setProperty("--scroll-progress", String(window.scrollY / scrollable));
  };

  updateScrollState();
  window.addEventListener("scroll", updateScrollState, { passive: true });

  if (cursorGlow && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", event => {
      document.body.classList.add("has-pointer");
      cursorGlow.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
    }, { passive: true });
  }

  const revealTargets = document.querySelectorAll(".section-band, .question-item, .principle-item, .direction-card, .work-card, .home-cta");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px"
  });

  revealTargets.forEach(target => observer.observe(target));

  document.querySelectorAll(".direction-card, .work-card, .principle-item").forEach(card => {
    card.addEventListener("pointermove", event => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${x}%`);
      card.style.setProperty("--my", `${y}%`);
    });
  });

  document.querySelectorAll(".button-primary, .button-secondary").forEach(button => {
    button.addEventListener("pointermove", event => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.18;
      button.style.transform = `translate(${x}px, ${y}px)`;
    });
    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });

  setupLensControls();
  setupSectionRail();
}

function setupLensControls() {
  const data = {
    perception: {
      title: "Perception as structured inference",
      text: "We model how humans recover objects, scenes, social signals, and hidden causes from sparse sensory evidence."
    },
    brain: {
      title: "Neural dynamics as computation",
      text: "We track how representational states evolve across milliseconds and connect those dynamics to interpretable algorithms."
    },
    agents: {
      title: "Agency as value-guided planning",
      text: "We study how goals, evidence, social meaning, and human values can shape autonomous behavior over time."
    }
  };

  const title = document.getElementById("lens-title");
  const text = document.getElementById("lens-text");
  const buttons = document.querySelectorAll(".lens-controls button");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const lens = data[button.dataset.lens];
      if (!lens || !title || !text) return;

      buttons.forEach(item => {
        item.classList.toggle("is-active", item === button);
        item.setAttribute("aria-selected", item === button ? "true" : "false");
      });

      title.textContent = lens.title;
      text.textContent = lens.text;
    });
  });
}

function setupSectionRail() {
  const links = Array.from(document.querySelectorAll(".page-rail a"));
  const sections = links
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!links.length || !sections.length) return;

  const railObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(link => {
          link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      }
    });
  }, {
    threshold: 0.32,
    rootMargin: "-18% 0px -48% 0px"
  });

  sections.forEach(section => railObserver.observe(section));
}

function createPulsePath(points) {
  return points
    .filter(point => point.y > -0.15 && point.z > -0.5)
    .sort((a, b) => a.x - b.x)
    .filter((_, index) => index % 9 === 0)
    .slice(0, 42);
}

function createBrainPoints(count) {
  const points = [];

  for (let i = 0; i < count; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radial = 0.78 + Math.random() * 0.26;

    const localX = Math.abs(Math.sin(phi) * Math.cos(theta));
    const localY = Math.cos(phi);
    const localZ = Math.sin(phi) * Math.sin(theta);

    const fold = 0.075 * Math.sin(theta * 7 + localY * 5) + 0.045 * Math.cos(theta * 11);
    const x = side * (0.18 + localX * 1.02 * radial);
    const y = localY * (0.92 - localX * 0.1) * radial + fold;
    const z = localZ * (0.72 + localX * 0.08) * radial + fold * 0.55;

    points.push(new THREE.Vector3(x * 1.45, y * 1.36, z * 1.42));
  }

  return points;
}

function createConnections(points) {
  const lines = [];
  const maxDistance = 0.52;

  for (let i = 0; i < points.length; i += 1) {
    let linked = 0;

    for (let j = i + 1; j < points.length && linked < 3; j += 1) {
      const distance = points[i].distanceTo(points[j]);
      const sameHemisphere = Math.sign(points[i].x) === Math.sign(points[j].x);

      if (sameHemisphere && distance < maxDistance && Math.random() > 0.54) {
        lines.push(points[i], points[j]);
        linked += 1;
      }
    }
  }

  return lines;
}

function createParticleField(count) {
  const points = [];

  for (let i = 0; i < count; i += 1) {
    points.push(new THREE.Vector3(
      (Math.random() - 0.5) * 11,
      (Math.random() - 0.5) * 6.2,
      -1.8 - Math.random() * 3.8
    ));
  }

  return points;
}
