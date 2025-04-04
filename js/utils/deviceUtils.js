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
 * Updates the mobile controls visibility based on device type
 * @param {boolean} [forceShow] - Optional parameter to force showing mobile controls regardless of device
 */
export function updateMobileControlsVisibility(forceShow = false) {
    if (forceShow || isMobileDevice()) {
        document.body.classList.add('show-mobile-controls');
        logger.debug('Mobile controls enabled');
    } else {
        document.body.classList.remove('show-mobile-controls');
        logger.debug('Mobile controls disabled');
    }
}
