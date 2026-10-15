(function () {
  'use strict';
  var root = document.querySelector('.places-page');
  if (!root) return;
  var places = JSON.parse(document.getElementById('places-data').textContent);
  var byCode = new Map(places.map(function (place) { return [place.code, place]; }));
  var status = root.querySelector('.places-map-status');
  var dialog = document.querySelector('.places-lightbox');
  var selected, photoIndex = 0, opener;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var countryPaths;
  var navbar = document.getElementById('navbar');
  function sizeNavigation() {
    document.body.style.setProperty('--places-nav-height', (navbar ? navbar.getBoundingClientRect().height : 0) + 'px');
  }
  sizeNavigation();
  if (navbar) new ResizeObserver(sizeNavigation).observe(navbar);

  function updatePhoto() {
    var image = dialog.querySelector('img');
    image.hidden = !selected.photos.length;
    if (selected.photos.length) {
      image.src = selected.photos[photoIndex].src;
      image.alt = selected.name + ' — photograph ' + (photoIndex + 1);
    } else image.removeAttribute('src');
    dialog.querySelector('.places-lightbox-position').textContent = selected.name + (selected.photos.length ? ' · ' + (photoIndex + 1) + ' / ' + selected.photos.length : ' · Photos to come');
    dialog.querySelectorAll('[data-photo-action="previous"], [data-photo-action="next"]').forEach(function (button) {
      button.disabled = selected.photos.length < 2;
    });
  }
  function openPhoto(index, button) {
    photoIndex = index;
    opener = button;
    updatePhoto();
    dialog.showModal();
  }
  function selectPlace(code, updateHash, trigger) {
    var place = byCode.get(code);
    if (!place) return;
    selected = place;
    if (updateHash) {
      history.replaceState(null, '', '#' + code.toLowerCase());
      openPhoto(0, trigger);
    }
  }
  function selectFromHash() { selectPlace(location.hash.slice(1).toUpperCase(), false); }
  window.addEventListener('hashchange', selectFromHash);
  selectFromHash();
  dialog.addEventListener('click', function (event) {
    var action = event.target.closest('[data-photo-action]');
    if (action) {
      if (action.dataset.photoAction === 'close') dialog.close();
      else if (selected && selected.photos.length > 1) {
        photoIndex = (photoIndex + (action.dataset.photoAction === 'next' ? 1 : -1) + selected.photos.length) % selected.photos.length;
        updatePhoto();
      }
    } else if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', function (event) {
    if (['ArrowLeft', 'ArrowRight'].includes(event.key) && selected.photos.length > 1) {
      event.preventDefault();
      photoIndex = (photoIndex + (event.key === 'ArrowRight' ? 1 : -1) + selected.photos.length) % selected.photos.length;
      updatePhoto();
    }
  });
  dialog.addEventListener('close', function () { if (opener) opener.focus(); });

  async function drawMap() {
    try {
      if (!window.d3) throw new Error('Map library unavailable');
      var response = await fetch(root.dataset.countriesUrl);
      if (!response.ok) throw new Error('Country outlines unavailable');
      var countries = await response.json();
      // Keep the original framing while rendering Antarctica too.
      var framingCountries = { type: 'FeatureCollection', features: countries.features.filter(function (country) { return country.properties.code !== 'ATA'; }) };
      var svg = d3.select(root.querySelector('.places-map'));
      var width = svg.node().clientWidth;
      var height = svg.node().clientHeight;
      svg.attr('viewBox', '0 0 ' + width + ' ' + height);
      var projection = d3.geoMercator().fitExtent([[16, 24], [width - 16, height - 24]], framingCountries);
      var path = d3.geoPath(projection);
      svg.append('rect').attr('width', width).attr('height', height).attr('class', 'places-ocean');
      var layer = svg.append('g');
      var worldWidth = 2 * Math.PI * projection.scale();
      var northEdge = projection([0, 85.05112878])[1];
      var southEdge = projection([0, -85.05112878])[1];
      // Adjacent copies join the two halves of countries crossing the date line.
      function renderCountries() {
        layer.selectAll('.places-world').remove();
      var worlds = layer.selectAll('.places-world').data(d3.range(-Math.ceil(width / worldWidth) - 1, Math.ceil(width / worldWidth) + 2)).join('g')
        .attr('class', 'places-world')
        .attr('transform', function (copy) { return 'translate(' + copy * worldWidth + ',0)'; })
        .attr('aria-hidden', function (copy) { return copy === 0 ? null : 'true'; });
      countryPaths = worlds.selectAll('.places-country').data(countries.features).join('path')
        .attr('d', path).attr('class', 'places-country')
        .classed('is-visited', function (country) { return byCode.has(country.properties.code); })
        .attr('tabindex', function (country) { return byCode.has(country.properties.code) && this.parentNode.__data__ === 0 ? 0 : null; })
        .attr('role', function (country) { return byCode.has(country.properties.code) ? 'button' : null; })
        .attr('aria-label', function (country) { return country.properties.name + (byCode.has(country.properties.code) ? ' — view photographs' : ''); })
        .on('click', function (event, country) { selectPlace(country.properties.code, true, event.currentTarget); })
        .on('keydown', function (event, country) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPlace(country.properties.code, true, event.currentTarget); }
        });
      countryPaths.append('title').text(function (country) { return country.properties.name; });
      }
      renderCountries();
      var zoom = d3.zoom().scaleExtent([1, 6]).extent([[0, 0], [width, height]])
        .constrain(function (transform) {
          var period = worldWidth * transform.k;
          // Rebase after each world-width of travel so dragging never meets an edge.
          var center = width / 2 * (1 - transform.k);
          var x = center + ((transform.x - center + period / 2) % period + period) % period - period / 2;
          var y = (southEdge - northEdge) * transform.k < height ? height / 2 - (northEdge + southEdge) * transform.k / 2 : Math.max(height - southEdge * transform.k, Math.min(-northEdge * transform.k, transform.y));
          return d3.zoomIdentity.translate(x, y).scale(transform.k);
        })
        .filter(function (event) { return event.type === 'wheel' ? event.ctrlKey : !event.button; })
        .on('zoom', function (event) { layer.attr('transform', event.transform); });
      svg.call(zoom).on('dblclick.zoom', null);
      var initialScale = 1.1;
      var initialView = d3.zoomIdentity
        .translate(width / 2 * (1 - initialScale), height / 2 * (1 - initialScale))
        .scale(initialScale);
      svg.call(zoom.transform, initialView);
      svg.on('dblclick.reset', function (event) {
        event.preventDefault();
        var target = reducedMotion.matches ? svg.interrupt() : svg.interrupt().transition().duration(450);
        target.call(zoom.transform, initialView);
      });
      svg.node().addEventListener('wheel', function (event) {
        // Trackpad pinch emits Ctrl+wheel; leave that gesture to D3's zoom handler.
        if (event.ctrlKey) return;
        event.preventDefault();
        var bounds = svg.node().getBoundingClientRect();
        var transform = d3.zoomTransform(svg.node());
        var unitX = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.width : 1;
        var unitY = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1;
        var dx = event.deltaX * unitX;
        var dy = event.deltaY * unitY;
        if (event.shiftKey && !dx) { dx = dy; dy = 0; }
        svg.interrupt().call(zoom.translateBy,
          -dx * width / bounds.width / transform.k,
          -dy * height / bounds.height / transform.k);
      }, { passive: false });
      new ResizeObserver(function () {
        var nextWidth = svg.node().clientWidth;
        var nextHeight = svg.node().clientHeight;
        if (nextWidth === width && nextHeight === height) return;
        width = nextWidth;
        height = nextHeight;
        svg.attr('viewBox', '0 0 ' + width + ' ' + height);
        svg.select('.places-ocean').attr('width', width).attr('height', height);
        projection.fitExtent([[16, 24], [width - 16, height - 24]], framingCountries);
        worldWidth = 2 * Math.PI * projection.scale();
        northEdge = projection([0, 85.05112878])[1];
        southEdge = projection([0, -85.05112878])[1];
        renderCountries();
        zoom.extent([[0, 0], [width, height]]);
        initialView = d3.zoomIdentity.translate(width / 2 * (1 - initialScale), height / 2 * (1 - initialScale)).scale(initialScale);
        svg.interrupt().call(zoom.transform, initialView);
      }).observe(svg.node());
      status.hidden = true;
    } catch (error) {
      status.textContent = 'The map couldn’t load. Please refresh to try again.';
    }
  }
  drawMap();
}());
