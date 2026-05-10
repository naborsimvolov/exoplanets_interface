window.addEventListener("load", () => {
  const canvas = document.getElementById("exoplanetMap");
  const ctx = canvas.getContext("2d");

  const minimapCanvas = document.getElementById("minimapCanvas");
  const minimapCtx = minimapCanvas.getContext("2d");

  const infoBox = document.getElementById("planet-info");
  const loadingStatus = document.getElementById("loadingStatus");

  const mapLayers = {
    gamma: {
      name: "Gamma-ray map",
      src: "assets/gamma_ray_starmap.png",
      image: new Image(),
      loaded: false,
    },
    stars: {
      name: "Star map",
      src: "assets/starmap.jpg",
      image: new Image(),
      loaded: false,
    },
  };

  const constellationsLayer = {
    src: "assets/constellations.png",
    image: new Image(),
    loaded: false,
  };

  let currentLayerKey = "gamma";
  let showConstellations = false;
  let planets = [];

  let scale = 1;
  let originX = 0;
  let originY = 0;

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  const MAX_SCALE = 10;
  const PAN_STEP = 50;
  const PLANET_HIT_RADIUS = 10;

  function setStatus(message, isError = false) {
    if (!loadingStatus) return;

    loadingStatus.textContent = message;
    loadingStatus.classList.toggle("error", isError);
    loadingStatus.classList.remove("hidden");
  }

  function hideStatus() {
    if (!loadingStatus) return;
    loadingStatus.classList.add("hidden");
  }

  function loadImage(imageInfo) {
    return new Promise((resolve, reject) => {
      imageInfo.image.onload = () => {
        imageInfo.loaded = true;
        resolve(imageInfo);
      };

      imageInfo.image.onerror = () => {
        reject(new Error(`Could not load image: ${imageInfo.src}`));
      };

      imageInfo.image.src = imageInfo.src;
    });
  }

  function getCurrentMapImage() {
    return mapLayers[currentLayerKey].image;
  }

  function getMapWidth() {
    return getCurrentMapImage().width || 1;
  }

  function getMapHeight() {
    return getCurrentMapImage().height || 1;
  }

  function calculateMinScale() {
    return Math.min(canvas.width / getMapWidth(), canvas.height / getMapHeight());
  }

  function resetView() {
    scale = calculateMinScale();
    originX = (canvas.width - getMapWidth() * scale) / 2;
    originY = (canvas.height - getMapHeight() * scale) / 2;
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (getCurrentMapImage().complete && getMapWidth() > 1) {
      resetView();
      drawMap();
    }
  }

  async function loadPlanets() {
    const response = await fetch("data/planets_1000.json");

    if (!response.ok) {
      throw new Error(`Could not load planet data: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Planet data JSON must be an array.");
    }

    planets = data.filter((planet) => {
      return Number.isFinite(Number(planet.x)) && Number.isFinite(Number(planet.y));
    });
  }

  function drawMap() {
    if (!ctx) return;

    const mapImage = getCurrentMapImage();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!mapImage.complete || !mapImage.width) {
      return;
    }

    ctx.translate(originX, originY);
    ctx.scale(scale, scale);

    ctx.drawImage(mapImage, 0, 0);

    if (showConstellations && constellationsLayer.loaded) {
      ctx.drawImage(
        constellationsLayer.image,
        0,
        0,
        constellationsLayer.image.width,
        constellationsLayer.image.height,
        0,
        0,
        getMapWidth(),
        getMapHeight()
      );
    }

    drawPlanets();
    drawMinimap();
  }

  function drawPlanets() {
    const planetRadius = Math.max(5 / scale, 2);

    planets.forEach((planet) => {
      const x = Number(planet.x);
      const y = Number(planet.y);

      ctx.beginPath();
      ctx.arc(x, y, planetRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.strokeStyle = "rgba(125, 211, 252, 0.8)";
      ctx.lineWidth = Math.max(1 / scale, 0.3);
      ctx.stroke();
      ctx.closePath();
    });
  }

  function drawMinimap() {
    const mapImage = getCurrentMapImage();

    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    if (!mapImage.complete || !mapImage.width) {
      return;
    }

    minimapCtx.drawImage(
      mapImage,
      0,
      0,
      getMapWidth(),
      getMapHeight(),
      0,
      0,
      minimapCanvas.width,
      minimapCanvas.height
    );

    const viewportWidth = (canvas.width / (getMapWidth() * scale)) * minimapCanvas.width;
    const viewportHeight = (canvas.height / (getMapHeight() * scale)) * minimapCanvas.height;
    const viewportX = (-originX / (getMapWidth() * scale)) * minimapCanvas.width;
    const viewportY = (-originY / (getMapHeight() * scale)) * minimapCanvas.height;

    minimapCtx.strokeStyle = "#ef4444";
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
  }

  function switchLayer() {
    currentLayerKey = currentLayerKey === "gamma" ? "stars" : "gamma";
    resetView();
    drawMap();
  }

  function toggleConstellations() {
    showConstellations = !showConstellations;
    drawMap();
  }

  function constrainPan() {
    const minScale = calculateMinScale();

    if (scale <= minScale) {
      originX = (canvas.width - getMapWidth() * scale) / 2;
      originY = (canvas.height - getMapHeight() * scale) / 2;
      return;
    }

    const maxOriginX = 0;
    const maxOriginY = 0;
    const minOriginX = Math.min(canvas.width - getMapWidth() * scale, 0);
    const minOriginY = Math.min(canvas.height - getMapHeight() * scale, 0);

    originX = Math.min(maxOriginX, Math.max(originX, minOriginX));
    originY = Math.min(maxOriginY, Math.max(originY, minOriginY));
  }

  function zoomAtPoint(centerX, centerY, zoomFactor) {
    const newScale = scale * zoomFactor;
    const minScale = calculateMinScale();

    if (newScale < minScale || newScale > MAX_SCALE) {
      return;
    }

    const mapX = (centerX - originX) / scale;
    const mapY = (centerY - originY) / scale;

    originX = centerX - mapX * newScale;
    originY = centerY - mapY * newScale;
    scale = newScale;

    constrainPan();
    drawMap();
  }

  function handleZoom(event) {
    event.preventDefault();

    const zoomIntensity = 0.1;
    const wheelDirection = event.deltaY < 0 ? 1 : -1;
    const zoomFactor = Math.exp(wheelDirection * zoomIntensity);

    zoomAtPoint(event.offsetX, event.offsetY, zoomFactor);
  }

  function zoomIn() {
    zoomAtPoint(canvas.width / 2, canvas.height / 2, 1.2);
  }

  function zoomOut() {
    zoomAtPoint(canvas.width / 2, canvas.height / 2, 1 / 1.2);
  }

  function startDrag(event) {
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.style.cursor = "grabbing";
  }

  function drag(event) {
    if (!isDragging) return;

    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;

    originX += deltaX;
    originY += deltaY;

    constrainPan();
    drawMap();
  }

  function endDrag() {
    isDragging = false;
    canvas.style.cursor = "grab";
  }

  function handlePlanetClick(event) {
    const rect = canvas.getBoundingClientRect();

    const mouseX = (event.clientX - rect.left - originX) / scale;
    const mouseY = (event.clientY - rect.top - originY) / scale;

    const clickedPlanet = planets.find((planet) => {
      const dx = mouseX - Number(planet.x);
      const dy = mouseY - Number(planet.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < PLANET_HIT_RADIUS / scale;
    });

    if (!clickedPlanet) {
      hidePlanetInfo();
      return;
    }

    displayPlanetInfo(clickedPlanet);
  }

  function formatValue(value, suffix = "") {
    if (value === undefined || value === null || value === "" || Number.isNaN(value)) {
      return "N/A";
    }

    return `${value}${suffix}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function displayPlanetInfo(planet) {
    const data = planet.data || {};
    const planetName = escapeHtml(planet.name || data.pl_name || "Unknown planet");

    infoBox.innerHTML = `
      <h3>${planetName}</h3>
      <p><strong>Host Star:</strong> ${escapeHtml(formatValue(data.hostname))}</p>
      <p><strong>RA:</strong> ${escapeHtml(formatValue(data.ra))}</p>
      <p><strong>DEC:</strong> ${escapeHtml(formatValue(data.dec))}</p>
      <p><strong>Distance:</strong> ${escapeHtml(formatValue(data.sy_dist, " pc"))}</p>
      <p><strong>Discovery Method:</strong> ${escapeHtml(formatValue(data.discoverymethod))}</p>
      <p><strong>Discovery Year:</strong> ${escapeHtml(formatValue(data.disc_year))}</p>
      <p><strong>Orbital Period:</strong> ${escapeHtml(formatValue(data.pl_orbper, " days"))}</p>
      <p><strong>Semi-Major Axis:</strong> ${escapeHtml(formatValue(data.pl_orbsmax, " AU"))}</p>
      <p><strong>Planet Radius:</strong> ${escapeHtml(formatValue(data.pl_rade, " Earth radii"))}</p>
      <p><strong>Planet Mass:</strong> ${escapeHtml(formatValue(data.pl_masse, " Earth masses"))}</p>
      <p><strong>Planet Density:</strong> ${escapeHtml(formatValue(data.pl_dens, " g/cm³"))}</p>
      <p><strong>Eccentricity:</strong> ${escapeHtml(formatValue(data.pl_orbeccen))}</p>
      <p><strong>Stellar Effective Temperature:</strong> ${escapeHtml(formatValue(data.st_teff, " K"))}</p>
    `;

    const screenX = originX + Number(planet.x) * scale;
    const screenY = originY + Number(planet.y) * scale;

    const x = Math.min(screenX + 15, window.innerWidth - infoBox.offsetWidth - 12);
    const y = Math.min(screenY + 15, window.innerHeight - infoBox.offsetHeight - 12);

    infoBox.style.left = `${Math.max(12, x)}px`;
    infoBox.style.top = `${Math.max(12, y)}px`;
    infoBox.style.display = "block";
  }

  function hidePlanetInfo() {
    infoBox.style.display = "none";
  }

  function panUp() {
    originY += PAN_STEP;
    constrainPan();
    drawMap();
  }

  function panDown() {
    originY -= PAN_STEP;
    constrainPan();
    drawMap();
  }

  function panLeft() {
    originX += PAN_STEP;
    constrainPan();
    drawMap();
  }

  function panRight() {
    originX -= PAN_STEP;
    constrainPan();
    drawMap();
  }

  function addEventListeners() {
    window.addEventListener("resize", resizeCanvas);

    canvas.addEventListener("wheel", handleZoom, { passive: false });
    canvas.addEventListener("mousedown", startDrag);
    canvas.addEventListener("mousemove", drag);
    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mouseleave", endDrag);
    canvas.addEventListener("click", handlePlanetClick);

    document.getElementById("zoomInButton").addEventListener("click", zoomIn);
    document.getElementById("zoomOutButton").addEventListener("click", zoomOut);

    document.getElementById("panUpButton").addEventListener("click", panUp);
    document.getElementById("panDownButton").addEventListener("click", panDown);
    document.getElementById("panLeftButton").addEventListener("click", panLeft);
    document.getElementById("panRightButton").addEventListener("click", panRight);

    document.getElementById("switchLayerButton").addEventListener("click", switchLayer);
    document.getElementById("toggleConstellationsButton").addEventListener("click", toggleConstellations);

    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowUp":
          panUp();
          break;
        case "ArrowDown":
          panDown();
          break;
        case "ArrowLeft":
          panLeft();
          break;
        case "ArrowRight":
          panRight();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
        case "_":
          zoomOut();
          break;
        case "Escape":
          hidePlanetInfo();
          break;
        default:
          break;
      }
    });
  }

  async function initializeApp() {
    try {
      setStatus("Loading map layers...");

      await Promise.all([
        loadImage(mapLayers.gamma),
        loadImage(mapLayers.stars),
        loadImage(constellationsLayer),
      ]);

      setStatus("Loading exoplanet data...");
      await loadPlanets();

      resizeCanvas();
      resetView();
      addEventListeners();
      drawMap();

      setStatus(`Loaded ${planets.length} exoplanets.`);
      window.setTimeout(hideStatus, 1800);
    } catch (error) {
      console.error(error);
      setStatus(error.message, true);
    }
  }

  initializeApp();
});