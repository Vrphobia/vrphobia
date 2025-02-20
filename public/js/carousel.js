document.addEventListener('DOMContentLoaded', function() {
    // Initialize carousel with custom settings
    const carousel = new bootstrap.Carousel(document.querySelector('#serviceCarousel'), {
        interval: 5000, // Change slides every 5 seconds
        keyboard: true,
        pause: 'hover',
        touch: true
    });

    // Add smooth transitions
    const carouselElement = document.querySelector('#serviceCarousel');
    const items = carouselElement.querySelectorAll('.carousel-item');

    items.forEach(item => {
        // Add parallax effect on scroll
        item.addEventListener('wheel', (e) => {
            if (e.deltaY > 0) {
                carousel.next();
            } else {
                carousel.prev();
            }
        });

        // Add Ken Burns effect
        item.style.transform = 'scale(1.1)';
        item.style.transition = 'transform 10s ease-in-out';

        item.addEventListener('transitionend', () => {
            item.style.transform = 'scale(1)';
        });
    });

    // Add smooth caption animations
    const captions = carouselElement.querySelectorAll('.carousel-caption');
    captions.forEach(caption => {
        caption.style.opacity = '0';
        caption.style.transform = 'translateY(20px)';
        caption.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    });

    carouselElement.addEventListener('slide.bs.carousel', event => {
        // Hide caption of current slide
        const currentCaption = event.relatedTarget.querySelector('.carousel-caption');
        currentCaption.style.opacity = '0';
        currentCaption.style.transform = 'translateY(20px)';
        
        // Show caption of next slide with delay
        setTimeout(() => {
            currentCaption.style.opacity = '1';
            currentCaption.style.transform = 'translateY(0)';
        }, 500);
    });

    // Add touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    
    carouselElement.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    carouselElement.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        if (touchEndX < touchStartX) {
            carousel.next();
        }
        if (touchEndX > touchStartX) {
            carousel.prev();
        }
    }
});
