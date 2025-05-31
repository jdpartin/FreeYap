// Help Page JavaScript Functionality

// Global variables
let allFaqItems = [];
let allCategories = [];

// Search functionality
const searchInput = document.getElementById('faqSearch');
const clearButton = document.getElementById('clearSearch');
const categories = document.querySelectorAll('.faq-category');
const faqItems = document.querySelectorAll('.faq-item');
const noResults = document.querySelector('.no-results');

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeFAQ();
  setupSearch();
  setupQuickLinks();
});

function initializeFAQ() {
  allFaqItems = document.querySelectorAll('.faq-item');
  allCategories = document.querySelectorAll('.faq-category');
  
  // Initialize all categories as expanded with proper heights
  allCategories.forEach(category => {
    const content = category.querySelector('.faq-category-content');
    const header = category.querySelector('.faq-category-header');
    
    // Ensure category starts expanded
    header.classList.remove('collapsed');
    content.classList.remove('collapsed');
    
    // Set initial height
    content.style.maxHeight = 'none';
    const height = content.scrollHeight;
    content.style.maxHeight = height + 'px';
  });
}

function setupSearch() {
  const searchInput = document.getElementById('faqSearch');
  const clearButton = document.getElementById('clearSearch');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      
      if (query.length > 0) {
        clearButton.style.display = 'block';
        performSearch(query);
      } else {
        clearButton.style.display = 'none';
        clearSearch();
      }
    });
  }
  
  if (clearButton) {
    clearButton.addEventListener('click', function() {
      searchInput.value = '';
      clearButton.style.display = 'none';
      clearSearch();
      searchInput.focus();
    });
  }
}

function setupQuickLinks() {
  const quickLinks = document.querySelectorAll('.quick-link');
  
  quickLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const categoryId = this.getAttribute('data-category');
      const category = document.getElementById(categoryId);
      
      if (category) {
        // Expand the category
        expandCategory(categoryId);
        
        // Scroll to category
        category.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Add highlight effect
        category.style.boxShadow = '0 0 20px rgba(255, 77, 109, 0.3)';
        setTimeout(() => {
          category.style.boxShadow = '';
        }, 2000);
      }
    });
  });
}

function performSearch(query) {
  let hasResults = false;
  
  allCategories.forEach(category => {
    let categoryHasResults = false;
    const items = category.querySelectorAll('.faq-item');
    
    items.forEach(item => {
      const question = item.querySelector('.faq-question-text').textContent.toLowerCase();
      const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
      
      if (question.includes(query) || answer.includes(query)) {
        item.classList.remove('hidden');
        categoryHasResults = true;
        hasResults = true;
        
        // Highlight search terms
        highlightSearchTerms(item, query);
      } else {
        item.classList.add('hidden');
      }
    });
    
    if (categoryHasResults) {
      category.classList.remove('hidden');
      expandCategory(category.id);
    } else {
      category.classList.add('hidden');
    }
  });
  
  // Show/hide no results message
  const noResults = document.getElementById('noResults');
  if (noResults) {
    if (hasResults) {
      noResults.classList.remove('show');
    } else {
      noResults.classList.add('show');
    }
  }
}

function highlightSearchTerms(item, query) {
  const question = item.querySelector('.faq-question-text');
  const answer = item.querySelector('.faq-answer');
  
  if (question && answer) {
    // Remove existing highlights
    question.innerHTML = question.textContent;
    answer.innerHTML = answer.textContent;
    
    // Add new highlights
    const regex = new RegExp(`(${query})`, 'gi');
    question.innerHTML = question.innerHTML.replace(regex, '<span class="highlight">$1</span>');
    answer.innerHTML = answer.innerHTML.replace(regex, '<span class="highlight">$1</span>');
  }
}

function clearSearch() {
  // Show all categories and items
  allCategories.forEach(category => {
    category.classList.remove('hidden');
    const items = category.querySelectorAll('.faq-item');
    items.forEach(item => {
      item.classList.remove('hidden');
      
      // Remove highlights
      const question = item.querySelector('.faq-question-text');
      const answer = item.querySelector('.faq-answer');
      if (question && answer) {
        question.innerHTML = question.textContent;
        answer.innerHTML = answer.textContent;
      }
    });
  });
  
  // Hide no results message
  const noResults = document.getElementById('noResults');
  if (noResults) {
    noResults.classList.remove('show');
  }
}

function toggleCategory(categoryId) {
  const category = document.getElementById(categoryId);
  const header = category.querySelector('.faq-category-header');
  const content = category.querySelector('.faq-category-content');
  
  if (content.classList.contains('collapsed')) {
    expandCategory(categoryId);
  } else {
    collapseCategory(categoryId);
  }
}

function expandCategory(categoryId) {
  const category = document.getElementById(categoryId);
  const header = category.querySelector('.faq-category-header');
  const content = category.querySelector('.faq-category-content');
  
  header.classList.remove('collapsed');
  content.classList.remove('collapsed');
  
  // Use a small delay to ensure DOM is updated before calculating height
  setTimeout(() => {
    content.style.maxHeight = content.scrollHeight + 'px';
  }, 10);
}

function updateCategoryHeight(category) {
  const content = category.querySelector('.faq-category-content');
  if (!content.classList.contains('collapsed')) {
    // Force recalculation of scrollHeight
    content.style.maxHeight = 'none';
    const newHeight = content.scrollHeight;
    content.style.maxHeight = newHeight + 'px';
  }
}

function collapseCategory(categoryId) {
  const category = document.getElementById(categoryId);
  const header = category.querySelector('.faq-category-header');
  const content = category.querySelector('.faq-category-content');
  
  header.classList.add('collapsed');
  content.classList.add('collapsed');
  content.style.maxHeight = '0';
}

function toggleFAQ(button) {
  const item = button.closest('.faq-item');
  const answer = item.querySelector('.faq-answer');
  const isActive = button.classList.contains('active');
  const category = item.closest('.faq-category');
  
  // Close all other FAQ items in the same category
  const otherItems = category.querySelectorAll('.faq-item');
  otherItems.forEach(otherItem => {
    if (otherItem !== item) {
      const otherButton = otherItem.querySelector('.faq-question');
      const otherAnswer = otherItem.querySelector('.faq-answer');
      otherButton.classList.remove('active');
      otherAnswer.classList.remove('active');
    }
  });
  
  // Toggle current item
  if (isActive) {
    button.classList.remove('active');
    answer.classList.remove('active');
  } else {
    button.classList.add('active');
    answer.classList.add('active');
  }
  
  // Update category height after FAQ toggle
  setTimeout(() => {
    updateCategoryHeight(category);
  }, 300); // Wait for FAQ animation to complete
}

// Contact Form Handler
function initializeContactForm() {
  const contactForm = document.getElementById('contactForm');
  
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitButton = contactForm.querySelector('.contact-submit');
      const originalText = submitButton.innerHTML;
      
      // Show loading state
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      submitButton.disabled = true;
      
      // Get form data
      const formData = new FormData(contactForm);
      const contactData = {
        subject: formData.get('subject'),
        message: formData.get('message'),
        email: formData.get('email')
      };
      
      try {
        // Send to backend API
        const response = await fetch('/api/contact/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(contactData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Reset form
          contactForm.reset();
          
          // Show success message
          submitButton.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
          submitButton.style.background = '#28a745';
          
          // Show success notification
          showNotification('Your message has been sent successfully! We\'ll get back to you soon.', 'success');
          
        } else {
          throw new Error(result.error || 'Failed to send message');
        }
        
      } catch (error) {
        console.error('Failed to send contact form:', error);
        
        // Show error message
        submitButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error - Try Again';
        submitButton.style.background = '#dc3545';
        
        // Show error notification with mailto fallback
        showNotification('Failed to send message. Opening email client as backup...', 'error');
        
        // Fallback to mailto after a delay
        setTimeout(() => {
          const mailtoSubject = `FreeYap Help: ${contactData.subject}`;
          const mailtoBody = `${contactData.message}${contactData.email ? `\n\nReply to: ${contactData.email}` : ''}`;
          const mailtoLink = `mailto:help@freeyap.com?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`;
          window.location.href = mailtoLink;
        }, 1500);
      }
      
      // Reset button after 3 seconds
      setTimeout(() => {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
        submitButton.style.background = '';
      }, 3000);
    });
  }
}

// Notification helper function
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Style the notification
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10000;
    max-width: 400px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Initialize contact form when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeContactForm);
