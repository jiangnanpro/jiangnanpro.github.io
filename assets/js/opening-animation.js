(function () {
  var timeline;
  var entranceStarted = false;
  var homepageBlocks;

  function prepareHomepage() {
    if (homepageBlocks || typeof gsap === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    homepageBlocks = document.querySelectorAll('.post-header, .profile, .post article > .clearfix > *, .post article > .social');
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
      stagger: 0.08,
      ease: 'power2.out',
      onComplete: function () { gsap.set(blocks, { clearProps: 'transform,opacity' }); }
    });
  }

  function revealPage() {
    document.removeEventListener('click', skipAnimation);
    document.removeEventListener('scroll', skipAnimation);
    document.removeEventListener('keydown', skipAnimation);

    try {
      sessionStorage.setItem('opening_seen', '1');
    } catch (error) {}

    document.documentElement.classList.remove('opening-ready', 'opening-armed');
    window.scrollTo(0, 0);
    animateHomepage();
  }

  function skipAnimation() {
    if (timeline) {
      timeline.progress(1).pause();
    }
    revealPage();
  }

  prepareHomepage();

  if (!document.documentElement.classList.contains('opening-armed')) {
    animateHomepage();
    return;
  }
  if (window.__openingGsapFailed || typeof gsap === 'undefined') {
    revealPage();
    return;
  }

  document.addEventListener('click', skipAnimation);
  document.addEventListener('scroll', skipAnimation);
  document.addEventListener('keydown', skipAnimation);

  gsap.set('.opening-cube', {
    xPercent: -50,
    yPercent: -50,
    width: '0em',
    height: '0.82em',
    autoAlpha: 0
  });

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
    .addLabel('letters-complete', 1.04)
    .set('.opening-letter', { yPercent: 0 }, 'letters-complete')
    .to('.opening-gap', { width: '0.82em', duration: 1.1 }, 'letters-complete')
    .set('.opening-cube', { autoAlpha: 1 }, 'letters-complete')
    .to('.opening-cube', { width: '0.82em', duration: 1.1 }, 'letters-complete')
    .set('.opening-cube', {
      width: '220vmax',
      height: '220vmax',
      scale: function () {
        var nameSize = parseFloat(getComputedStyle(document.querySelector('.opening-name')).fontSize);
        return (0.82 * nameSize) / (2.2 * Math.max(window.innerWidth, window.innerHeight));
      }
    })
    .to('.opening-cube', {
      scale: 1,
      duration: 1,
      ease: 'power3.inOut'
    }, '+=0.2')
    .to('.opening-name-part', { autoAlpha: 1, duration: 0.25 }, '<0.15')
    .set('body > header, body > .container, body > footer', { autoAlpha: 1 })
    .addLabel('homepage-reveal')
    .to('.opening-overlay', {
      autoAlpha: 0,
      duration: 0.8,
      ease: 'power2.inOut'
    }, 'homepage-reveal')
    .call(animateHomepage, [], 'homepage-reveal');

  document.documentElement.classList.add('opening-ready');
}());
