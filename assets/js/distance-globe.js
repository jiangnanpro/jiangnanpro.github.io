(function () {
  var libraryReady;
  var countriesReady;
  var libraryUrl = 'https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js';
  var countriesUrl = 'https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/example/datasets/ne_110m_admin_0_countries.geojson';

  function loadLibrary() {
    if (window.Globe) return Promise.resolve();
    if (!libraryReady) {
      libraryReady = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = libraryUrl;
        script.onload = function () { clearTimeout(timeout); resolve(); };
        script.onerror = function () { clearTimeout(timeout); script.remove(); reject(new Error('Globe unavailable')); };
        var timeout = setTimeout(function () { script.onerror(); }, 15000);
        document.head.appendChild(script);
      }).catch(function (error) { libraryReady = null; throw error; });
    }
    return libraryReady;
  }

  function loadCountries() {
    if (!countriesReady) {
      countriesReady = fetch(countriesUrl, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) })
        .then(function (response) { if (!response.ok) throw new Error('Map unavailable'); return response.json(); })
        .then(function (data) { return data.features; })
        .catch(function (error) { countriesReady = null; throw error; });
    }
    return countriesReady;
  }

  var defaultView = { lat: 15, lng: 15, altitude: 2.5 };

  function createOfficePin() {
    var pin = document.createElement('div');
    pin.className = 'globe-office-pin';
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', 'My office');
    pin.style.cssText = 'width:22px;height:28px;pointer-events:none;';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '22');
    svg.setAttribute('height', '28');
    svg.style.transform = 'translateY(-50%)';
    var shape = document.createElementNS(svg.namespaceURI, 'path');
    shape.setAttribute('d', 'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Z');
    shape.setAttribute('fill', '#d94740');
    shape.setAttribute('stroke', '#f4f4f2');
    shape.setAttribute('stroke-width', '1');
    var center = document.createElementNS(svg.namespaceURI, 'circle');
    center.setAttribute('cx', '12');
    center.setAttribute('cy', '9');
    center.setAttribute('r', '2.5');
    center.setAttribute('fill', '#f4f4f2');
    svg.append(shape, center);
    pin.appendChild(svg);
    return pin;
  }

  function flightPath(start, end) {
    var radians = Math.PI / 180;
    function vector(location) {
      var lat = location.lat * radians, lng = location.lng * radians;
      return [Math.cos(lat) * Math.cos(lng), Math.sin(lat), Math.cos(lat) * Math.sin(lng)];
    }
    var a = vector(start), b = vector(end);
    var dot = Math.max(-1, Math.min(1, a.reduce((sum, value, i) => sum + value * b[i], 0)));
    var angle = Math.acos(dot);
    var tangent = b.map((value, i) => value - dot * a[i]);
    var length = Math.hypot(...tangent);
    if (length < 1e-8) {
      // Choose a stable great-circle plane for coincident or antipodal locations.
      var axis = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      var projection = axis.reduce((sum, value, i) => sum + value * a[i], 0);
      tangent = axis.map((value, i) => value - projection * a[i]);
      length = Math.hypot(...tangent);
    }
    tangent = tangent.map(value => value / length);
    var steps = Math.max(64, Math.ceil(angle / radians * 2));
    // Keep even intercontinental routes close to the globe: at most 4% above it.
    var lift = Math.min(0.015, angle * 0.01);
    return {
      flight: true,
      points: Array.from({ length: steps + 1 }, function (_, index) {
        var t = index / steps;
        var v = a.map((value, i) => value * Math.cos(angle * t) + tangent[i] * Math.sin(angle * t));
        return [Math.atan2(v[2], v[0]) / radians,
          Math.asin(Math.max(-1, Math.min(1, v[1]))) / radians,
          0.025 + lift * Math.sin(Math.PI * t)];
      })
    };
  }

  function setLocations(globe, office, visitor) {
    var markers = visitor ? [{ lat: visitor.lat, lng: visitor.lng, name: 'You' }] : [];
    globe.pointsData([office].concat(markers)).labelsData(markers).htmlElementsData([office])
      .pathsData(globe.countryBorders.concat(visitor ? [flightPath(office, visitor)] : []));
  }

  window.renderDistanceGlobe = async function (container, visitor) {
    var panel = container.querySelector('.distance-globe');
    if (!panel) return;
    var office = { lat: Number(container.dataset.latitude), lng: Number(container.dataset.longitude) };
    panel.pendingVisitor = visitor;
    if (panel.globeInstance) {
      if (visitor && !panel.hasVisitor) { setLocations(panel.globeInstance, office, visitor); panel.hasVisitor = true; }
      return;
    }
    if (panel.globeLoading) return;
    panel.hidden = false;
    panel.globeLoading = true;
    var status = panel.querySelector('.distance-globe-status');
    var mount = panel.querySelector('.distance-globe-canvas');
    mount.hidden = false;
    status.hidden = false;
    status.textContent = 'Preparing the globe…';
    try {
      var assets = await Promise.all([loadLibrary(), loadCountries()]);
      var borders = assets[1].flatMap(function (country) {
        var geometry = country.geometry;
        var polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        return polygons.flatMap(polygon => polygon.map(ring => ({ points: ring })));
      });
      var globe = new window.Globe(mount, { animateIn: false })
        .width(mount.clientWidth).height(mount.clientHeight)
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(false)
        // Keep polygon interiors above the ocean, including broad polar regions.
        .polygonsData(assets[1]).polygonAltitude(0.01).polygonCapCurvatureResolution(2)
        .polygonSideColor(() => null).polygonLabel(() => '')
        .polygonStrokeColor(() => null)
        .polygonsTransitionDuration(0)
        // Match the original polygon outline height with a slightly wider flat line.
        .pathsData(borders).pathPoints('points')
        .pathPointLat(point => point[1]).pathPointLng(point => point[0])
        .pathPointAlt(point => point[2] === undefined ? 0.0101 : point[2])
        .pathResolution(0.5).pathStroke(path => path.flight ? 2.5 : 1.25).pathTransitionDuration(0)
        .pointAltitude(0.025).pointRadius(0.7).pointLabel('name').pointsTransitionDuration(0)
        .labelText('name').labelSize(2.8).labelDotRadius(0.45).labelAltitude(0.04)
        .labelDotOrientation(() => 'bottom')
        .labelLabel(() => '').labelsTransitionDuration(0)
        .htmlLat('lat').htmlLng('lng').htmlAltitude(0.025)
        .htmlElement(createOfficePin).htmlTransitionDuration(0);
      globe.countryBorders = borders;
      setLocations(globe, office, panel.pendingVisitor);
      globe.camera().up.set(0, 1, 0);
      globe.pointOfView(defaultView, 0);
      panel.hasVisitor = !!panel.pendingVisitor;
      panel.globeInstance = globe;

      // Leave room around the sphere for the pin at the viewport edges.
      globe.camera().fov = 40;
      globe.camera().updateProjectionMatrix();
      var controls = globe.controls();
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.6;
      // A fixed palette and camera-relative key light keep the globe consistent in both themes.
      var ocean = globe.globeMaterial();
      ocean.color.set('#4d78c1');
      ocean.emissive.set('#000000');
      ocean.specular.set('#242424');
      ocean.shininess = 18;
      var land = ocean.clone();
      land.color.set('#bfbfbc');
      land.specular.set('#161616');
      land.shininess = 8;
      globe.polygonCapMaterial(() => land).polygonSideMaterial(() => land)
        .pathColor(path => path.flight ? '#d94740' : '#7c828b')
        .pointColor(() => '#d94740').arcColor(() => '#d94740')
        .labelColor(() => '#253042');
      var ambientLight = globe.lights().find(light => light.isAmbientLight);
      ambientLight.color.set('#ffffff');
      ambientLight.intensity = 1.2;
      var keyLight = globe.lights().find(light => light.isDirectionalLight);
      keyLight.color.set('#ffffff');
      keyLight.intensity = 2.4;
      function positionKeyLight() {
        globe.camera().updateMatrixWorld();
        keyLight.position.set(-250, 300, 100).applyMatrix4(globe.camera().matrixWorld);
      }
      controls.addEventListener('change', positionKeyLight);
      positionKeyLight();
      new ResizeObserver(function () { globe.width(mount.clientWidth).height(mount.clientHeight); }).observe(mount);
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && !document.hidden) globe.resumeAnimation();
        else { stopKeyboardRotation(); globe.pauseAnimation(); }
      }).observe(mount);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { stopKeyboardRotation(); globe.pauseAnimation(); }
        else if (mount.getBoundingClientRect().bottom > 0 && mount.getBoundingClientRect().top < innerHeight) globe.resumeAnimation();
      });
      var heldKeys = new Set();
      var keyboardFrame = null;
      var lastKeyboardTime;
      function stopKeyboardRotation() {
        heldKeys.clear();
        if (keyboardFrame !== null) cancelAnimationFrame(keyboardFrame);
        keyboardFrame = null;
      }
      function rotateWithKeyboard(time) {
        // Time-based steps avoid dependence on the operating system's key-repeat rate.
        var step = Math.min(50, time - lastKeyboardTime) * 0.05;
        lastKeyboardTime = time;
        var view = globe.pointOfView();
        view.lng += ((heldKeys.has('ArrowRight') ? 1 : 0) - (heldKeys.has('ArrowLeft') ? 1 : 0)) * step;
        view.lat = Math.max(-85, Math.min(85, view.lat + ((heldKeys.has('ArrowUp') ? 1 : 0) - (heldKeys.has('ArrowDown') ? 1 : 0)) * step));
        globe.pointOfView(view, 0);
        keyboardFrame = requestAnimationFrame(rotateWithKeyboard);
      }
      mount.addEventListener('keydown', function (event) {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        heldKeys.add(event.key);
        if (keyboardFrame === null) {
          lastKeyboardTime = performance.now();
          keyboardFrame = requestAnimationFrame(rotateWithKeyboard);
        }
      });
      window.addEventListener('keyup', function (event) {
        heldKeys.delete(event.key);
        if (!heldKeys.size) stopKeyboardRotation();
      });
      mount.addEventListener('dblclick', function (event) {
        event.preventDefault();
        stopKeyboardRotation();
        // Flush drag inertia before restoring the original camera position.
        var damping = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        globe.camera().up.set(0, 1, 0);
        var currentView = globe.pointOfView();
        // Take the shortest route across the longitude seam.
        var resetLongitude = currentView.lng + ((defaultView.lng - currentView.lng + 540) % 360 - 180);
        globe.pointOfView({ lat: defaultView.lat, lng: resetLongitude, altitude: defaultView.altitude }, 800);
        controls.enableDamping = damping;
        positionKeyLight();
      });
      mount.addEventListener('blur', stopKeyboardRotation);
      mount.addEventListener('pointerdown', stopKeyboardRotation);
      window.addEventListener('blur', stopKeyboardRotation);
      status.hidden = true;
    } catch (error) {
      if (panel.globeInstance) {
        panel.globeInstance.pauseAnimation();
        panel.globeInstance.renderer().dispose();
        panel.globeInstance = null;
      }
      mount.replaceChildren();
      mount.hidden = true;
      status.textContent = 'The globe couldn’t load right now.';
    } finally {
      panel.globeLoading = false;
    }
  };
}());
