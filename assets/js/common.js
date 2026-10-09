$(document).ready(function() {
    document.querySelectorAll('.contact-distance').forEach(function (container) {
        var result = container.querySelector('.distance-result');
        var cachedMessage;
        var loading = false;
        var cachedLocation;
        function showGlobe() {
            if (window.renderDistanceGlobe) window.renderDistanceGlobe(container, cachedLocation);
        }
        async function loadDistance() {
            if (cachedMessage) { result.textContent = cachedMessage; showGlobe(); return; }
            if (loading) return;
            loading = true;
            result.textContent = 'Estimating the distance…';
            var controller = new AbortController();
            var timeout = setTimeout(function () { controller.abort(); }, 8000);
            try {
                var response = await fetch('https://ipwho.is/', {
                    signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'
                });
                if (!response.ok) throw new Error('Location unavailable');
                var location = await response.json();
                var lat = location.latitude;
                var lon = location.longitude;
                if (location.success !== true || typeof lat !== 'number' || typeof lon !== 'number' ||
                    !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
                    throw new Error('Invalid location');
                }
                var radians = function (degrees) { return degrees * Math.PI / 180; };
                var officeLat = Number(container.dataset.latitude);
                var officeLon = Number(container.dataset.longitude);
                var a = Math.sin(radians(lat - officeLat) / 2) ** 2 +
                    Math.cos(radians(officeLat)) * Math.cos(radians(lat)) * Math.sin(radians(lon - officeLon) / 2) ** 2;
                var distance = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
                var rounded = Math.round(distance / 10) * 10;
                cachedMessage = rounded < 10
                    ? 'You’re approximately within 10 km of my office, based on your IP location.'
                    : 'You’re approximately ' + rounded.toLocaleString() + ' km from my office, based on your IP location.';
                cachedMessage += ' Straight-line distance.';
                result.textContent = cachedMessage;
                cachedLocation = { lat: lat, lng: lon };
                showGlobe();
            } catch (error) {
                result.textContent = 'Couldn’t estimate your location right now.';
                showGlobe();
            } finally {
                clearTimeout(timeout);
                loading = false;
            }
        }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) loadDistance();
            }, { threshold: 0.1 }).observe(container);
        } else loadDistance();
    });
    $('.bibtex.hidden pre').on('scroll', function () {
        var box = this;
        if (box.scrollLeft === (box.citationScrollLeft || 0)) return;
        box.citationScrollLeft = box.scrollLeft;
        box.classList.add('is-scrolling');
        clearTimeout(box.citationScrollTimer);
        box.citationScrollTimer = setTimeout(function () {
            box.classList.remove('is-scrolling');
        }, 900);
    });
    $('a.abstract').click(function() {
        $(this).parent().parent().find(".abstract.hidden").toggleClass('open');
    });
    $('.publication-citation').click(function() {
        var citation = $(this).closest('.row').find('.bibtex.hidden');
        var expanded = $(this).attr('aria-expanded') === 'true';
        var duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360;
        var panel = citation[0];
        var currentHeight = panel.getBoundingClientRect().height;
        var currentOpacity = getComputedStyle(panel).opacity;
        if (panel.citationAnimation) panel.citationAnimation.cancel();
        $(this).attr('aria-expanded', !expanded);
        citation.addClass('open');
        var targetHeight = panel.scrollHeight;
        panel.citationAnimation = panel.animate([
            { height: currentHeight + 'px', opacity: expanded ? currentOpacity : (currentHeight ? currentOpacity : 0) },
            { height: (expanded ? 0 : targetHeight) + 'px', opacity: expanded ? 0 : 1 }
        ], { duration: duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
        panel.citationAnimation.onfinish = function () {
            citation.toggleClass('open', !expanded);
            panel.citationAnimation.cancel();
            panel.citationAnimation = null;
        };
    });
    $('a').removeClass('waves-effect waves-light');
});

// Keep the navigation in sync with the visible homepage section.
document.addEventListener('DOMContentLoaded', function () {
    var sections = ['about', 'journey', 'publications', 'contact'].map(function (id) {
        return document.getElementById(id);
    });
    if (sections.some(function (section) { return !section; })) return;
    var mainContent = document.querySelector('.homepage-main');
    function updateContentFade() {
        if (!mainContent) return;
        var atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
        mainContent.classList.toggle('content-fade-disabled', atPageEnd);
        var mainTop = mainContent.getBoundingClientRect().top;
        var viewportEdge = window.innerHeight - mainTop;
        var aboutBottom = sections[0].getBoundingClientRect().bottom - mainTop;
        var experienceTop = sections[1].getBoundingClientRect().top - mainTop;
        var openingWeight = Math.max(0, 1 - window.scrollY / 160);
        var edge = viewportEdge + (Math.min(viewportEdge, experienceTop) - viewportEdge) * openingWeight;
        var start = edge - 180;
        start += (Math.min(aboutBottom, edge) - start) * openingWeight;
        mainContent.style.setProperty('--content-fade-start', start + 'px');
        mainContent.style.setProperty('--content-fade-edge', edge + 'px');
    }
    window.addEventListener('scroll', updateContentFade, { passive: true });
    window.addEventListener('resize', updateContentFade);
    window.addEventListener('pageshow', updateContentFade);
    if (mainContent && 'ResizeObserver' in window) new ResizeObserver(updateContentFade).observe(mainContent);
    updateContentFade();
    var cue = document.querySelector('.scroll-down-cue');
    var backToTop = document.querySelector('.back-to-top-cue');
    var identityHomeLink = document.querySelector('.identity-home-link');
    if (identityHomeLink) {
        identityHomeLink.addEventListener('click', function (event) {
            event.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
        });
    }
    var pageFooter = document.querySelector('body > footer');
    function positionBackToTop() {
        if (!backToTop) return;
        var defaultBottom = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5;
        var footerGap = 8;
        var footerOverlap = pageFooter ? Math.max(0, window.innerHeight - pageFooter.getBoundingClientRect().top) : 0;
        backToTop.style.bottom = Math.max(defaultBottom, footerOverlap + footerGap) + 'px';
    }
    if (backToTop) {
        window.addEventListener('scroll', positionBackToTop, { passive: true });
        window.addEventListener('resize', positionBackToTop);
        window.addEventListener('pageshow', positionBackToTop);
        if (pageFooter && 'ResizeObserver' in window) new ResizeObserver(positionBackToTop).observe(pageFooter);
        positionBackToTop();
        backToTop.addEventListener('click', function (event) {
            event.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
        });
    }
    var openingIdentity = document.querySelector('.homepage-identity');
    var browsingStarted = (!document.documentElement.classList.contains('opening-armed') && window.scrollY > 20) || (location.hash && location.hash !== '#about');
    var revealObserver;
    function positionOpeningAbout() {
        var about = sections[0];
        about.style.marginTop = '';
        if (openingIdentity) openingIdentity.style.transform = '';
        if (openingIdentity) openingIdentity.style.setProperty('--opening-spacing', '0px');
        if (!browsingStarted) {
            alignSectionHeadings();
            var rect = about.getBoundingClientRect();
            var offset = Math.max(0, (window.innerHeight - rect.height) / 2 - rect.top);
            about.style.marginTop = offset + 'px';
            if (openingIdentity && getComputedStyle(openingIdentity).position === 'sticky') {
                // Spread the extra opening height evenly above and below the navigation.
                var extraHeight = Math.max(0, rect.height - openingIdentity.getBoundingClientRect().height);
                openingIdentity.style.setProperty('--opening-spacing', extraHeight / 2 + 'px');
                var name = openingIdentity.querySelector('.post-title');
                var heading = about.querySelector('.homepage-section-title');
                var headerTransform = getComputedStyle(name.closest('.post-header')).transform;
                var entranceOffset = headerTransform === 'none' ? 0 : new DOMMatrixReadOnly(headerTransform).m42;
                var headingTransform = getComputedStyle(heading).transform;
                var headingEntranceOffset = headingTransform === 'none' ? 0 : new DOMMatrixReadOnly(headingTransform).m42;
                var identityOffset = heading.getBoundingClientRect().bottom - headingEntranceOffset - name.getBoundingClientRect().bottom + entranceOffset;
                openingIdentity.style.transform = 'translateY(' + identityOffset + 'px)';
            }
        }
    }
    sections.slice(1).forEach(function (section) { section.classList.add('scroll-pending'); });
    if ('IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting || !browsingStarted) return;
                entry.target.classList.remove('scroll-pending');
                entry.target.classList.add('scroll-revealed');
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    }
    function startBrowsing(force) {
        if (document.documentElement.classList.contains('opening-armed')) return;
        if (!browsingStarted && (force === true || window.scrollY > 20 || (location.hash && location.hash !== '#about'))) {
            browsingStarted = true;
            sections[0].classList.add('opening-about-transition');
            if (openingIdentity) openingIdentity.classList.add('opening-identity-transition');
            positionOpeningAbout();
            observeFollowingSections();
        }
        if (browsingStarted && cue) cue.classList.add('is-dismissed');
    }
    if (cue) {
        cue.addEventListener('click', function (event) {
            event.preventDefault();
            startBrowsing(true);
        });
    }
    function observeFollowingSections() {
        sections.slice(1).forEach(function (section) {
            if (revealObserver) revealObserver.observe(section);
            else section.classList.remove('scroll-pending');
        });
    }
    if (browsingStarted) observeFollowingSections();
    window.addEventListener('scroll', startBrowsing, { passive: true });
    window.addEventListener('hashchange', startBrowsing);
    window.addEventListener('pageshow', startBrowsing);
    window.addEventListener('resize', positionOpeningAbout);
    window.addEventListener('homepage-opening-complete', function () {
        if (!browsingStarted) positionOpeningAbout();
    });
    if (document.fonts) document.fonts.ready.then(positionOpeningAbout);
    requestAnimationFrame(positionOpeningAbout);
    startBrowsing();
    var mobileMenu = document.querySelector('.mobile-section-menu');
    var mobileToggle = mobileMenu && mobileMenu.querySelector('button');
    var mobileList = mobileMenu && mobileMenu.querySelector('ul');
    var mobileMenuAnimation;
    function setMobileMenuOpen(open) {
        if (!mobileMenu || (mobileToggle.getAttribute('aria-expanded') === 'true') === open) return;
        var startHeight = mobileList.hidden ? 0 : mobileList.getBoundingClientRect().height;
        var startOpacity = mobileList.hidden ? 0 : Number(getComputedStyle(mobileList).opacity);
        if (mobileMenuAnimation) mobileMenuAnimation.cancel();
        mobileList.hidden = false;
        mobileList.inert = !open;
        mobileToggle.setAttribute('aria-expanded', String(open));
        mobileToggle.setAttribute('aria-label', open ? 'Close section menu' : 'Open section menu');
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            mobileList.hidden = !open;
            return;
        }
        var animation = mobileList.animate([
            { height: startHeight + 'px', opacity: startOpacity },
            { height: (open ? mobileList.getBoundingClientRect().height : 0) + 'px', opacity: open ? 1 : 0 }
        ], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
        mobileMenuAnimation = animation;
        animation.finished.then(function () {
            if (mobileMenuAnimation !== animation) return;
            mobileList.hidden = !open;
            animation.cancel();
            mobileMenuAnimation = null;
        }).catch(function () {});
    }
    function closeMobileMenu() { setMobileMenuOpen(false); }
    if (mobileMenu) {
        mobileList.inert = true;
        mobileToggle.addEventListener('click', function () {
            setMobileMenuOpen(mobileToggle.getAttribute('aria-expanded') !== 'true');
        });
        document.addEventListener('click', function (event) {
            if (!mobileMenu.contains(event.target)) closeMobileMenu();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !mobileList.hidden) {
                closeMobileMenu();
                mobileToggle.focus();
            }
        });
    }
    var links = document.querySelectorAll('.section-nav a.nav-link, #navbarNav a.nav-link, .mobile-section-menu a');
    function alignSectionHeadings() {
        var identity = document.querySelector('.homepage-identity');
        var name = document.querySelector('.homepage-identity .post-title');
        if (!identity || !name) return;
        var sticky = getComputedStyle(identity).position === 'sticky';
        var nameHeight = name.getBoundingClientRect().height;
        var aboutHeading = sections[0].querySelector('.homepage-section-title');
        sections[0].style.paddingTop = sticky ? Math.max(0, nameHeight - aboutHeading.getBoundingClientRect().height) + 'px' : '';
        sections.forEach(function (section) {
            var heading = section.querySelector('.homepage-section-title');
            var headingOffset = heading.getBoundingClientRect().top - section.getBoundingClientRect().top;
            var offset = parseFloat(getComputedStyle(identity).top) + name.offsetTop + nameHeight - heading.getBoundingClientRect().height - headingOffset;
            section.style.scrollMarginTop = sticky ? offset + 'px' : (window.matchMedia('(max-width: 991px)').matches ? '24px' : '0px');
        });
    }
    var clickedSection = null;
    var navigationTimer;
    function releaseClickedSection() {
        clickedSection = null;
        clearTimeout(navigationTimer);
        updateNavigation();
    }
    function updateNavigation() {
        var navbar = document.getElementById('navbar');
        var sectionBoundary = (navbar ? navbar.getBoundingClientRect().bottom : 0) + 32;
        var current = 'about';
        sections.forEach(function (section) {
            var boundary = parseFloat(getComputedStyle(section).scrollMarginTop) || sectionBoundary;
            if (section.getBoundingClientRect().top <= boundary + 1) current = section.id;
        });
        if (clickedSection) current = clickedSection;
        if (backToTop) backToTop.hidden = current === 'about';
        if (mobileMenu) {
            mobileMenu.hidden = !window.matchMedia('(max-width: 991px)').matches || current === 'about';
            if (mobileMenu.hidden) closeMobileMenu();
        }
        links.forEach(function (link) {
            var selected = link.hash === '#' + current;
            link.parentElement.classList.toggle('active', selected);
            if (selected) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });

    }
    window.addEventListener('scroll', updateNavigation, { passive: true });
    window.addEventListener('scroll', function () {
        if (!clickedSection) return;
        clearTimeout(navigationTimer);
        navigationTimer = setTimeout(releaseClickedSection, 200);
    }, { passive: true });
    window.addEventListener('wheel', releaseClickedSection, { passive: true });
    window.addEventListener('touchstart', releaseClickedSection, { passive: true });
    window.addEventListener('resize', function () { alignSectionHeadings(); updateNavigation(); });
    window.addEventListener('pageshow', updateNavigation);
    alignSectionHeadings();
    updateNavigation();
    if (document.fonts) document.fonts.ready.then(function () { alignSectionHeadings(); updateNavigation(); });
    links.forEach(function (link) {
        link.addEventListener('click', function () {
            closeMobileMenu();
            clickedSection = link.hash.slice(1);
            clearTimeout(navigationTimer);
            updateNavigation();
            navigationTimer = setTimeout(releaseClickedSection, 2000);
            if (link.hash) $('#navbarNav').collapse('hide');
        });
    });
});
