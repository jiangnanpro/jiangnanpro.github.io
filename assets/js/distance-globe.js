(function () {
  var libraryReady;
  var countriesReady;
  var labelFontReady;
  var labelFontUrl = new URL('../fonts/roboto/you-bold.typeface.json', document.currentScript.src).href;

  function loadLabelFont() {
    if (!labelFontReady) {
      labelFontReady = fetch(labelFontUrl).then(function (response) {
        if (!response.ok) throw new Error('Label font unavailable');
        return response.json();
      }).catch(function (error) { labelFontReady = null; throw error; });
    }
    return labelFontReady;
  }
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

  function animateFlight(globe, office, visitor) {
    if (globe.flightCleanup) globe.flightCleanup();
    clearTimeout(globe.arrivalRippleTimer);
    globe.ringsData([]);
    if (!visitor) return;
    var THREE = globe.flightThree;
    var route = flightPath(office, visitor).points;
    var vertices = route.map(function (point) {
      var xyz = globe.getCoords(point[1], point[0], point[2]);
      return new THREE.Vector3(xyz.x, xyz.y, xyz.z);
    });
    var group = new THREE.Group();
    var material = new THREE.MeshBasicMaterial({ color: '#d94740' });
    var curve = new THREE.CatmullRomCurve3(vertices);
    var segments = Math.max(128, vertices.length * 2);
    var tube = new THREE.TubeGeometry(curve, segments, 0.5, 8, false);
    var line = new THREE.Mesh(tube, material);
    group.add(line);
    var plane = new THREE.Group();
    // A raised fuselage and extruded swept wings make a small, solid 3D silhouette.
    var bodyGeometry = new THREE.CylinderGeometry(0.28, 0.42, 3.8, 12);
    var body = new THREE.Mesh(bodyGeometry, material);
    plane.add(body);
    function wing(outline, depth) {
      var shape = new THREE.Shape();
      outline.forEach(function (point, i) { if (i) shape.lineTo(...point); else shape.moveTo(...point); });
      shape.closePath();
      var geometry = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
      geometry.translate(0, 0, -depth / 2);
      plane.add(new THREE.Mesh(geometry, material));
    }
    wing([[-2.5, -0.7], [-2.5, -0.1], [0, 1], [2.5, -0.1], [2.5, -0.7], [0, 0]], 0.18);
    wing([[-1, -1.7], [-1, -1.3], [0, -0.8], [1, -1.3], [1, -1.7]], 0.15);
    var finGeometry = new THREE.BoxGeometry(0.14, 0.9, 0.9);
    var fin = new THREE.Mesh(finGeometry, material);
    fin.position.set(0, -1.2, 0.4);
    plane.add(fin);
    group.add(plane);
    var labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    var labelContext = labelCanvas.getContext('2d');
    var labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    var labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide });
    var distanceLabel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), labelMaterial);
    distanceLabel.scale.set(23, 5.75, 1);
    distanceLabel.visible = false;
    group.add(distanceLabel);
    var radians = Math.PI / 180;
    var distanceDot = Math.sin(office.lat * radians) * Math.sin(visitor.lat * radians) +
      Math.cos(office.lat * radians) * Math.cos(visitor.lat * radians) * Math.cos((visitor.lng - office.lng) * radians);
    var totalKm = 6371 * Math.acos(Math.max(-1, Math.min(1, distanceDot)));
    // Below this distance, the fixed-size trailing label crowds the office pin.
    var showFloatingDistance = totalKm >= 3000;
    var previousKm = -1;
    globe.scene().add(group);
    tube.setDrawRange(0, 0);
    plane.visible = false;
    var frame, rippleFrame, elapsed = 0, previous, initialView, flightComplete = false;
    var rippleMaterial;
    var cameraLeadIn = 700;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Short routes arrive quickly; long routes remain comfortable to watch.
    var duration = Math.max(800, Math.min(6500, 600 + totalKm * 0.5));
    function tick(time) {
      var canvas = globe.renderer().domElement;
      var bounds = canvas.getBoundingClientRect();
      var visibleHeight = Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0);
      var panel = canvas.closest('.distance-globe');
      var ready = panel && panel.querySelector('.distance-globe-status').hidden;
      var visible = !document.hidden && ready && visibleHeight >= bounds.height * 0.6;
      if (!visible) {
        previous = undefined;
        frame = requestAnimationFrame(tick);
        return;
      }
      if (!initialView) {
        initialView = globe.pointOfView();
        var controls = globe.controls();
        var damping = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = damping;
      }
      if (previous !== undefined) elapsed += Math.max(0, Math.min(time - previous, 50));
      previous = time;
      var progress = reduced ? 1 : Math.max(0, Math.min(1, (elapsed - cameraLeadIn) / duration));
      if (!reduced && elapsed < cameraLeadIn) {
        var t = elapsed / cameraLeadIn;
        t = t * t * (3 - 2 * t);
        var longitudeDelta = ((office.lng - initialView.lng + 540) % 360) - 180;
        globe.pointOfView({
          lat: initialView.lat + (office.lat - initialView.lat) * t,
          lng: initialView.lng + longitudeDelta * t,
          altitude: initialView.altitude + (2.5 - initialView.altitude) * t
        }, 0);
      } else if (!reduced && !flightComplete) {
        var target = globe.toGeoCoords(curve.getPointAt(progress));
        globe.pointOfView({ lat: target.lat, lng: target.lng, altitude: 2.5 }, 0);
      }
      var position = curve.getPointAt(progress);
      var forward = curve.getTangentAt(progress).normalize();
      var up = position.clone().normalize();
      var right = new THREE.Vector3().crossVectors(forward, up).normalize();
      up.crossVectors(right, forward).normalize();
      plane.position.copy(position);
      plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, forward, up));
      tube.setDrawRange(0, Math.floor(progress * segments) * 8 * 6);
      plane.visible = !reduced && elapsed >= cameraLeadIn;
      distanceLabel.visible = plane.visible && showFloatingDistance;
      labelMaterial.opacity = 1;
      // A fixed frame on the elevated route, independent of the camera.
      // Text trails the aircraft and sits just beside the curve at the same height.
      var labelProgress = Math.max(0, progress - 12 / Math.max(1, curve.getLength()));
      var labelPosition = curve.getPointAt(labelProgress);
      var labelForward = curve.getTangentAt(labelProgress).normalize();
      var labelRadial = labelPosition.clone().normalize();
      var labelSide = new THREE.Vector3().crossVectors(labelRadial, labelForward).normalize();
      var labelNormal = new THREE.Vector3().crossVectors(labelForward, labelSide).normalize();
      distanceLabel.position.copy(labelPosition).addScaledVector(labelSide, 3.5);
      distanceLabel.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(labelForward, labelSide, labelNormal));
      var kilometres = Math.round(totalKm * progress);
      if (kilometres !== previousKm) {
        previousKm = kilometres;
        globe.flightContainer.dispatchEvent(new CustomEvent('globe-flight-progress', {
          detail: { visitor: visitor, distance: totalKm * progress, complete: progress === 1 }
        }));
        labelContext.clearRect(0, 0, 512, 128);
        labelContext.font = '700 80px Roboto, Arial, sans-serif';
        labelContext.textAlign = 'center';
        labelContext.textBaseline = 'middle';
        var distanceText = kilometres.toLocaleString() + ' km';
        labelContext.fillStyle = '#d94740';
        labelContext.fillText(distanceText, 256, 64);
        labelTexture.needsUpdate = true;
      }
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else if (!flightComplete) {
        flightComplete = true;
        plane.visible = false;
        distanceLabel.visible = showFloatingDistance;
        globe.flightContainer.dispatchEvent(new CustomEvent('globe-flight-progress', {
          detail: { visitor: visitor, distance: totalKm, complete: true }
        }));
        var marker = { lat: visitor.lat, lng: visitor.lng, name: 'You', visitor: true, scale: 1 };
        globe.pointsTransitionDuration(reduced ? 0 : 450).labelsTransitionDuration(reduced ? 0 : 450)
          .pointsData([office, marker]).labelsData([marker]);
        if (!reduced) {
          // A filled band has visible thickness, unlike the native one-pixel ring.
          rippleMaterial = new THREE.MeshBasicMaterial({
            color: '#d94740', transparent: true, opacity: 0.95,
            side: THREE.DoubleSide, depthWrite: false
          });
          var ripple = new THREE.Mesh(new THREE.RingGeometry(0.78, 1, 96), rippleMaterial);
          var landing = globe.getCoords(visitor.lat, visitor.lng, 0.032);
          ripple.position.set(landing.x, landing.y, landing.z);
          ripple.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ripple.position.clone().normalize());
          group.add(ripple);
          var rippleStart;
          function expandRipple(time) {
            if (rippleStart === undefined) rippleStart = time;
            var t = Math.min(1, (time - rippleStart) / 1600);
            var radius = 0.8 + 10 * (1 - Math.pow(1 - t, 2));
            ripple.scale.set(radius, radius, 1);
            rippleMaterial.opacity = 0.95 * (1 - t * t);
            if (t < 1) rippleFrame = requestAnimationFrame(expandRipple);
            else ripple.visible = false;
          }
          rippleFrame = requestAnimationFrame(expandRipple);
        }
        // Freeze this geographic position and orientation; free rotation changes
        // only the view, never the final label's placement beside the route.
        var arrivalView = globe.pointOfView();
        var returnElapsed = 0;
        var returnPrevious;
        function returnNorth(time) {
          var rect = globe.renderer().domElement.getBoundingClientRect();
          var visible = !document.hidden && rect.bottom > 0 && rect.top < window.innerHeight;
          if (visible && returnPrevious !== undefined) {
            returnElapsed += Math.max(0, Math.min(time - returnPrevious, 50));
          }
          returnPrevious = visible ? time : undefined;
          // Let the arrival label and ripple register before moving the camera.
          var progress = reduced ? 1 : Math.max(0, Math.min(1, (returnElapsed - 1200) / 1000));
          var eased = progress * progress * (3 - 2 * progress);
          globe.camera().up.set(0, 1, 0);
          globe.pointOfView({
            lat: arrivalView.lat + (15 - arrivalView.lat) * eased,
            lng: arrivalView.lng,
            altitude: arrivalView.altitude
          }, 0);
          // Stop updating the camera once north-up is restored, allowing free rotation.
          if (progress < 1) frame = requestAnimationFrame(returnNorth);
        }
        frame = requestAnimationFrame(returnNorth);
      }
    }
    globe.flightCleanup = function () {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(rippleFrame);
      globe.scene().remove(group);
      group.traverse(function (object) { if (object.geometry) object.geometry.dispose(); });
      material.dispose();
      labelTexture.dispose();
      labelMaterial.dispose();
      if (rippleMaterial) rippleMaterial.dispose();
    };
    tick(performance.now());
  }

  function setLocations(globe, office, visitor) {
    if (visitor && globe.flightVisitor === visitor) return;
    globe.pointsData([office]).labelsData([]).htmlElementsData([office])
      .pathsData(globe.countryBorders);
    if (globe.flightVisitor !== visitor) {
      globe.flightVisitor = visitor;
      animateFlight(globe, office, visitor);
    }
  }

  window.renderDistanceGlobe = async function (container, visitor) {
    var panel = container.querySelector('.distance-globe');
    if (!panel) return;
    var office = { lat: Number(container.dataset.latitude), lng: Number(container.dataset.longitude) };
    panel.pendingVisitor = visitor;
    if (panel.globeInstance) {
      if (visitor) { setLocations(panel.globeInstance, office, visitor); panel.hasVisitor = true; }
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
      var assets = await Promise.all([loadLibrary(), loadCountries(), import('https://cdn.jsdelivr.net/npm/three@0.185.0/+esm'), loadLabelFont()]);
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
        .polygonsData(assets[1]).polygonAltitude(0.01).polygonCapCurvatureResolution(1)
        .polygonSideColor(() => '#bfbfbc').polygonLabel(() => '')
        .polygonStrokeColor(() => null)
        .polygonsTransitionDuration(0)
        // Match the original polygon outline height with a slightly wider flat line.
        .pathsData(borders).pathPoints('points')
        .pathPointLat(point => point[1]).pathPointLng(point => point[0])
        .pathPointAlt(point => point[2] === undefined ? 0.0101 : point[2])
        .pathResolution(0.5).pathStroke(path => path.flight ? 2.5 : 1.25).pathTransitionDuration(0)
        .pointAltitude(0.025).pointRadius(point => 0.7 * (point.visitor ? point.scale : 1)).pointLabel('name').pointsTransitionDuration(0)
        .labelTypeFace(assets[3]).labelText('name').labelSize(label => 3.5 * (label.scale || 1))
        .labelDotRadius(label => 0.45 * (label.scale || 1)).labelAltitude(0.04)
        .labelDotOrientation(() => 'bottom')
        .labelLabel(() => '').labelsTransitionDuration(0)
        .htmlLat('lat').htmlLng('lng').htmlAltitude(0.025)
        .htmlElement(createOfficePin).htmlTransitionDuration(0)
        .ringLat('lat').ringLng('lng').ringAltitude(0.026)
        .ringColor(() => t => 'rgba(217,71,64,' + (1 - t) + ')')
        .ringMaxRadius(4).ringPropagationSpeed(3).ringRepeatPeriod(2500);
      globe.flightThree = assets[2];
      globe.flightContainer = container;
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
      // Solid, double-sided coastal walls join the raised land to the ocean.
      var coast = land.clone();
      coast.side = assets[2].DoubleSide;
      globe.polygonCapMaterial(() => land).polygonSideMaterial(() => coast)
        .pathColor(path => path.flight ? '#d94740' : '#7c828b')
        .pointColor(() => '#d94740').arcColor(() => '#d94740')
        .labelColor(label => label.distance ? '#d94740' : '#253042');
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
        if (panel.globeInstance.flightCleanup) panel.globeInstance.flightCleanup();
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
