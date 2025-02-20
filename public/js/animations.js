// Counter animation function
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / target));
    const timer = setInterval(() => {
        start += increment;
        element.textContent = start;
        if (start === target) {
            clearInterval(timer);
        }
    }, stepTime);
}

// Circular progress bar animation
function animateCircularProgress(element, percentage) {
    element.style.background = `conic-gradient(#0d6efd 0% ${percentage}%, #e9ecef ${percentage}% 100%)`;
}

// Fade in animation on scroll
function createObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-visible');
            }
        });
    }, {
        threshold: 0.1
    });

    // Observe fade-in elements
    document.querySelectorAll('.fade-in').forEach(element => {
        observer.observe(element);
    });
}

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
    // Initialize circular progress bars
    document.querySelectorAll('.progress-circle').forEach(circle => {
        const percentage = parseInt(circle.getAttribute('data-percentage'));
        animateCircularProgress(circle, percentage);
        
        // Update the percentage text
        const percentageText = circle.querySelector('.progress-percentage');
        if (percentageText) {
            animateCounter(percentageText, percentage);
        }
    });

    // Initialize fade-in animations
    createObserver();
});
