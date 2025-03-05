const { ClientDetailsManager } = require('../public/js/client-details');
const { SecurityUtils } = require('../public/js/utils/security');
const { PerformanceUtils } = require('../public/js/utils/performance');
const { AccessibilityUtils } = require('../public/js/utils/accessibility');

describe('ClientDetailsManager', () => {
    let clientManager;
    let mockFetch;

    const mockClientData = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        department: 'IT',
        position: 'Developer',
        company: { name: 'Test Company' }
    };

    beforeEach(() => {
        // Mock fetch
        mockFetch = jest.fn(() => 
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockClientData)
            })
        );
        global.fetch = mockFetch;

        // Mock DOM elements
        document.body.innerHTML = `
            <div id="clientName"></div>
            <div id="clientEmail"></div>
            <div id="clientPhone"></div>
            <div id="clientDepartment"></div>
            <div id="clientPosition"></div>
            <div id="clientCompany"></div>
        `;

        // Initialize manager
        clientManager = new ClientDetailsManager();
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('Data Loading', () => {
        test('loads client data successfully', async () => {
            await clientManager.loadClientData();
            
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/clients/'),
                expect.any(Object)
            );

            expect(document.getElementById('clientName').textContent)
                .toBe(`${mockClientData.firstName} ${mockClientData.lastName}`);
            expect(document.getElementById('clientEmail').textContent)
                .toBe(mockClientData.email);
        });

        test('handles client data loading error', async () => {
            mockFetch.mockImplementationOnce(() => 
                Promise.reject(new Error('Network error'))
            );

            await expect(clientManager.loadClientData()).rejects.toThrow();
        });
    });

    describe('UI Updates', () => {
        test('updates UI with client data correctly', () => {
            clientManager.updateClientUI(mockClientData);

            expect(document.getElementById('clientName').textContent)
                .toBe(`${mockClientData.firstName} ${mockClientData.lastName}`);
            expect(document.getElementById('clientEmail').textContent)
                .toBe(mockClientData.email);
            expect(document.getElementById('clientPhone').textContent)
                .toBe(mockClientData.phone);
        });
    });
});

describe('SecurityUtils', () => {
    test('sanitizes input correctly', () => {
        const dirtyInput = '<script>alert("xss")</script>Hello';
        const cleanInput = SecurityUtils.sanitizeInput(dirtyInput);
        expect(cleanInput).not.toContain('<script>');
    });

    test('validates token correctly', () => {
        const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature';
        const invalidToken = 'invalid.token.here';

        expect(SecurityUtils.isTokenValid(validToken)).toBe(true);
        expect(SecurityUtils.isTokenValid(invalidToken)).toBe(false);
    });
});

describe('PerformanceUtils', () => {
    test('initializes lazy loading', () => {
        document.body.innerHTML = `
            <img class="lazy" data-src="test.jpg" />
            <img class="lazy" data-src="test2.jpg" />
        `;

        const observeMock = jest.fn();
        global.IntersectionObserver = jest.fn(() => ({
            observe: observeMock
        }));

        PerformanceUtils.initializeLazyLoading();

        expect(observeMock).toHaveBeenCalledTimes(2);
    });
});

describe('AccessibilityUtils', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <button>Click me</button>
            <div class="nav-item">Navigation</div>
            <div role="dialog">
                <button>First</button>
                <button>Last</button>
            </div>
        `;
    });

    test('updates ARIA attributes correctly', () => {
        AccessibilityUtils.updateAriaAttributes();

        const button = document.querySelector('button');
        expect(button.getAttribute('aria-label')).toBe('Click me');

        const navItem = document.querySelector('.nav-item');
        expect(navItem.getAttribute('role')).toBe('navigation');
    });

    test('announces messages to screen readers', () => {
        AccessibilityUtils.announce('Test message');

        const announcer = document.getElementById('announcer');
        expect(announcer).toBeTruthy();
        expect(announcer.getAttribute('aria-live')).toBe('polite');
    });
});
