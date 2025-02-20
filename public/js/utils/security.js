// Security Utilities
export class SecurityUtils {
    static #csrfToken = null;

    // XSS Prevention
    static sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // CSRF Protection
    static async initializeCsrfProtection() {
        try {
            const response = await fetch('/api/security/csrf-token', {
                credentials: 'include'
            });
            const data = await response.json();
            this.#csrfToken = data.token;
            this.#setCsrfHeader();
        } catch (error) {
            console.error('CSRF initialization failed:', error);
            throw new Error('Security initialization failed');
        }
    }

    static #setCsrfHeader() {
        if (this.#csrfToken) {
            window.axios.defaults.headers.common['X-CSRF-Token'] = this.#csrfToken;
        }
    }

    // Token Management
    static getAuthToken() {
        return localStorage.getItem('token');
    }

    static isTokenValid(token) {
        if (!token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch {
            return false;
        }
    }

    // Request Security
    static secureRequest(options) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };

        if (this.#csrfToken) {
            headers['X-CSRF-Token'] = this.#csrfToken;
        }

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            },
            credentials: 'include'
        };
    }

    // Content Security
    static validateContentType(response) {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid content type');
        }
    }

    // Data Validation
    static validateData(data, schema) {
        // Basic schema validation
        for (const [key, rules] of Object.entries(schema)) {
            if (rules.required && !data[key]) {
                throw new Error(`${key} is required`);
            }
            if (rules.type && typeof data[key] !== rules.type) {
                throw new Error(`${key} must be of type ${rules.type}`);
            }
            if (rules.pattern && !rules.pattern.test(data[key])) {
                throw new Error(`${key} has invalid format`);
            }
        }
        return true;
    }

    // Session Security
    static initializeSecureSession() {
        // Set secure cookie attributes
        document.cookie = 'SameSite=Strict; Secure';
        
        // Clear sensitive data from localStorage on session end
        window.addEventListener('beforeunload', () => {
            this.clearSensitiveData();
        });
    }

    static clearSensitiveData() {
        const sensitiveKeys = ['token', 'user', 'sessionData'];
        sensitiveKeys.forEach(key => localStorage.removeItem(key));
    }
}
