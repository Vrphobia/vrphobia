// ROI Calculator
document.addEventListener('DOMContentLoaded', function() {
    const roiForm = document.getElementById('roiForm');
    if (roiForm) {
        roiForm.addEventListener('submit', function(e) {
            e.preventDefault();
            calculateROI();
        });
    }
});

function calculateROI() {
    const employeeCount = parseFloat(document.getElementById('employeeCount').value);
    const avgSalary = parseFloat(document.getElementById('avgSalary').value);
    const absenteeismRate = parseFloat(document.getElementById('absenteeismRate').value) / 100;
    const turnoverRate = parseFloat(document.getElementById('turnoverRate').value) / 100;

    // Calculate savings
    const absenteeismSavings = employeeCount * avgSalary * absenteeismRate * 0.4; // Assume 40% reduction
    const productivityGains = employeeCount * avgSalary * 0.15; // Assume 15% productivity increase
    const totalSavings = absenteeismSavings + productivityGains;
    const programCost = employeeCount * 1200; // Assume 1200 TL per employee
    const roi = totalSavings / programCost;

    // Update UI
    document.getElementById('absenteeismSavings').textContent = `₺${numberWithCommas(Math.round(absenteeismSavings))}`;
    document.getElementById('productivityGains').textContent = `₺${numberWithCommas(Math.round(productivityGains))}`;
    document.getElementById('totalRoi').textContent = `${roi.toFixed(1)}x`;
    
    document.getElementById('roiResult').style.display = 'block';
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// VR Preview Modals
const vrModals = document.querySelectorAll('.vr-preview-card');
vrModals.forEach(card => {
    card.addEventListener('click', function() {
        // Show 360-degree preview or video demo
        const modalId = this.getAttribute('data-bs-target');
        const modal = new bootstrap.Modal(document.querySelector(modalId));
        modal.show();
    });
});

// Animate statistics on scroll
const stats = document.querySelectorAll('.display-4.text-primary');
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const statsObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const target = entry.target;
            const finalValue = parseInt(target.getAttribute('data-value'));
            animateValue(target, 0, finalValue, 2000);
            observer.unobserve(target);
        }
    });
}, observerOptions);

stats.forEach(stat => statsObserver.observe(stat));

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Initialize AOS
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS
    AOS.init({
        duration: 800,
        once: true
    });

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar scroll behavior
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        });
    }

    // Initialize counters
    const counterAnimation = () => {
        document.querySelectorAll('.counter-value').forEach(counter => {
            const target = parseInt(counter.dataset.target);
            const suffix = counter.dataset.suffix || '';
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current) + suffix;
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target + suffix;
                }
            };

            updateCounter();
        });
    };

    // Start counter animation when elements are in view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                counterAnimation();
                observer.unobserve(entry.target);
            }
        });
    });

    document.querySelectorAll('.counter-wrapper').forEach(wrapper => {
        observer.observe(wrapper);
    });
});
