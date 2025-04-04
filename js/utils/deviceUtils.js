// js/utils/deviceUtils.js

import { createLogger } from './logger.js';

const logger = createLogger('DeviceUtils');

/**
 * Checks if the current device is a mobile device
 * @returns {boolean} True if the device is mobile, false otherwise
 */
export function isMobileDevice() {
    // Check for mobile user agent
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileByUserAgent = mobileRegex.test(navigator.userAgent);

    // Check for touch capability (more reliable than screen size)
    const hasTouchScreen = (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0)
    );

    // Check for small screen size (but don't rely on this alone)
    const isMobileByScreenSize = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

    // For desktop browsers with small windows, we need to be more careful
    // Only consider it mobile if it has touch capability OR it's identified as mobile by user agent
    const result = isMobileByUserAgent || (hasTouchScreen && isMobileByScreenSize);

    // Add more detailed logging
    console.log(`DEVICE DETECTION: isMobile=${result}`);
    console.log(`- User Agent: ${navigator.userAgent}`);
    console.log(`- Is Mobile by User Agent: ${isMobileByUserAgent}`);
    console.log(`- Has Touch Screen: ${hasTouchScreen}`);
    console.log(`- Is Mobile by Screen Size: ${isMobileByScreenSize}`);
    console.log(`- Screen Width: ${window.innerWidth}px`);

    logger.debug(`Device detection: isMobile=${result} (userAgent=${isMobileByUserAgent}, touchScreen=${hasTouchScreen}, screenSize=${isMobileByScreenSize})`);

    return result;
}

/**
 * Sets the appropriate device class on the body element
 */
export function setDeviceClass() {
    const isMobile = isMobileDevice();

    // Remove any existing device classes
    document.body.classList.remove('mobile-device', 'desktop-device');

    // Add the appropriate device class
    if (isMobile) {
        document.body.classList.add('mobile-device');
        logger.debug('Device class set to mobile');
    } else {
        document.body.classList.add('desktop-device');
        logger.debug('Device class set to desktop');
    }
}

// Add a resize listener to update device class when window size changes
window.addEventListener('resize', () => {
    logger.debug('Window resized, updating device class');
    setDeviceClass();

    // If we're in a game state that should show mobile controls, update them
    if (document.body.classList.contains('show-mobile-controls')) {
        updateMobileControlsVisibility();
    }
});

/**
 * Updates the mobile controls visibility based on device type
 * @param {boolean} [forceShow] - Optional parameter to force showing mobile controls regardless of device
 * @param {boolean} [forceHide] - Optional parameter to force hiding mobile controls regardless of device
 */
export function updateMobileControlsVisibility(forceShow = false, forceHide = false) {
    // First ensure the device class is set
    setDeviceClass();

    // Get reference to mobile controls for debugging
    const mobileControls = document.getElementById('mobileControls');

    if (forceHide) {
        // Force hide mobile controls
        document.body.classList.remove('show-mobile-controls');
        logger.debug('Mobile controls forcibly hidden');
        console.log('MOBILE CONTROLS: Forcibly hidden');
    } else if (forceShow) {
        // Force show mobile controls
        document.body.classList.add('show-mobile-controls');
        logger.debug('Mobile controls forcibly shown');
        console.log('MOBILE CONTROLS: Forcibly shown');
    } else {
        // Normal behavior - only show on mobile
        if (isMobileDevice()) {
            document.body.classList.add('show-mobile-controls');
            logger.debug('Mobile controls enabled for mobile device');
            console.log('MOBILE CONTROLS: Enabled for mobile device');
        } else {
            document.body.classList.remove('show-mobile-controls');
            logger.debug('Mobile controls disabled for desktop device');
            console.log('MOBILE CONTROLS: Disabled for desktop device');
        }
    }

    // Debug the current state
    if (mobileControls) {
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(mobileControls);
            console.log('MOBILE CONTROLS STATE:');
            console.log(`- Display: ${computedStyle.display}`);
            console.log(`- Opacity: ${computedStyle.opacity}`);
            console.log(`- Visibility: ${computedStyle.visibility}`);
            console.log(`- Has 'show-mobile-controls' class: ${document.body.classList.contains('show-mobile-controls')}`);
        }, 100); // Small delay to let styles apply
    }
}
