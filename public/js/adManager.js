/**
 * FreeYap Ad Management System
 * Handles staggered ad loading and refresh cycles for mobile and desktop
 */

class AdManager
{    constructor()
    {
        this.isMobile = window.innerWidth <= 1399;
        this.refreshInterval = 30000; // 30 seconds
        this.staggerDelay = 15000; // 15 seconds stagger
        this.initialSecondaryDelay = 5000; // 5 seconds initial delay for secondary ad
        this.maxRetries = 3; // Maximum retry attempts for failed ad loads
        this.retryDelay = 2000; // 2 seconds between retries
        this.loadAttempts = {}; // Track retry attempts per ad type
          this.adConfigs = {
            mobile: {
                primary: {
                    key: '462098d511a0a1e01230e3f27effd314',
                    container: 'mobile-banner-top',
                    format: 'iframe',
                    height: 60,
                    width: 468,
                    description: ''
                },
                secondary: {
                    key: '444fe93084f49e0963997124939563ac',
                    container: 'mobile-banner-bottom',
                    format: 'iframe',
                    height: 50,
                    width: 320,
                    description: ''
                }
            },            desktop: {
                primary: {
                    key: '744beb8c9596767a79a65a75cde3eabd',
                    container: 'fixed-ad-right',
                    format: 'iframe',
                    height: 600,
                    width: 160,
                    description: 'These ads help keep FreeYap free'
                },                  
                secondary: {
                    key: '5eaed353afff2a51c8be72be62bb2dcf',
                    container: 'fixed-ad-left',
                    format: 'iframe',
                    height: 300,
                    width: 160,
                    description: 'We never collect or sell your data'
                }
            }
        };
        
        this.refreshTimers = {};
        this.isInitialized = false;
    }    
      /**
     * Initialize the ad system
     */
    init()
    {
        if (this.isInitialized) return;
        
        // Load primary ad immediately
        this.loadPrimaryAd();        // Load secondary ad after initial delay
        setTimeout(() => {
            this.loadSecondaryAd();
            this.startRefreshCycle();
        }, this.initialSecondaryDelay);
        
        this.isInitialized = true;
    }    
    
    /**
     * Load the primary ad
     */
    loadPrimaryAd()
    {
        const deviceType = this.isMobile ? 'mobile' : 'desktop';
        const config = this.adConfigs[deviceType].primary;
        
        this.loadAdWithCellularDetection('primary', config);
    }

    /**
     * Load the secondary ad
     */
    loadSecondaryAd()
    {
        const deviceType = this.isMobile ? 'mobile' : 'desktop';
        const config = this.adConfigs[deviceType].secondary;
        
        this.loadAdWithCellularDetection('secondary', config);
    }/**
     * Load an ad with the given configuration
     */
    loadAd(adType, config)
    {
        const container = document.querySelector(`[data-ad-container="${config.container}"]`);
        if (!container) {
            console.warn(`AdManager: Container ${config.container} not found`);
            return;
        }

        // Preserve existing description text
        let descriptionText = config.description || '';
        const existingDescElement = container.querySelector('.ad-description');
        if (existingDescElement) {
            descriptionText = existingDescElement.textContent.trim();
        }        // Clear existing ad content but preserve description
        const adScripts = container.querySelectorAll('script');
        adScripts.forEach(script => script.remove());
        
        // Remove any existing ad iframes
        const adIframes = container.querySelectorAll('iframe');
        adIframes.forEach(iframe => iframe.remove());
        
        // Remove any existing native ad containers
        const nativeContainers = container.querySelectorAll('[id^="container-"]');
        nativeContainers.forEach(div => div.remove());
        
        // Remove placeholder content
        const placeholderElements = container.querySelectorAll('.ad-placeholder, p:not(.ad-description)');
        placeholderElements.forEach(element => element.remove());

        // Ensure description element exists and is properly positioned
        if (descriptionText) {
            let descElement = container.querySelector('.ad-description');
            if (!descElement) {
                descElement = document.createElement('div');
                descElement.className = 'ad-description';
                container.insertBefore(descElement, container.firstChild);
            }
            descElement.textContent = descriptionText;
        }        
        
        // Create script elements based on format
        if (config.format === 'native') {
            return; // disable native ads for now

            // Native ad format with div container
            const containerDiv = document.createElement('div');
            containerDiv.id = `container-${config.key}`;
            
            const invokeScript = document.createElement('script');
            invokeScript.async = true;
            invokeScript.setAttribute('data-cfasync', 'false');
            invokeScript.src = `//orepassport.com/${config.key}/invoke.js`;
            
            // Add timestamp to force refresh
            invokeScript.src += `?t=${Date.now()}`;
            
            container.appendChild(containerDiv);
            container.appendChild(invokeScript);        
        } else {
            // Standard iframe format
            const optionsScript = document.createElement('script');
            optionsScript.type = 'text/javascript';
            optionsScript.textContent = `
                atOptions = {
                    'key': '${config.key}',
                    'format': '${config.format}',
                    'height': ${config.height},
                    'width': ${config.width},
                    'params': {}
                };
            `;

            const invokeScript = document.createElement('script');
            invokeScript.type = 'text/javascript';
            
            // Use HTTPS protocol for better cellular network compatibility
            const protocol = window.location.protocol === 'https:' ? 'https:' : 'https:';
            invokeScript.src = `${protocol}//orepassport.com/${config.key}/invoke.js`;

            // Add a timestamp to force refresh
            invokeScript.src += `?t=${Date.now()}`;

            // Add error handling for script loading failures
            invokeScript.onerror = () => {
                console.warn(`AdManager: Failed to load ad script for ${adType} on cellular network`);
                this.handleAdLoadFailure(adType, config);
            };

            // Add load success handler
            invokeScript.onload = () => {
                console.log(`AdManager: Successfully loaded ad script for ${adType}`);
                // Reset retry attempts on success
                this.loadAttempts[adType] = 0;
            };

            container.appendChild(optionsScript);
            container.appendChild(invokeScript);
        }
    }

    /**
     * Handle ad loading failures with retry logic
     */
    handleAdLoadFailure(adType, config)
    {
        if (!this.loadAttempts[adType]) {
            this.loadAttempts[adType] = 0;
        }

        this.loadAttempts[adType]++;

        if (this.loadAttempts[adType] < this.maxRetries) {
            console.log(`AdManager: Retrying ${adType} ad load (attempt ${this.loadAttempts[adType]}/${this.maxRetries})`);
            
            setTimeout(() => {
                this.loadAd(adType, config);
            }, this.retryDelay * this.loadAttempts[adType]); // Exponential backoff
        } else {
            console.warn(`AdManager: Max retries reached for ${adType} ad. Likely cellular network blocking.`);
            this.showFallbackMessage(config);
        }
    }

    /**
     * Show fallback message when ads fail to load
     */
    showFallbackMessage(config)
    {
        const container = document.querySelector(`[data-ad-container="${config.container}"]`);
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Add fallback message
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'ad-fallback';   
        fallbackDiv.innerHTML = `
            <div>📱 Ads blocked by cellular network</div>
        `;
        
        container.appendChild(fallbackDiv);
    }

    /**
     * Detect if user is likely on a cellular connection
     */
    isCellularConnection()
    {
        // Check if Network Information API is available
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                // Check for cellular connection types
                const cellularTypes = ['cellular', '2g', '3g', '4g', 'slow-2g'];
                return cellularTypes.includes(connection.effectiveType) || 
                       cellularTypes.includes(connection.type) ||
                       connection.downlink < 1; // Less than 1 Mbps typically indicates cellular
            }
        }
        
        // Fallback: Check if user agent indicates mobile and we're not on localhost
        return this.isMobile && !window.location.hostname.includes('localhost');
    }

    /**
     * Enhanced ad loading with cellular detection
     */
    loadAdWithCellularDetection(adType, config)
    {
        // If on cellular, show informative message immediately
        if (this.isCellularConnection()) {
            console.log('AdManager: Cellular connection detected, ads may be blocked by carrier');
            
            // Still try to load the ad, but with lower expectations
            this.loadAd(adType, config);
            
            // Set a shorter timeout for cellular connections
            setTimeout(() => {
                const container = document.querySelector(`[data-ad-container="${config.container}"]`);
                if (container) {
                    const hasLoadedAd = container.querySelector('iframe') || 
                                       container.querySelector('[id^="container-"]');
                    
                    if (!hasLoadedAd) {
                        this.showCellularFriendlyMessage(config);
                    }
                }
            }, 5000); // 5 second timeout for cellular
        } else {
            this.loadAd(adType, config);
        }
    }

    /**
     * Show a more user-friendly message for cellular users
     */
    showCellularFriendlyMessage(config)
    {
        const container = document.querySelector(`[data-ad-container="${config.container}"]`);
        if (!container) return;

        // Clear existing content except description
        const description = container.querySelector('.ad-description');
        container.innerHTML = '';
        if (description) {
            container.appendChild(description);
        }

        // Add cellular-friendly message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'cellular-message';
        messageDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">📱 Ads blocked by Cellular Connection.</div>
        `;
        
        container.appendChild(messageDiv);
    }

    /**
     * Start the refresh cycle with staggered timing
     */
    startRefreshCycle()
    {
        // Clear any existing timers
        this.clearRefreshTimers();

        // Primary ad refreshes every 30 seconds
        this.refreshTimers.primary = setInterval(() => {
            this.loadPrimaryAd();
        }, this.refreshInterval);        // Secondary ad refreshes every 30 seconds with 15 second offset
        this.refreshTimers.secondary = setInterval(() => {
            this.loadSecondaryAd();
        }, this.refreshInterval);

        // Start secondary refresh cycle with stagger delay
        setTimeout(() => {
            // Clear the secondary timer and restart with proper timing
            clearInterval(this.refreshTimers.secondary);            this.refreshTimers.secondary = setInterval(() => {
                this.loadSecondaryAd();
            }, this.refreshInterval);
        }, this.staggerDelay);
    }

    /**
     * Clear all refresh timers
     */
    clearRefreshTimers()
    {
        Object.values(this.refreshTimers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        this.refreshTimers = {};
    }

    /**
     * Handle window resize to detect device type changes
     */    handleResize()
    {
        const newIsMobile = window.innerWidth <= 1399;
        
        if (newIsMobile !== this.isMobile) {
            this.isMobile = newIsMobile;
            this.restart();
        }
    }

    /**
     * Restart the ad system
     */
    restart()
    {
        this.clearRefreshTimers();
        this.isInitialized = false;
        this.init();
    }

    /**
     * Cleanup when leaving the page
     */
    cleanup()
    {
        this.clearRefreshTimers();
    }
}

// Initialize ad manager when DOM is ready
document.addEventListener('DOMContentLoaded', function()
{
    if (typeof window.adManager === 'undefined') {
        window.adManager = new AdManager();
        window.adManager.init();

        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                window.adManager.handleResize();
            }, 250);
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            window.adManager.cleanup();
        });
    }
});
