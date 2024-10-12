window.onload = function () {
  const canvas = document.getElementById("exoplanetMap");
  const ctx = canvas.getContext("2d");

  let scale = 1;
  let originX = 0;
  let originY = 0;
  let isDragging = false;
  let lastX, lastY;

  const gammaRayImage = new Image();
  gammaRayImage.src = "gamma_ray_starmap.png";

  const starmapImage = new Image();
  starmapImage.src = "starmap.jpg";

  const constellationsImage = new Image();
  constellationsImage.src = "constellations.png";

  let currentMapImage = gammaRayImage;
  let showConstellations = false;

  let planets = [];

  const minimapCanvas = document.getElementById("minimapCanvas");
  const minimapCtx = minimapCanvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawMap();
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  fetch('planets_1000.json')
    .then(response => response.json())
    .then(data => {
      planets = data;
      drawMap();
    })
    .catch(error => console.error('Error loading planet data:', error));

  gammaRayImage.onload = function() {
    initialize();
  };

  starmapImage.onload = function() {
    initialize();
  };

  function initialize() {
    if (gammaRayImage.complete && starmapImage.complete) {
      scale = canvas.height / currentMapImage.height;
      originX = (canvas.width - currentMapImage.width * scale) / 2;
      originY = 0;

      canvas.addEventListener("wheel", handleZoom);
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

      drawMap();
    }
  }

  function switchLayer() {
    if (currentMapImage === gammaRayImage) {
      currentMapImage = starmapImage;
    } else {
      currentMapImage = gammaRayImage;
    }
    drawMap();
  }

  function toggleConstellations() {
    showConstellations = !showConstellations;
    drawMap();
  }

  function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(originX, originY);
    ctx.scale(scale, scale);
    ctx.drawImage(currentMapImage, 0, 0);
    if (showConstellations) {
      ctx.drawImage(constellationsImage, 0, 0, constellationsImage.width, constellationsImage.height, 0, 0, currentMapImage.width, currentMapImage.height);
    }
    const planetRadius = Math.max(5 / scale, 2);
    planets.forEach(planet => {
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planetRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.closePath();
    });
    drawMinimap();
  }

  function drawMinimap() {
    const minimapWidth = minimapCanvas.width;
    const minimapHeight = minimapCanvas.height;
    minimapCtx.clearRect(0, 0, minimapWidth, minimapHeight);
    minimapCtx.drawImage(currentMapImage, 0, 0, currentMapImage.width, currentMapImage.height, 0, 0, minimapWidth, minimapHeight);
    const viewportWidth = canvas.width / (currentMapImage.width * scale) * minimapWidth;
    const viewportHeight = canvas.height / (currentMapImage.height * scale) * minimapHeight;
    const viewportX = -originX / (currentMapImage.width * scale) * minimapWidth;
    const viewportY = -originY / (currentMapImage.height * scale) * minimapHeight;
    minimapCtx.strokeStyle = 'red';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
  }

  const MIN_SCALE = canvas.height / currentMapImage.height;
  const MAX_SCALE = 10;

  function handleZoom(event) {
    event.preventDefault();
    const zoomIntensity = 0.1;
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;
    const wheel = event.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);
    const newScale = scale * zoom;
    if (newScale < MIN_SCALE || newScale > MAX_SCALE) return;
    const x = (mouseX - originX) / scale;
    const y = (mouseY - originY) / scale;
    originX = mouseX - x * newScale;
    originY = mouseY - y * newScale;
    scale = newScale;
    constrainPan();
    drawMap();
  }

  function zoomIn() {
    const zoomFactor = 1.2;
    const newScale = scale * zoomFactor;
    if (newScale > MAX_SCALE) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const x = (centerX - originX) / scale;
    const y = (centerY - originY) / scale;
    originX = centerX - x * newScale;
    originY = centerY - y * newScale;
    scale = newScale;
    constrainPan();
    drawMap();
  }
function calculateMinScale() {
  return Math.min(canvas.width / currentMapImage.width, canvas.height / currentMapImage.height);
}
function zoomOut() {
  const zoomFactor = 1.2;
  const newScale = scale / zoomFactor;

  const minScale = calculateMinScale();

  if (newScale < minScale) {
    return;
  }
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const x = (centerX - originX) / scale;
  const y = (centerY - originY) / scale;
  originX = centerX - x * newScale;
  originY = centerY - y * newScale;
  scale = newScale;
  constrainPan();
  drawMap();
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
    let planetClicked = false;
    planets.forEach(planet => {
      const distance = Math.sqrt((mouseX - planet.x) ** 2 + (mouseY - planet.y) ** 2);
      if (distance < 10 / scale) {
        planetClicked = true;
        displayPlanetInfo(planet, planet.x, planet.y);
      }
    });
    if (!planetClicked) {
      const infoBox = document.getElementById("planet-info");
      infoBox.style.display = "none";
    }
  }

function displayPlanetInfo(planet, planetX, planetY) {
  const infoBox = document.getElementById("planet-info");
  infoBox.innerHTML = `
    <h3>${planet.name}</h3>
    <p><strong>RA:</strong> ${planet.data['ra']}</p>
    <p><strong>DEC:</strong> ${planet.data['dec']}</p>
    <p><strong>Distance:</strong> ${planet.data['sy_dist']} pc</p>
    <p><strong>Discovery Method:</strong> ${planet.data['discoverymethod']}</p>
    <p><strong>Discovery Year:</strong> ${planet.data['disc_year']}</p>
    <p><strong>Orbital Period:</strong> ${planet.data['pl_orbper']} days</p>
    <p><strong>Semi-Major Axis:</strong> ${planet.data['pl_orbsmax']} AU</p>
    <p><strong>Planet Radius:</strong> ${planet.data['pl_rade']} Earth radii</p>
    <p><strong>Planet Mass:</strong> ${planet.data['pl_masse']} Earth masses</p>
    <p><strong>Planet Density:</strong> ${planet.data['pl_dens']} g/cm³</p>
    <p><strong>Eccentricity:</strong> ${planet.data['pl_orbeccen']}</p>
    <p><strong>Stellar Effective Temperature:</strong> ${planet.data['st_teff']} K</p>
  `;
  const screenX = originX + planetX * scale;
  const screenY = originY + planetY * scale;
  const rect = canvas.getBoundingClientRect();
  const x = rect.left + screenX;
  const y = rect.top + screenY;
  infoBox.style.left = `${x + 15}px`;
  infoBox.style.top = `${y + 15}px`;
  infoBox.style.display = "block";
}

  const panStep = 50;

  function panUp() {
    originY += panStep;
    constrainPan();
    drawMap();
  }

  function panDown() {
    originY -= panStep;
    constrainPan();
    drawMap();
  }

  function panLeft() {
    originX += panStep;
    constrainPan();
    drawMap();
  }

  function panRight() {
    originX -= panStep;
    constrainPan();
    drawMap();
  }

function constrainPan() {
  const maxOriginX = 0;
  const minOriginX = Math.min(canvas.width - currentMapImage.width * scale, 0);
  const maxOriginY = 0;
  const minOriginY = Math.min(canvas.height - currentMapImage.height * scale, 0);

  if (scale <= calculateMinScale()) {
    originX = (canvas.width - currentMapImage.width * scale) / 2;
    originY = (canvas.height - currentMapImage.height * scale) / 2;
  } else {
    originX = Math.min(maxOriginX, Math.max(originX, minOriginX));
    originY = Math.min(maxOriginY, Math.max(originY, minOriginY));
  }
}
document.addEventListener('keydown', function (event) {
  const key = event.key;

  switch (key) {
    case 'ArrowUp':
      panUp();
      break;
    case 'ArrowDown':
      panDown();
      break;
    case 'ArrowLeft':
      panLeft();
      break;
    case 'ArrowRight':
      panRight();
      break;
    case '+':
      zoomIn();
      break;
    case '-':
      zoomOut();
      break;
  }
});
};