(function () {
  'use strict';
  var pending;
  // The contact map and distance calculator share one visitor lookup.
  window.getVisitorLocation = function () {
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
