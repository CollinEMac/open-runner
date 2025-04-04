// js/utils/deviceUtils.js

import { createLogger } from './logger.js';

const logger = createLogger('DeviceUtils');

/**
 * Checks if the current device is a mobile device
 * @returns {boolean} True if the device is mobile, false otherwise
 */
export function isMobileDevice() {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileByUserAgent = mobileRegex.test(navigator.userAgent);
    const isMobileByScreenSize = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

    const result = isMobileByUserAgent || isMobileByScreenSize;
    logger.debug(`Device detection: isMobile=${result} (userAgent=${isMobileByUserAgent}, screenSize=${isMobileByScreenSize})`);

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

    if (forceHide) {
        // Force hide mobile controls
        document.body.classList.remove('show-mobile-controls');
        logger.debug('Mobile controls forcibly hidden');
    } else if (forceShow) {
        // Force show mobile controls
        document.body.classList.add('show-mobile-controls');
        logger.debug('Mobile controls forcibly shown');
    } else {
        // Normal behavior - only show on mobile
        if (isMobileDevice()) {
            document.body.classList.add('show-mobile-controls');
            logger.debug('Mobile controls enabled for mobile device');
        } else {
            document.body.classList.remove('show-mobile-controls');
            logger.debug('Mobile controls disabled for desktop device');
        }
    }
}
