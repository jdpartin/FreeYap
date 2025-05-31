/**
 * FreeYap Ad Management System
 * Handles staggered ad loading and refresh cycles for mobile and desktop
 */

class AdManager
{
    constructor()
    {
        this.isMobile = window.innerWidth <= 768;
        this.refreshInterval = 30000; // 30 seconds
        this.staggerDelay = 15000; // 15 seconds stagger
        this.initialSecondaryDelay = 5000; // 5 seconds initial delay for secondary ad
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
            },
            desktop: {
                primary: {
                    key: '744beb8c9596767a79a65a75cde3eabd',
                    container: 'fixed-ad-right',
                    format: 'iframe',
                    height: 600,
                    width: 160,
                    description: 'These ads help keep FreeYap free'
                },                
                secondary: {
                    key: '744beb8c9596767a79a65a75cde3eabd',
                    container: 'fixed-ad-left',
                    format: 'iframe',
                    height: 600,
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
        
        console.log(`AdManager: Initializing for ${this.isMobile ? 'mobile' : 'desktop'} device`);
        
        // Load primary ad immediately
        this.loadPrimaryAd();
        
        // Load secondary ad after initial delay
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
        
        this.loadAd('primary', config);
        console.log(`AdManager: Primary ${deviceType} ad loaded`);
    }

    /**
     * Load the secondary ad
     */
    loadSecondaryAd()
    {
        const deviceType = this.isMobile ? 'mobile' : 'desktop';
        const config = this.adConfigs[deviceType].secondary;
        
        this.loadAd('secondary', config);
        console.log(`AdManager: Secondary ${deviceType} ad loaded`);
    }    /**
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
        }

        // Clear existing ad content but preserve description
        const adScripts = container.querySelectorAll('script');
        adScripts.forEach(script => script.remove());
        
        // Remove any existing ad iframes
        const adIframes = container.querySelectorAll('iframe');
        adIframes.forEach(iframe => iframe.remove());

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

        // Create script elements
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
        invokeScript.src = `//orepassport.com/${config.key}/invoke.js`;

        // Add a timestamp to force refresh
        invokeScript.src += `?t=${Date.now()}`;

        container.appendChild(optionsScript);
        container.appendChild(invokeScript);
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
            console.log('AdManager: Primary ad refreshed');
        }, this.refreshInterval);

        // Secondary ad refreshes every 30 seconds with 15 second offset
        this.refreshTimers.secondary = setInterval(() => {
            this.loadSecondaryAd();
            console.log('AdManager: Secondary ad refreshed');
        }, this.refreshInterval);

        // Start secondary refresh cycle with stagger delay
        setTimeout(() => {
            // Clear the secondary timer and restart with proper timing
            clearInterval(this.refreshTimers.secondary);
            
            this.refreshTimers.secondary = setInterval(() => {
                this.loadSecondaryAd();
                console.log('AdManager: Secondary ad refreshed (staggered)');
            }, this.refreshInterval);
        }, this.staggerDelay);

        console.log('AdManager: Refresh cycle started with 15-second stagger');
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
     */
    handleResize()
    {
        const newIsMobile = window.innerWidth <= 768;
        
        if (newIsMobile !== this.isMobile) {
            console.log(`AdManager: Device type changed to ${newIsMobile ? 'mobile' : 'desktop'}`);
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
        console.log('AdManager: Cleaned up');
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
