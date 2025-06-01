
document.addEventListener('DOMContentLoaded', function() {
    const featureForm = document.getElementById('featureRequestForm');
    const submitBtn = document.getElementById('submitFeatureBtn');
    const messagesDiv = document.getElementById('featureFormMessages');
    
    // Character count tracking
    const titleInput = document.getElementById('featureTitle');
    const descriptionTextarea = document.getElementById('featureDescription');
    const useCaseTextarea = document.getElementById('featureUseCase');
    const userImpactTextarea = document.getElementById('featureUserImpact');
    
    // Add character counters
    function addCharacterCounter(element, maxLength, containerId) {
        const counter = document.createElement('small');
        counter.className = 'text-muted float-end';
        counter.style.marginTop = '0.25rem';
        
        function updateCounter() {
            const remaining = maxLength - element.value.length;
            counter.textContent = `${element.value.length}/${maxLength}`;
            counter.style.color = remaining < 50 ? '#dc3545' : '#6c757d';
        }
        
        element.addEventListener('input', updateCounter);
        element.parentNode.appendChild(counter);
        updateCounter();
    }
    
    addCharacterCounter(titleInput, 200);
    addCharacterCounter(descriptionTextarea, 2000);
    addCharacterCounter(useCaseTextarea, 1000);
    addCharacterCounter(userImpactTextarea, 1000);
    
    function showMessage(message, type = 'success') {
        messagesDiv.innerHTML = `
            <div class="alert alert-${type === 'success' ? 'success' : 'danger'}" role="alert" style="border-radius: 6px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
                ${message}
            </div>
        `;
        
        // Scroll to message
        messagesDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                messagesDiv.innerHTML = '';
            }, 5000);
        }
    }
    
    featureForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset previous messages
        messagesDiv.innerHTML = '';
        
        // Disable submit button and show loading state
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        try {
            const formData = new FormData(featureForm);
            const requestData = {
                title: formData.get('title'),
                description: formData.get('description'),
                category: formData.get('category'),
                userEmail: formData.get('userEmail'),
                useCase: formData.get('useCase'),
                userImpact: formData.get('userImpact')
            };
            
            const response = await fetch('/api/contact/feature-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                featureForm.reset();
                
                // Reset character counters
                document.querySelectorAll('.text-muted.float-end').forEach(counter => {
                    if (counter.textContent.includes('/')) {
                        const maxLength = counter.textContent.split('/')[1];
                        counter.textContent = `0/${maxLength}`;
                        counter.style.color = '#6c757d';
                    }
                });
            } else {
                showMessage(result.error || 'Failed to send feature request. Please try again.', 'error');
            }
            
        } catch (error) {
            console.error('Feature request submission error:', error);
            showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
    
    // Auto-resize textareas
    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
    
    [descriptionTextarea, useCaseTextarea, userImpactTextarea].forEach(textarea => {
        textarea.addEventListener('input', () => autoResize(textarea));
        autoResize(textarea); // Initial resize
    });
});