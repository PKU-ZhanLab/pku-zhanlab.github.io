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

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 0.1;
  const pointerNdc = new THREE.Vector2();
  const targetRotation = new THREE.Vector2(0, 0);
  const dragState = {
    active: false,
    moved: false,
    x: 0,
    y: 0
  };
  const firingEvents = [];

  const brainPoints = createBrainPoints(460);
  const pointGeometry = new THREE.BufferGeometry().setFromPoints(brainPoints);
  const pointMaterial = new THREE.PointsMaterial({
    color: 0x151515,
    size: 0.028,
    transparent: true,
    opacity: 0.88,
    sizeAttenuation: true
  });
  const brainPointCloud = new THREE.Points(pointGeometry, pointMaterial);
  root.add(brainPointCloud);

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

  const connectionPairs = createConnections(brainPoints);
  const adjacency = createAdjacency(brainPoints.length, connectionPairs, brainPoints);
  const connectionGeometry = new THREE.BufferGeometry().setFromPoints(connectionPairs.flatMap(([from, to]) => [
    brainPoints[from],
    brainPoints[to]
  ]));
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
  canvas.addEventListener("pointerdown", event => {
    dragState.active = true;
    dragState.moved = false;
    dragState.x = event.clientX;
    dragState.y = event.clientY;
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", event => {
    if (!dragState.active) return;

    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      dragState.moved = true;
    }

    targetRotation.y += dx * 0.006;
    targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + dy * 0.004, -0.72, 0.72);
    dragState.x = event.clientX;
    dragState.y = event.clientY;
  });

  canvas.addEventListener("pointerup", event => {
    canvas.classList.remove("is-dragging");
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (dragState.active && !dragState.moved) {
      triggerFiring(event);
    }
    dragState.active = false;
  });

  canvas.addEventListener("pointercancel", () => {
    dragState.active = false;
    canvas.classList.remove("is-dragging");
  });

  resize();

  let frame = 0;
  function animate() {
    frame += 0.01;

    const idleY = reducedMotion || dragState.active ? 0 : Math.sin(frame * 0.38) * 0.035;
    const idleX = reducedMotion || dragState.active ? 0 : Math.cos(frame * 0.31) * 0.018;
    root.rotation.y += (targetRotation.y + idleY - root.rotation.y) * 0.055;
    root.rotation.x += (targetRotation.x + idleX - root.rotation.x) * 0.055;
    pulseLine.rotation.z = Math.sin(frame * 1.4) * 0.05;
    pulseMaterial.opacity = reducedMotion ? 0.5 : 0.36 + Math.abs(Math.sin(frame * 3.2)) * 0.48;
    const breath = reducedMotion ? 1 : 1 + Math.sin(frame * 0.9) * 0.012;
    root.scale.setScalar((window.innerWidth < 900 ? 0.78 : 1) * breath);
    updateFiringEvents(firingEvents);
    particles.rotation.y += reducedMotion ? 0 : 0.0009;
    particles.rotation.x += reducedMotion ? 0 : 0.0003;

    renderer.render(scene, camera);
    document.body.classList.add("canvas-ready");

    if (!reducedMotion) {
      requestAnimationFrame(animate);
    }
  }

  animate();

  function triggerFiring(event) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);

    const [hit] = raycaster.intersectObject(brainPointCloud);
    if (!hit || hit.index === undefined) {
      const nearest = findNearestProjectedPoint(event, rect, brainPoints, root, camera);
      if (nearest !== null) {
        createFiringEvent(nearest, brainPoints, adjacency, root, firingEvents);
      }
      return;
    }

    createFiringEvent(hit.index, brainPoints, adjacency, root, firingEvents);
  }
}

function findNearestProjectedPoint(event, rect, points, root, camera) {
  const projected = new THREE.Vector3();
  let nearest = null;
  let nearestDistance = 56;

  points.forEach((point, index) => {
    projected.copy(point).applyMatrix4(root.matrixWorld).project(camera);
    if (projected.z < -1 || projected.z > 1) return;

    const x = ((projected.x + 1) / 2) * rect.width + rect.left;
    const y = ((1 - projected.y) / 2) * rect.height + rect.top;
    const distance = Math.hypot(event.clientX - x, event.clientY - y);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });

  return nearest;
}

function setupHomeInteractions() {
  document.body.classList.add("motion-ready");

  const updateScrollState = () => {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    document.body.classList.toggle("is-scrolled", window.scrollY > 8);
    document.documentElement.style.setProperty("--scroll-progress", String(window.scrollY / scrollable));
  };

  updateScrollState();
  window.addEventListener("scroll", updateScrollState, { passive: true });

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

  setupLensControls();
  setupSectionRail();
}

function createFiringEvent(originIndex, points, adjacency, root, firingEvents) {
  const connectedOrigin = adjacency[originIndex]?.length ? originIndex : findClosestConnectedIndex(originIndex, points, adjacency);
  if (connectedOrigin === null) return;

  const schedule = createPropagationSchedule(connectedOrigin, adjacency);
  if (!schedule.edges.length) return;
  schedule.points = points;

  const nodeGeometry = new THREE.BufferGeometry();
  const nodeMaterial = new THREE.PointsMaterial({
    color: 0xba232a,
    transparent: true,
    opacity: 0.92,
    size: 0.095,
    sizeAttenuation: true,
    depthWrite: false
  });
  const nodeCloud = new THREE.Points(nodeGeometry, nodeMaterial);
  root.add(nodeCloud);

  const lineGeometry = new THREE.BufferGeometry();
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xba232a,
    transparent: true,
    opacity: 0.82,
    depthWrite: false
  });
  const line = new THREE.LineSegments(lineGeometry, lineMaterial);
  root.add(line);

  firingEvents.push({
    age: 0,
    schedule,
    nodeCloud,
    nodeGeometry,
    nodeMaterial,
    line,
    lineGeometry,
    lineMaterial
  });
}

function updateFiringEvents(firingEvents) {
  for (let i = firingEvents.length - 1; i >= 0; i -= 1) {
    const event = firingEvents[i];
    event.age += 0.018;
    const fade = THREE.MathUtils.clamp((event.schedule.duration - event.age) / 0.42, 0, 1);
    const visibleNodes = [];
    const visibleLines = [];

    event.schedule.nodes.forEach(({ index, start }) => {
      if (event.age >= start) {
        visibleNodes.push(event.schedule.points[index]);
      }
    });

    event.schedule.edges.forEach(({ from, to, start }) => {
      const progress = THREE.MathUtils.clamp((event.age - start) / 0.13, 0, 1);
      if (progress <= 0) return;

      const fromPoint = event.schedule.points[from];
      const toPoint = event.schedule.points[to];
      visibleLines.push(fromPoint, fromPoint.clone().lerp(toPoint, progress));
    });

    event.nodeGeometry.setFromPoints(visibleNodes);
    event.lineGeometry.setFromPoints(visibleLines);
    event.nodeMaterial.opacity = 0.25 + fade * 0.72;
    event.lineMaterial.opacity = 0.18 + fade * 0.68;

    if (event.age >= event.schedule.duration) {
      event.nodeCloud.parent.remove(event.nodeCloud);
      event.line.parent.remove(event.line);
      event.nodeGeometry.dispose();
      event.nodeMaterial.dispose();
      event.line.geometry.dispose();
      event.lineMaterial.dispose();
      firingEvents.splice(i, 1);
    }
  }
}

function createPropagationSchedule(originIndex, adjacency) {
  const maxDepth = 5;
  const maxEdges = 96;
  const visited = new Set([originIndex]);
  const queue = [{ index: originIndex, depth: 0 }];
  const nodes = [{ index: originIndex, start: 0 }];
  const edges = [];

  while (queue.length && edges.length < maxEdges) {
    const current = queue.shift();
    if (current.depth >= maxDepth) continue;

    adjacency[current.index]
      .slice()
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4)
      .forEach((neighbor, order) => {
        if (visited.has(neighbor.index) || edges.length >= maxEdges) return;

        const start = current.depth * 0.14 + order * 0.024;
        const nextStart = start + 0.13;
        visited.add(neighbor.index);
        edges.push({ from: current.index, to: neighbor.index, start });
        nodes.push({ index: neighbor.index, start: nextStart });
        queue.push({ index: neighbor.index, depth: current.depth + 1 });
      });
  }

  return {
    points: null,
    nodes,
    edges,
    duration: Math.max(...edges.map(edge => edge.start), 0) + 0.78
  };
}

function findClosestConnectedIndex(originIndex, points, adjacency) {
  let nearest = null;
  let nearestDistance = Infinity;

  points.forEach((point, index) => {
    if (!adjacency[index]?.length) return;

    const distance = point.distanceTo(points[originIndex]);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });

  return nearest;
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
  const pairs = [];
  const maxDistance = 0.52;

  for (let i = 0; i < points.length; i += 1) {
    let linked = 0;

    for (let j = i + 1; j < points.length && linked < 3; j += 1) {
      const distance = points[i].distanceTo(points[j]);
      const sameHemisphere = Math.sign(points[i].x) === Math.sign(points[j].x);

      if (sameHemisphere && distance < maxDistance && Math.random() > 0.54) {
        pairs.push([i, j]);
        linked += 1;
      }
    }
  }

  return pairs;
}

function createAdjacency(count, pairs, points) {
  const adjacency = Array.from({ length: count }, () => []);

  pairs.forEach(([from, to]) => {
    const distance = points[from].distanceTo(points[to]);
    adjacency[from].push({ index: to, distance });
    adjacency[to].push({ index: from, distance });
  });

  return adjacency;
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
