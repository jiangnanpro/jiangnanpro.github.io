(function () {
  'use strict';
  var pending;
  var testName = new URLSearchParams(window.location.search).get('test-location');
  var testReveal = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) &&
    ['hainan-beijing', 'luxembourg-sydney', 'valletta-athens'].includes(testName);
  // Explicit local preview only; no permission request or mock data on the live site.
  window.previewDeviceLocation = testReveal ? function (success) {
    setTimeout(function () {
      success({ coords: testName === 'valletta-athens'
        ? { latitude: 37.9838, longitude: 23.7275 }
        : testName === 'luxembourg-sydney'
        ? { latitude: -33.8688, longitude: 151.2093 }
        : { latitude: 39.9042, longitude: 116.4074 } });
    }, 1800);
  } : null;
  // The contact map and distance calculator share one visitor lookup.
  window.getVisitorLocation = function () {
    if (testReveal && testName === 'valletta-athens') return Promise.resolve({
      success: true, country_code: 'MT', city: 'Valletta',
      latitude: 35.8992, longitude: 14.5141
    });
    if (testReveal && testName === 'luxembourg-sydney') return Promise.resolve({
      success: true, country_code: 'LU', city: 'Luxembourg',
      latitude: 49.6116, longitude: 6.1319
    });
    if (testReveal) return Promise.resolve({
      success: true, country_code: 'CN', city: 'Haikou',
      latitude: 20.044, longitude: 110.1999
    });
    if (!pending) {
      pending = (async function () {
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 8000);
        try {
          var response = await fetch('https://ipwho.is/', {
            signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'
          });
          if (!response.ok) throw new Error('Location unavailable');
          var location = await response.json();
          if (location.success !== true) throw new Error('Location unavailable');
          return location;
        } finally {
          clearTimeout(timeout);
        }
      }()).catch(function (error) { pending = null; throw error; });
    }
    return pending;
  };
}());
