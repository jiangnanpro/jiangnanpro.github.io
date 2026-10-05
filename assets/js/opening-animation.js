(function () {
  var timeline;

  function revealPage() {
    document.removeEventListener('click', skipAnimation);
    document.removeEventListener('scroll', skipAnimation);
    document.removeEventListener('keydown', skipAnimation);

    try {
      sessionStorage.setItem('opening_seen', '1');
    } catch (error) {}

    document.documentElement.classList.remove('opening-ready', 'opening-armed');
    window.scrollTo(0, 0);
  }

  function skipAnimation() {
    if (timeline) {
      timeline.progress(1).pause();
    }
    revealPage();
  }

  if (!document.documentElement.classList.contains('opening-armed')) return;
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
      stagger: 0.03,
    }, 0)
    .addLabel('letters-complete', 0.52)
    .set('.opening-letter', { yPercent: 0 }, 'letters-complete')
    .to('.opening-gap', { width: '0.82em', duration: 1.1 }, 'letters-complete')
    .set('.opening-cube', { autoAlpha: 1 }, 'letters-complete')
    .to('.opening-cube', { width: '0.82em', duration: 1.1 }, 'letters-complete')
    .to('.opening-cube', {
      width: '220vmax',
      height: '220vmax',
      duration: 1,
      ease: 'power3.inOut'
    }, '+=0.2')
    .to('.opening-name-part', { autoAlpha: 1, duration: 0.25 }, '<0.15')
    .to('.opening-overlay', {
      autoAlpha: 0,
      duration: 0.8,
      ease: 'power2.inOut'
    }, '+=0.1')
    .to('body > header, body > .container, body > footer', {
      autoAlpha: 1,
      duration: 0.3,
      ease: 'power2.inOut'
    }, '<');

  document.documentElement.classList.add('opening-ready');
}());
