// Accessibility Utilities
export class AccessibilityUtils {
    // ARIA Management
    static initializeAriaSupport() {
        this.updateAriaAttributes();
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
    }

    static updateAriaAttributes() {
        // Add missing ARIA labels
        document.querySelectorAll('button:not([aria-label])').forEach(button => {
            if (button.textContent) {
                button.setAttribute('aria-label', button.textContent.trim());
            }
        });

        // Add roles where missing
        document.querySelectorAll('.nav-item').forEach(item => {
            if (!item.getAttribute('role')) {
                item.setAttribute('role', 'navigation');
            }
        });

        // Update ARIA states
        document.querySelectorAll('[data-expandable]').forEach(element => {
            element.setAttribute('aria-expanded', 'false');
        });
    }

    // Keyboard Navigation
    static setupKeyboardNavigation() {
        // Add keyboard support for custom components
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.handleEscapeKey();
            }
        });

        // Make custom dropdowns keyboard accessible
        document.querySelectorAll('[role="combobox"]').forEach(dropdown => {
            this.makeDropdownAccessible(dropdown);
        });
    }

    static makeDropdownAccessible(dropdown) {
        const trigger = dropdown.querySelector('[aria-haspopup]');
        const menu = dropdown.querySelector('[role="listbox"]');

        if (!trigger || !menu) return;

        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
                trigger.setAttribute('aria-expanded', !isExpanded);
                menu.style.display = isExpanded ? 'none' : 'block';
            }
        });
    }

    // Focus Management
    static setupFocusManagement() {
        // Track focus
        document.addEventListener('focusin', (event) => {
            this.updateFocusIndicators(event.target);
        });

        // Manage focus trap for modals
        document.querySelectorAll('[role="dialog"]').forEach(modal => {
            this.setupFocusTrap(modal);
        });
    }

    static setupFocusTrap(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        event.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        event.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    // High Contrast Support
    static setupHighContrastSupport() {
        // Add high contrast specific styles
        const style = document.createElement('style');
        style.textContent = `
            @media (forced-colors: active) {
                .button {
                    border: 2px solid currentColor;
                }
                .icon {
                    forced-color-adjust: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Screen Reader Announcements
    static announce(message, priority = 'polite') {
        let announcer = document.getElementById('announcer');
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'announcer';
            announcer.setAttribute('aria-live', priority);
            announcer.classList.add('sr-only');
            document.body.appendChild(announcer);
        }

        // Clear previous announcement
        announcer.textContent = '';
        
        // Trigger announcement
        setTimeout(() => {
            announcer.textContent = message;
        }, 50);
    }

    // Helper Methods
    static updateFocusIndicators(element) {
        // Remove previous focus indicators
        document.querySelectorAll('.focus-visible').forEach(el => {
            el.classList.remove('focus-visible');
        });

        // Add new focus indicator
        if (element && !element.classList.contains('focus-visible')) {
            element.classList.add('focus-visible');
        }
    }

    static handleEscapeKey() {
        const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]');
        if (activeModal) {
            this.closeModal(activeModal);
        }
    }

    static closeModal(modal) {
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = 'none';
        
        // Restore focus to trigger element
        const triggerId = modal.getAttribute('data-trigger');
        if (triggerId) {
            const trigger = document.getElementById(triggerId);
            if (trigger) trigger.focus();
        }
    }
}
