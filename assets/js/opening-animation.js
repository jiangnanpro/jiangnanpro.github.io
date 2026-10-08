(function () {
  var timeline;
  var entranceStarted = false;
  var handoffStarted = false;
  var homepageBlocks;

  // Start preparing visible homepage assets while the name animation runs.
  var homepageReady = Promise.allSettled([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    ...Array.from(document.querySelectorAll('.homepage-layout img')).map(function (image) {
      image.loading = 'eager';
      if (image.closest('.about-photo')) image.fetchPriority = 'high';
      if (image.decode) return image.decode();
      if (image.complete) return Promise.resolve();
      return new Promise(function (resolve) {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    })
  ]);

  function prepareHomepage() {
    if (homepageBlocks || typeof gsap === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    homepageBlocks = document.querySelectorAll('.homepage-identity .post-header, .homepage-identity .section-nav, #about .homepage-section-title, #about .about-photo, #about article > .clearfix > *, #about article > .social');
    homepageBlocks.forEach(function (block) { block.classList.add('homepage-reveal'); });
    gsap.set(homepageBlocks, { y: 20, opacity: 0 });
  }

  function animateHomepage() {
    if (entranceStarted || typeof gsap === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    entranceStarted = true;
    prepareHomepage();
    var blocks = homepageBlocks;
    gsap.to(blocks, {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: function () { gsap.set(blocks, { clearProps: 'transform,opacity' }); }
    });
  }

  function beginHandoff() {
    if (handoffStarted) return;
    handoffStarted = true;
    document.removeEventListener('click', skipAnimation);
    document.removeEventListener('scroll', skipAnimation);
    document.removeEventListener('keydown', skipAnimation);

    try {
      sessionStorage.setItem('opening_seen', '1');
    } catch (error) {}

    document.documentElement.classList.add('opening-handoff');
    document.documentElement.classList.remove('opening-ready', 'opening-armed');
    if (!window.location.hash) window.scrollTo(0, 0);
    window.dispatchEvent(new Event('homepage-opening-complete'));
    animateHomepage();
  }

  function revealPage() {
    beginHandoff();
    document.documentElement.classList.remove('opening-handoff');
  }

  function skipAnimation() {
    if (timeline) {
      timeline.progress(1).pause();
    }
    revealPage();
  }

  if (!document.documentElement.classList.contains('opening-armed')) {
    return;
  }
  prepareHomepage();
  if (window.__openingGsapFailed || typeof gsap === 'undefined') {
    revealPage();
    return;
  }

  document.addEventListener('click', skipAnimation);
  document.addEventListener('scroll', skipAnimation);
  document.addEventListener('keydown', skipAnimation);

  gsap.set('.opening-letter', {
  y: 0,
  yPercent: 110,
  autoAlpha: 1
  });

  timeline = gsap.timeline({
    defaults: { ease: 'expo.inOut' },
    onComplete: revealPage
  });

  timeline
    .to('.opening-letter', {
      y: 0,
      yPercent: 0,
      duration: 0.8,
      ease: 'expo.out',
      stagger: 0.02,
    }, 0)
    .addPause('+=0.35', function () {
      // Keep the name visible if a slower connection needs a little longer.
      homepageReady.then(function () {
        if (!handoffStarted) timeline.resume();
      });
    })
    .to('.opening-letter', {
      ease: 'none',
      keyframes: [
        { yPercent: -12, duration: 0.18, ease: 'power2.out' },
        { yPercent: 110, duration: 0.45, ease: 'power2.in' }
      ],
      stagger: { each: 0.045, from: 'start' }
    })
    .call(beginHandoff)
    .to('.opening-overlay', {
      autoAlpha: 0,
      duration: 0.35,
      ease: 'power2.inOut'
    });

  document.documentElement.classList.add('opening-ready');
}());
