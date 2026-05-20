// ==UserScript==
// @name         YouTube Music Ad Blocker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Remove ads and skip video ads from YouTube Music
// @author       taipgonesistema-cloud
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-start
// @homepage     https://github.com/taipgonesistema-cloud/taipgonesistema-cloud
// @supportURL   https://github.com/taipgonesistema-cloud/taipgonesistema-cloud/issues
// ==/UserScript==

(function () {
    'use strict';

    const adSelectors = [
        'ytmusic-mealbar-promo-renderer',
        '.ytmusic-mealbar-promo-renderer',
        '.ytd-banner-promo-renderer',
        '#player-ads',
        '.ad-showing',
        'ytmusic-navigation-button-renderer[aria-label*="Premium"]',
        'a[href*="premium"]',
        '.ytmusic-pivot-bar-renderer[tab-identifier*="FEmusic_premium"]',
    ];

    function removeAds() {
        adSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el && el.parentNode) el.remove();
            });
        });
    }

    function skipVideoAds() {
        const video = document.querySelector('video');
        if (!video || !video.duration) return;

        const isAd = document.querySelector('.ad-showing') ||
                     document.querySelector('.ytp-ad-player-overlay') ||
                     document.querySelector('.ytp-ad-image-overlay');

        if (isAd) {
            video.currentTime = video.duration;
            video.muted = true;
            const playBtn = document.querySelector('.ytp-play-button.ytp-button');
            if (playBtn) playBtn.click();
        }
    }

    function blockAdRequests() {
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
            if (url && (
                url.includes('googleads') ||
                url.includes('doubleclick') ||
                url.includes('pagead')
            )) {
                return Promise.resolve(new Response('', { status: 204 }));
            }
            return originalFetch.apply(this, args);
        };
    }

    removeAds();
    blockAdRequests();

    const observer = new MutationObserver(() => {
        removeAds();
        skipVideoAds();
    });

    window.addEventListener('load', () => {
        removeAds();
        skipVideoAds();
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
        setInterval(skipVideoAds, 1000);
    });

    document.addEventListener('yt-navigate-finish', () => {
        setTimeout(() => {
            removeAds();
            skipVideoAds();
        }, 500);
    });
})();
