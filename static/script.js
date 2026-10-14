/**
 * TripMate — Multi-Agent Travel Intelligence System
 * Minimalist Client Controller (Agentum Aesthetic)
 */

let currentThreadId = localStorage.getItem("travel_thread_id") || null;
let latestAnswerMarkdown = "";
let waitingForApproval = false;

// Agent definitions without emojis, styled with clean indexing
const AGENT_ORDER_LIST = [
  {
    key: "flight_agent",
    code: "01",
    name: "Flight Agent",
    desc: "Scrapes route and flight status via AviationStack MCP"
  },
  {
    key: "hotel_agent",
    code: "02",
    name: "Hotel Agent",
    desc: "Discovers accommodations and pricing via Tavily Search"
  },
  {
    key: "weather_agent",
    code: "03",
    name: "Weather Agent",
    desc: "Gathers live forecasts and climate alerts via OpenWeather"
  },
  {
    key: "budget_agent",
    code: "04",
    name: "Budget Agent",
    desc: "Evaluates cost feasibility and expense breakdowns"
  },
  {
    key: "itinerary_agent",
    code: "05",
    name: "Itinerary Agent",
    desc: "Composes the structured day-by-day travel plan"
  }
];

function setPrompt(text) {
  const input = document.getElementById("userInput");
  input.value = text;
  input.focus();
}

function addFeedback(feedbackText) {
  const input = document.getElementById("approvalFeedback");
  if (input.value.trim()) {
    input.value += `, ${feedbackText}`;
  } else {
    input.value = feedbackText;
  }
  input.focus();
}

function setLoading(isLoading, mode = "draft") {
  const sendBtn = document.getElementById("sendBtn");
  const btnText = document.getElementById("btnText");
  const btnLoader = document.getElementById("btnLoader");
  const approveBtn = document.getElementById("approveBtn");
  const reviseBtn = document.getElementById("reviseBtn");

  if (sendBtn) sendBtn.disabled = isLoading;
  if (approveBtn) approveBtn.disabled = isLoading;
  if (reviseBtn) reviseBtn.disabled = isLoading;

  if (isLoading) {
    if (btnText) btnText.classList.add("hidden");
    if (btnLoader) btnLoader.classList.remove("hidden");
  } else {
    if (btnText) btnText.classList.remove("hidden");
    if (btnLoader) btnLoader.classList.add("hidden");
  }
}

function showError(message) {
  const errorBox = document.getElementById("errorBox");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  const errorBox = document.getElementById("errorBox");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

function renderMarkdown(element, markdown) {
  if (typeof marked !== "undefined") {
    element.innerHTML = marked.parse(markdown || "");
  } else {
    element.innerText = markdown || "";
  }
}

function showWorkflow(data) {
  const section = document.getElementById("workflowSection");
  const reasoning = document.getElementById("supervisorReasoning");
  const list = document.getElementById("agentChips");
  const guardrailBadge = document.getElementById("guardrailBadge");

  reasoning.textContent = data.supervisor_reasoning || "Supervisor analysis and agent dispatch complete.";
  list.innerHTML = "";

  const selectedKeys = new Set(data.selected_agents || ["itinerary_agent"]);

  // Render cards exactly like Agentum pipeline status
  AGENT_ORDER_LIST.forEach((agent) => {
    const isSelected = selectedKeys.has(agent.key);
    const card = document.createElement("div");
    card.className = "agent-card-row";

    const statusText = isSelected ? "COMPLETE" : "WAITING";
    const statusClass = isSelected ? "agent-status-label done" : "agent-status-label";

    card.innerHTML = `
      <div class="agent-left">
        <span class="agent-index">${agent.code}</span>
        <div class="agent-details">
          <h4>${agent.name}</h4>
          <p>${agent.desc}</p>
        </div>
      </div>
      <span class="${statusClass}">${statusText}</span>
    `;

    list.appendChild(card);
  });

  if (data.guardrail_allowed === false) {
    guardrailBadge.textContent = "Guardrail Blocked";
    guardrailBadge.classList.add("blocked");
  } else {
    guardrailBadge.textContent = "Guardrail Passed";
    guardrailBadge.classList.remove("blocked");
  }

  section.classList.remove("hidden");
}

function showResult(answer, threadId, isDraft = false) {
  latestAnswerMarkdown = answer || "";

  const resultSection = document.getElementById("resultSection");
  const resultBox = document.getElementById("resultBox");
  const threadInfo = document.getElementById("threadInfo");
  const resultTitle = document.getElementById("resultTitle");
  const statusPill = document.getElementById("resultStatusPill");

  renderMarkdown(resultBox, latestAnswerMarkdown);
  threadInfo.textContent = `Thread ID: ${threadId || 'active'}`;
  
  if (isDraft) {
    resultTitle.textContent = "Draft Itinerary";
    statusPill.textContent = "DRAFT REVIEW";
  } else {
    resultTitle.textContent = "Final Travel Plan";
    statusPill.textContent = "FINAL ITINERARY";
  }

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function showApproval(data) {
  waitingForApproval = true;
  const section = document.getElementById("approvalSection");
  const approvalRequest = document.getElementById("approvalRequest");
  approvalRequest.textContent = data.approval_request ||
    "A preliminary itinerary draft has been generated. Approve it to finalize, or submit revision feedback below.";
  section.classList.remove("hidden");
}

function hideApproval() {
  waitingForApproval = false;
  document.getElementById("approvalSection").classList.add("hidden");
  document.getElementById("approvalFeedback").value = "";
}

async function sendMessage() {
  hideError();

  if (waitingForApproval) {
    showError("Please approve or revise the current draft before starting another plan.");
    return;
  }

  const input = document.getElementById("userInput");
  const message = input.value.trim();

  if (!message) {
    showError("Please enter your trip query first.");
    return;
  }

  setLoading(true, "draft");

  try {
    const response = await fetch("/api/travel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message,
        thread_id: currentThreadId
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Execution failed.");
    }

    currentThreadId = data.thread_id;
    localStorage.setItem("travel_thread_id", currentThreadId);

    showWorkflow(data);

    if (data.requires_approval) {
      showResult(data.itinerary || data.answer, data.thread_id, true);
      showApproval(data);
    } else {
      hideApproval();
      showResult(data.answer, data.thread_id, false);
    }
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false, "draft");
  }
}

async function submitApproval(approved) {
  hideError();

  if (!currentThreadId || !waitingForApproval) {
    showError("There is no draft waiting for approval.");
    return;
  }

  const feedbackInput = document.getElementById("approvalFeedback");
  const feedback = feedbackInput.value.trim();

  if (!approved && !feedback) {
    showError("Please enter revision feedback before requesting changes.");
    feedbackInput.focus();
    return;
  }

  setLoading(true, "approval");

  try {
    const response = await fetch("/api/travel/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        thread_id: currentThreadId,
        approved: approved,
        feedback: feedback
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not resume the travel workflow.");
    }

    showWorkflow(data);
    hideApproval();
    showResult(data.answer, data.thread_id, false);
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false, "approval");
  }
}

function copyResult() {
  const resultBox = document.getElementById("resultBox");
  const text = resultBox.innerText;

  if (!text) return;

  navigator.clipboard.writeText(text)
    .then(() => {
      const copyBtn = document.querySelector(".copy-btn");
      const oldText = copyBtn.textContent;
      copyBtn.textContent = "Copied";

      setTimeout(() => {
        copyBtn.textContent = oldText;
      }, 1500);
    })
    .catch(() => {
      showError("Could not copy result.");
    });
}

function downloadPDF() {
  const pdfContent = document.getElementById("pdfContent");

  if (!latestAnswerMarkdown || !pdfContent) {
    showError("No travel plan available to download.");
    return;
  }

  const downloadBtn = document.querySelector(".download-btn");
  const oldText = downloadBtn.textContent;
  downloadBtn.textContent = "Generating PDF...";

  const options = {
    margin: 0.5,
    filename: "tripmate-itinerary.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#090A0D" },
    jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] }
  };

  html2pdf()
    .set(options)
    .from(pdfContent)
    .save()
    .then(() => {
      downloadBtn.textContent = oldText;
    })
    .catch(() => {
      downloadBtn.textContent = oldText;
      showError("Could not download PDF.");
    });
}

// Keyboard shortcut: Ctrl + Enter / Cmd + Enter
document.addEventListener("keydown", function(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    sendMessage();
  }
});

/**
 * ==============================================================================
 * 3D Interactive Travel Radar & Globe Component (Three.js)
 * Minimalist Agentum Aesthetic with Lightened Radiant Orange Accents (#FF8C55)
 * ==============================================================================
 */

function init3DGlobe() {
  const canvas = document.getElementById("globeCanvas");
  const wrapper = document.getElementById("globeWrapper");

  if (!canvas || !wrapper) return;
  if (typeof THREE === "undefined") {
    console.warn("Three.js not loaded yet");
    return;
  }

  // Lightened radiant warm orange palette matching UI
  const COLOR_ORANGE = 0xFF8C55;
  const COLOR_ORANGE_BRIGHT = 0xFFB288;
  const COLOR_RADAR_GRID = 0x222A3A;
  const COLOR_DOTS = 0x485368;
  const COLOR_GLOBE_CORE = 0x0C0E14;

  const GLOBE_RADIUS = 95;

  // Scene & Camera
  const scene = new THREE.Scene();

  const width = wrapper.clientWidth || 400;
  const height = wrapper.clientHeight || 360;

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
  camera.position.set(0, 10, 275);
  camera.lookAt(0, 0, 0);

  // High performance WebGL renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Master group containing all rotating elements
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  // Initial aesthetic tilt showcasing India & global routes
  let targetRotX = 0.28;
  let targetRotY = -0.65;
  let currentRotX = targetRotX;
  let currentRotY = targetRotY;
  let isDragging = false;
  let isHovered = false;
  let prevPointer = { x: 0, y: 0 };

  // 1. Core Sphere (Dark obsidian base)
  const sphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 44, 44);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: COLOR_GLOBE_CORE,
    transparent: true,
    opacity: 0.95
  });
  const coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
  globeGroup.add(coreSphere);

  // 2. Latitude & Longitude Radar Rings
  const ringMat = new THREE.LineBasicMaterial({
    color: COLOR_RADAR_GRID,
    transparent: true,
    opacity: 0.45
  });

  // Longitudinal circles
  for (let i = 0; i < 8; i++) {
    const lonRingGeo = new THREE.BufferGeometry();
    const angle = (i * Math.PI) / 8;
    const ringPts = [];
    for (let j = 0; j <= 64; j++) {
      const theta = (j * Math.PI * 2) / 64;
      const x = GLOBE_RADIUS * Math.sin(theta) * Math.cos(angle);
      const y = GLOBE_RADIUS * Math.cos(theta);
      const z = GLOBE_RADIUS * Math.sin(theta) * Math.sin(angle);
      ringPts.push(new THREE.Vector3(x, y, z));
    }
    lonRingGeo.setFromPoints(ringPts);
    const lonLine = new THREE.Line(lonRingGeo, ringMat);
    globeGroup.add(lonLine);
  }

  // Latitudinal circles
  const latAngles = [-60, -35, 0, 35, 60];
  latAngles.forEach(latDeg => {
    const phi = (latDeg * Math.PI) / 180;
    const r = GLOBE_RADIUS * Math.cos(phi);
    const y = GLOBE_RADIUS * Math.sin(phi);
    const latRingGeo = new THREE.BufferGeometry();
    const ringPts = [];
    for (let j = 0; j <= 64; j++) {
      const theta = (j * Math.PI * 2) / 64;
      ringPts.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
    }
    latRingGeo.setFromPoints(ringPts);
    const latLine = new THREE.Line(latRingGeo, ringMat);
    globeGroup.add(latLine);
  });

  // 3. Point Cloud Dotted Surface (Continental & Radar Grid Points)
  const dotCount = 1600;
  const dotPositions = new Float32Array(dotCount * 3);
  const phiWeight = (Math.sqrt(5) - 1) / 2; // Golden ratio spiral

  for (let i = 0; i < dotCount; i++) {
    const y = 1 - (i / (dotCount - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = 2 * Math.PI * phiWeight * i;

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    const r = GLOBE_RADIUS + 0.6;
    dotPositions[i * 3] = x * r;
    dotPositions[i * 3 + 1] = y * r;
    dotPositions[i * 3 + 2] = z * r;
  }

  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
  const dotMat = new THREE.PointsMaterial({
    size: 1.8,
    color: COLOR_DOTS,
    transparent: true,
    opacity: 0.75
  });
  const pointCloud = new THREE.Points(dotGeo, dotMat);
  globeGroup.add(pointCloud);

  // Coordinate Conversion Helper (lat/lon to 3D Vector)
  function latLonToVector(lat, lon, radius, alt = 0) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const r = radius + alt;
    const x = -r * Math.sin(phi) * Math.cos(theta);
    const z = r * Math.sin(phi) * Math.sin(theta);
    const y = r * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }

  // 4. Key Travel Hubs & Cities
  const CITIES = [
    { name: "Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Ladakh (Leh)", lat: 34.1526, lon: 77.5771 },
    { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
    { name: "Goa", lat: 15.2993, lon: 74.1240 },
    { name: "Dubai", lat: 25.2048, lon: 55.2708 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Kyoto", lat: 35.0116, lon: 135.7681 },
    { name: "Bangkok", lat: 13.7563, lon: 100.5018 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "Singapore", lat: 1.3521, lon: 103.8198 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093 }
  ];

  const cityMap = {};
  const pulsingRings = [];

  const cityNodeMat = new THREE.MeshBasicMaterial({ color: COLOR_ORANGE });
  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: COLOR_ORANGE,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide
  });

  CITIES.forEach(city => {
    const pos = latLonToVector(city.lat, city.lon, GLOBE_RADIUS, 1.2);
    cityMap[city.name] = pos;

    // Glowing City Dot
    const cityDotGeo = new THREE.SphereGeometry(1.6, 12, 12);
    const cityDot = new THREE.Mesh(cityDotGeo, cityNodeMat);
    cityDot.position.copy(pos);
    globeGroup.add(cityDot);

    // City Pulsing Ring (oriented outwards)
    const ringGeo = new THREE.RingGeometry(2.0, 3.2, 16);
    const ring = new THREE.Mesh(ringGeo, pulseRingMat);
    ring.position.copy(pos);
    ring.lookAt(pos.clone().multiplyScalar(2));
    globeGroup.add(ring);
    pulsingRings.push(ring);
  });

  // 5. 3D Great-Circle Flight Trajectory Arcs
  const ROUTES = [
    { from: "Delhi", to: "Ladakh (Leh)" },
    { from: "Delhi", to: "Mumbai" },
    { from: "Mumbai", to: "Goa" },
    { from: "Mumbai", to: "Dubai" },
    { from: "Delhi", to: "Dubai" },
    { from: "Delhi", to: "Tokyo" },
    { from: "Tokyo", to: "Kyoto" },
    { from: "Delhi", to: "Bangkok" },
    { from: "Dubai", to: "London" },
    { from: "London", to: "New York" },
    { from: "Delhi", to: "London" },
    { from: "Singapore", to: "Sydney" }
  ];

  const arcMat = new THREE.LineBasicMaterial({
    color: COLOR_ORANGE,
    transparent: true,
    opacity: 0.65
  });

  const flightBeacons = [];
  const beaconGeo = new THREE.SphereGeometry(1.5, 10, 10);
  const beaconMat = new THREE.MeshBasicMaterial({ color: COLOR_ORANGE_BRIGHT });

  ROUTES.forEach(route => {
    const v1 = cityMap[route.from];
    const v2 = cityMap[route.to];
    if (!v1 || !v2) return;

    // Elevated flight arc calculation
    const pointsCount = 48;
    const curvePoints = [];
    const dist = v1.distanceTo(v2);
    const maxAlt = Math.min(26, Math.max(10, dist * 0.16));

    for (let i = 0; i <= pointsCount; i++) {
      const t = i / pointsCount;
      const p = new THREE.Vector3().lerpVectors(v1, v2, t);
      const elevation = Math.sin(t * Math.PI) * maxAlt;
      p.normalize().multiplyScalar(GLOBE_RADIUS + elevation);
      curvePoints.push(p);
    }

    const arcGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const arcLine = new THREE.Line(arcGeo, arcMat);
    globeGroup.add(arcLine);

    // Traveling Flight Pulse Beacon
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.copy(curvePoints[0]);
    globeGroup.add(beaconMesh);

    flightBeacons.push({
      mesh: beaconMesh,
      points: curvePoints,
      progress: Math.random(),
      speed: 0.0035 + Math.random() * 0.003
    });
  });

  // 6. Interactive Drag & Touch Controls
  canvas.addEventListener("pointerdown", (e) => {
    isDragging = true;
    prevPointer = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevPointer.x;
    const deltaY = e.clientY - prevPointer.y;

    targetRotY += deltaX * 0.006;
    targetRotX += deltaY * 0.006;

    // Clamp pitch to avoid inversion
    targetRotX = Math.max(-1.1, Math.min(1.1, targetRotX));

    prevPointer = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener("pointerup", (e) => {
    isDragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  });

  canvas.addEventListener("pointercancel", () => {
    isDragging = false;
  });

  canvas.addEventListener("mouseenter", () => {
    isHovered = true;
  });

  canvas.addEventListener("mouseleave", () => {
    isHovered = false;
  });

  // Handle Container Resizing
  function onResize() {
    const newWidth = wrapper.clientWidth;
    const newHeight = wrapper.clientHeight;
    if (newWidth > 0 && newHeight > 0) {
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }
  }

  window.addEventListener("resize", onResize);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(onResize).observe(wrapper);
  }

  // 7. Animation Loop
  let time = 0;

  function renderLoop() {
    requestAnimationFrame(renderLoop);
    time += 0.02;

    // Smooth inertial dampening
    if (!isDragging) {
      const autoSpeed = isHovered ? 0.0008 : 0.0022;
      targetRotY += autoSpeed;
    }

    currentRotX += (targetRotX - currentRotX) * 0.08;
    currentRotY += (targetRotY - currentRotY) * 0.08;

    globeGroup.rotation.x = currentRotX;
    globeGroup.rotation.y = currentRotY;

    // Animate traveling flight pulses
    flightBeacons.forEach(beacon => {
      beacon.progress += beacon.speed;
      if (beacon.progress > 1) beacon.progress = 0;

      const totalPts = beacon.points.length;
      const rawIdx = beacon.progress * (totalPts - 1);
      const idx1 = Math.floor(rawIdx);
      const idx2 = Math.min(idx1 + 1, totalPts - 1);
      const frac = rawIdx - idx1;

      beacon.mesh.position.lerpVectors(
        beacon.points[idx1],
        beacon.points[idx2],
        frac
      );
    });

    // Pulsing city rings
    const ringPulse = 1 + 0.3 * Math.sin(time * 3);
    pulsingRings.forEach(ring => {
      ring.scale.set(ringPulse, ringPulse, ringPulse);
    });

    renderer.render(scene, camera);
  }

  renderLoop();
}

// Initialize 3D Globe when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init3DGlobe);
} else {
  init3DGlobe();
}

