(function () {
  'use strict';
  var slots = document.querySelectorAll('.contact-map-slot');
  // Do not flash the snapshot before the country decision is available.
  slots.forEach(function (slot) { slot.classList.add('is-deciding'); });
  async function loadMap(slot) {
    if (slot.dataset.mapStarted) return;
    slot.dataset.mapStarted = 'true';
    try {
      var location = await window.getVisitorLocation();
      var country = String(location.country_code || '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(country)) throw new Error('Country unavailable');
      slot.dataset.mapCountry = country;
      if (country === 'CN') { slot.classList.remove('is-deciding'); return; }
      var frame = document.createElement('iframe');
      frame.className = 'contact-map contact-map-interactive';
      frame.title = 'Mercator I in Nijmegen on Google Maps';
      frame.width = '640';
      frame.height = '320';
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      frame.allowFullscreen = true;
      frame.onerror = function () {
        frame.remove();
        slot.classList.remove('is-interactive');
        slot.querySelector('.contact-map-preview').removeAttribute('aria-hidden');
      };
      frame.src = slot.dataset.googleMapSrc;
      slot.appendChild(frame);
      slot.querySelector('.contact-map-preview').setAttribute('aria-hidden', 'true');
      slot.classList.remove('is-deciding');
      slot.classList.add('is-interactive');
    } catch (error) {
      slot.classList.remove('is-deciding');
    }
  }
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        loadMap(entry.target);
      });
    }, { threshold: 0.1 });
    slots.forEach(function (slot) { observer.observe(slot); });
  } else slots.forEach(loadMap);
}());
