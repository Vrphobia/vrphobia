// Performance Utilities
export class PerformanceUtils {
    static #observers = new Map();

    // Lazy Loading Images
    static initializeLazyLoading() {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img.lazy').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Resource Preloading
    static preloadCriticalResources(resources) {
        resources.forEach(resource => {
            if (resource.type === 'image') {
                const img = new Image();
                img.src = resource.url;
            } else if (resource.type === 'script') {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'script';
                link.href = resource.url;
                document.head.appendChild(link);
            }
        });
    }

    // Performance Monitoring
    static startPerformanceMonitoring() {
        // Monitor page load metrics
        window.addEventListener('load', () => {
            const metrics = {
                loadTime: performance.now(),
                resources: performance.getEntriesByType('resource'),
                navigation: performance.getEntriesByType('navigation')[0]
            };
            this.#logPerformanceMetrics(metrics);
        });

        // Monitor runtime performance
        this.#monitorRuntimePerformance();
    }

    static #monitorRuntimePerformance() {
        let frameCount = 0;
        let lastTime = performance.now();

        const checkFPS = () => {
            const currentTime = performance.now();
            const delta = currentTime - lastTime;
            
            if (delta >= 1000) {
                const fps = Math.round((frameCount * 1000) / delta);
                if (fps < 30) {
                    console.warn('Low FPS detected:', fps);
                }
                frameCount = 0;
                lastTime = currentTime;
            }
            
            frameCount++;
            requestAnimationFrame(checkFPS);
        };

        requestAnimationFrame(checkFPS);
    }

    // Cache Management
    static async initializeCache(cacheName) {
        const cache = await caches.open(cacheName);
        return cache;
    }

    static async cacheResources(cacheName, resources) {
        const cache = await this.initializeCache(cacheName);
        await cache.addAll(resources);
    }

    // DOM Performance
    static debouncedEventListener(element, eventType, callback, delay = 250) {
        let timeoutId;
        
        element.addEventListener(eventType, (event) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => callback(event), delay);
        });
    }

    static observeElementVisibility(element, callback) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => callback(entry.isIntersecting));
        });

        observer.observe(element);
        this.#observers.set(element, observer);

        return () => {
            observer.disconnect();
            this.#observers.delete(element);
        };
    }

    // Memory Management
    static cleanupResources() {
        // Clear all observers
        this.#observers.forEach(observer => observer.disconnect());
        this.#observers.clear();

        // Clear event listeners
        // Note: Only clears listeners added through our utility
        document.querySelectorAll('[data-has-listeners]').forEach(element => {
            element.replaceWith(element.cloneNode(true));
        });
    }

    // Error Tracking
    static #logPerformanceMetrics(metrics) {
        // In production, send to analytics service
        console.log('Performance Metrics:', metrics);
    }
}
