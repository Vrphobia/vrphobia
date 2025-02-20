document.addEventListener('DOMContentLoaded', function() {
    const circles = document.querySelectorAll('.circular-progress');
    
    function animateCircle(circle) {
        const value = parseInt(circle.dataset.value);
        const valueDisplay = circle.querySelector('.progress-value');
        
        // Start from 0
        let currentValue = 0;
        circle.style.setProperty('--progress', '0deg');
        valueDisplay.textContent = '0%';
        
        // Animate to target value
        const duration = 2000; // 2 seconds
        const startTime = performance.now();
        
        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            currentValue = Math.floor(progress * value);
            valueDisplay.textContent = currentValue + '%';
            circle.style.setProperty('--progress', `${currentValue * 3.6}deg`);
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        }
        
        requestAnimationFrame(updateValue);
    }
    
    // Start animation when element becomes visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCircle(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    circles.forEach(circle => observer.observe(circle));
});
