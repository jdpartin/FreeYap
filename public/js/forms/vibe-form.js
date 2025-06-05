document.addEventListener('DOMContentLoaded', function() {
    const slidingToggles = document.querySelectorAll('.sliding-toggle');
    
    slidingToggles.forEach(toggle => {
        const track = toggle.querySelector('.sliding-track');
        const indicator = toggle.querySelector('.sliding-indicator');
        const options = toggle.querySelectorAll('.toggle-option');
        const hiddenInput = toggle.querySelector('input[type="hidden"]');
          // Initialize the slider position
        function updateSliderPosition(activeIndex) {
            // Calculate the correct position: each option takes up 33.333% of the track
            // Position 0: 0%, Position 1: 100%, Position 2: 200%
            const percentage = activeIndex * 100;
            indicator.style.transform = `translateX(${percentage}%)`;
        }
        
        // Set initial position
        const activeOption = toggle.querySelector('.toggle-option.active');
        if (activeOption) {
            const activeIndex = Array.from(options).indexOf(activeOption);
            updateSliderPosition(activeIndex);
        }
        
        options.forEach((option, index) => {
            option.addEventListener('click', function() {
                // Remove active class from all options in this toggle
                options.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to clicked option
                this.classList.add('active');
                
                // Update slider position
                updateSliderPosition(index);
                
                // Update hidden input value
                if (hiddenInput) {
                    hiddenInput.value = this.getAttribute('data-value');
                }
                
                // Add haptic feedback on mobile
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }            });
        });    });    // Load saved preferences on form initialization
    function loadSavedPreferences() {
        try {
            // Check both localStorage and cookies for preferences
            let preferences = null;
            
            // Try localStorage first
            const savedPrefs = localStorage.getItem('freeyap_vibe_preferences');
            if (savedPrefs) {
                preferences = JSON.parse(savedPrefs);
            } else {
                // Fall back to cookies
                const cookiePrefs = getCookie('freeyap_vibe_preferences');
                if (cookiePrefs) {
                    preferences = JSON.parse(cookiePrefs);
                }
            }
            
            if (preferences) {
                console.log('Loading saved preferences:', preferences);
                
                // Set nudity preference
                const nuditySlider = document.getElementById('nuditySlider');
                const nudityToggle = document.querySelector('[data-name="nudityPreference"]');
                if (nuditySlider && nudityToggle) {
                    nuditySlider.value = preferences.nudityPreference || 0;
                    const nudityOptions = nudityToggle.querySelectorAll('.toggle-option');
                    nudityOptions.forEach(option => option.classList.remove('active'));
                    const nudityActiveOption = nudityToggle.querySelector(`[data-value="${preferences.nudityPreference || 0}"]`);
                    if (nudityActiveOption) {
                        nudityActiveOption.classList.add('active');
                        // Update slider position
                        const index = Array.from(nudityOptions).indexOf(nudityActiveOption);
                        const indicator = nudityToggle.querySelector('.sliding-indicator');
                        if (indicator) {
                            indicator.style.transform = `translateX(${index * 100}%)`;
                        }
                    }
                }
                
                // Set gore preference
                const goreSlider = document.getElementById('goreSlider');
                const goreToggle = document.querySelector('[data-name="gorePreference"]');
                if (goreSlider && goreToggle) {
                    goreSlider.value = preferences.gorePreference || 0;
                    const goreOptions = goreToggle.querySelectorAll('.toggle-option');
                    goreOptions.forEach(option => option.classList.remove('active'));
                    const goreActiveOption = goreToggle.querySelector(`[data-value="${preferences.gorePreference || 0}"]`);
                    if (goreActiveOption) {
                        goreActiveOption.classList.add('active');
                        // Update slider position
                        const index = Array.from(goreOptions).indexOf(goreActiveOption);
                        const indicator = goreToggle.querySelector('.sliding-indicator');
                        if (indicator) {
                            indicator.style.transform = `translateX(${index * 100}%)`;
                        }
                    }
                }
                
                // Set save preferences checkbox based on saved setting
                const saveCheckbox = document.getElementById('savePreferences');
                if (saveCheckbox) {
                    saveCheckbox.checked = preferences.savePreferences !== false; // Default to true
                }
            }
        } catch (error) {
            console.warn('Could not load saved preferences:', error);
        }
    }

    // Cookie utility functions
    function setCookie(name, value, days = 365) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    }

    function deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
    }
    
    // Load preferences after a short delay to ensure DOM is ready
    setTimeout(loadSavedPreferences, 100);

    // Handle form submission
    document.getElementById('vibeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nudityPreference = document.getElementById('nuditySlider').value;
        const gorePreference = document.getElementById('goreSlider').value;
        const savePreferences = document.getElementById('savePreferences').checked;
          // Store preferences
        const preferences = {
            nudityPreference: parseInt(nudityPreference),
            gorePreference: parseInt(gorePreference),
            savePreferences: savePreferences
        };
        
        console.log('Content preferences saved:', preferences);
        
        // Always save preferences to both localStorage AND cookies regardless of checkbox status
        const preferencesToSave = {
            nudityPreference: parseInt(nudityPreference),
            gorePreference: parseInt(gorePreference),
            savePreferences: savePreferences,
            timestamp: Date.now()
        };
        
        try {
            // Save to localStorage
            localStorage.setItem('freeyap_vibe_preferences', JSON.stringify(preferencesToSave));
            console.log('Preferences saved to localStorage');
        } catch (error) {
            console.warn('Could not save preferences to localStorage:', error);
        }
        
        try {
            // Save to cookies (always, regardless of checkbox status)
            setCookie('freeyap_vibe_preferences', JSON.stringify(preferencesToSave), 365);
            console.log('Preferences saved to cookies');
        } catch (error) {
            console.warn('Could not save preferences to cookies:', error);
        }
          // Continue to selected chat mode or just close overlay based on button text
        const submitText = document.getElementById('vibeFormSubmitText');
        const isNSFWSettingsMode = submitText && submitText.textContent === 'Save';
        
        if (!isNSFWSettingsMode && window.selectedChatMode) {
            // Regular video chat flow - navigate to chat
            const topicInput = document.getElementById('topicInput');
            const inputText = topicInput ? topicInput.value.trim() : '';
            
            if (inputText !== '' && window.topics && window.topics.length < 10) {
                // Process the topic input before navigating
                if (window.procesTopicAndNavigate) {
                    window.procesTopicAndNavigate(inputText, window.selectedChatMode);
                }
            } else {
                // No input text, navigate directly with existing topics
                const topics = window.topics || [];
                const queryParams = new URLSearchParams({ topics: JSON.stringify(topics) });
                window.location.href = `${window.selectedChatMode}?${queryParams}`;
            }
        }
        
        // Hide overlay
        if (window.hideVibeOverlay) {
            window.hideVibeOverlay();
        }
    });
    
    // Handle cancel button
    document.getElementById('cancelVibeForm').addEventListener('click', function() {
        // Hide overlay
        if (window.hideVibeOverlay) {
            window.hideVibeOverlay();
        }
    });
    
    // Handle backdrop click to close overlay
    const overlay = document.getElementById('vibeOverlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay || e.target.classList.contains('vibe-overlay-backdrop')) {
                if (window.hideVibeOverlay) {
                    window.hideVibeOverlay();
                }
            }
        });
    }
});