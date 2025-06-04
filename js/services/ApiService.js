/**
 * @file Service for handling API interactions with the YARN ResourceManager.
 * Uses constants from js/config/config.js
 */
class ApiService {
    constructor(baseUrl, useMocks = CONFIG.USE_MOCKS, mockDataBasePath = CONFIG.MOCK_DATA_BASE_PATH) {
        this.baseUrl = baseUrl || CONFIG.API_BASE_URL;
        this.useMocks = useMocks;
        this.mockDataBasePath = mockDataBasePath;

        this.defaultHeaders = {
            'Content-Type': 'application/json', // Default for GET
            Accept: 'application/json', // Default for GET
        };
    }

    _addUserParam(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}user.name=${encodeURIComponent(CONFIG.USER_NAME)}`;
    }

    /**
     * Makes a generic API request.
     * @param {string} endpoint - The API endpoint (e.g., CONFIG.API_ENDPOINTS.SCHEDULER_CONF).
     * @param {object} options - Fetch options (method, headers, body, etc.).
     * @param {boolean} isJsonExpected - Whether the response body is expected to be JSON.
     * @returns {Promise<{status: number, data: any, error?: string}>}
     * @private
     */
    async _makeRequest(endpoint, options = {}, isJsonExpected = true) {
        const url = this._addUserParam(`${this.baseUrl}${endpoint}`);
        const requestOptions = {
            headers: { ...this.defaultHeaders, ...options.headers }, // Merge headers
            method: options.method || 'GET',
            body: options.body,
            signal: options.signal,
        };

        try {
            const response = await fetch(url, requestOptions);
            const responseText = await response.text();

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${responseText || response.statusText}`;
                if (requestOptions.method === 'PUT' && responseText) {
                    // YARN PUT errors are often XML
                    try {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(responseText, 'application/xml');
                        const exceptionNode = xmlDoc.querySelector('RemoteException > exception');
                        const messageNode = xmlDoc.querySelector('RemoteException > message');
                        if (exceptionNode && exceptionNode.textContent && messageNode && messageNode.textContent) {
                            errorMessage = `${exceptionNode.textContent.trim()}: ${messageNode.textContent.trim()}`;
                        } else if (xmlDoc.documentElement.nodeName === 'html') {
                            // Check if it's an HTML error page
                            errorMessage = `HTTP ${response.status}: Received HTML error page.`;
                        }
                    } catch (e) {
                        /* Stick with original responseText if XML parsing fails */
                    }
                }
                console.error(`ApiService: Error for ${endpoint} - Status ${response.status}:`, errorMessage);
                return { status: response.status, data: null, error: errorMessage };
            }

            let data;
            if (isJsonExpected) {
                try {
                    data = JSON.parse(responseText);
                } catch (e) {
                    if (
                        requestOptions.method === 'PUT' &&
                        responseText.toLowerCase().includes('successfully applied')
                    ) {
                        data = responseText;
                    } else {
                        console.warn(
                            `ApiService: Expected JSON for ${endpoint} but received:`,
                            responseText.substring(0, 200)
                        );
                        return { status: response.status, data: responseText, error: 'Failed to parse JSON response.' };
                    }
                }
            } else {
                data = responseText;
            }
            return { status: response.status, data: data };
        } catch (error) {
            console.error(`ApiService: Network or fetch error for ${endpoint}:`, error);
            return { status: 0, data: null, error: error.message || 'Network error' };
        }
    }

    async _getMock(endpoint, expectJson = true) {
        const mockFile = `${this.mockDataBasePath}${endpoint}${expectJson ? '.json' : '.xml'}`;
        try {
            const response = await fetch(mockFile);
            if (!response.ok) {
                const errorMsg = `Mock file error: ${mockFile} (Status: ${response.status})`;
                console.error(errorMsg);
                return { status: response.status, data: null, error: errorMsg };
            }
            const data = expectJson ? await response.json() : await response.text();
            return { status: 200, data: data };
        } catch (error) {
            console.error(`ApiService: Error fetching mock for ${mockFile}:`, error);
            return { status: 0, data: null, error: `Failed to fetch mock: ${error.message}` };
        }
    }

    async fetchSchedulerConfig() {
        if (this.useMocks) {
            return this._getMock(CONFIG.API_ENDPOINTS.SCHEDULER_CONF, true);
        }
        return this._makeRequest(
            CONFIG.API_ENDPOINTS.SCHEDULER_CONF,
            {
                headers: { Accept: 'application/json' }, // Try for JSON, but be ready for XML
            },
            true
        ); // True, because our mock is JSON, and old code tried to parse response as JSON
    }

    /**
     * Fetches the live scheduler information.
     * @returns {Promise<{status: number, data: Object|null, error?: string}>}
     *          On success, data is scheduler info object like `scheduler.json`.
     */
    async fetchSchedulerInfo() {
        if (this.useMocks) {
            return this._getMock(CONFIG.API_ENDPOINTS.SCHEDULER_INFO, true);
        }
        return this._makeRequest(
            CONFIG.API_ENDPOINTS.SCHEDULER_INFO,
            {
                headers: { Accept: 'application/json' },
            },
            true
        );
    }

    /**
     * Builds the XML payload for scheduler configuration mutation.
     * @param {Object} batchChanges - The changes to apply.
     * @param {Array<string>} batchChanges.removeQueues
     * @param {Array<{queueName: string, params: Object}>} batchChanges.addQueues (params have simple keys)
     * @param {Array<{queueName: string, params: Object}>} batchChanges.updateQueues (params have simple keys)
     * @param {Object} batchChanges.globalUpdates (params have full YARN keys)
     * @returns {string} The XML string payload.
     * @private
     */
    _buildBatchMutationXML(batchChanges) {
        const { removeQueues = [], addQueues = [], updateQueues = [], globalUpdates = {} } = batchChanges;
        const xmlParts = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<sched-conf>'];

        const escapeXml = (str) => {
            if (typeof str !== 'string') str = String(str);
            return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
        };

        const buildParamsXML = (params) =>
            Object.entries(params)
                .map(
                    ([key, value]) =>
                        `    <entry><key>${escapeXml(key)}</key><value>${escapeXml(value)}</value></entry>`
                )
                .join('\n');

        removeQueues.forEach((queueName) => {
            xmlParts.push(`  <remove-queue>${escapeXml(queueName)}</remove-queue>`);
        });

        addQueues.forEach((item) => {
            xmlParts.push(`  <add-queue>`);
            xmlParts.push(`    <queue-name>${escapeXml(item.queueName)}</queue-name>`);
            if (item.params && Object.keys(item.params).length > 0) {
                xmlParts.push(`    <params>\n${buildParamsXML(item.params)}\n    </params>`);
            }
            xmlParts.push(`  </add-queue>`);
        });

        updateQueues.forEach((item) => {
            xmlParts.push(`  <update-queue>`);
            xmlParts.push(`    <queue-name>${escapeXml(item.queueName)}</queue-name>`);
            if (item.params && Object.keys(item.params).length > 0) {
                xmlParts.push(`    <params>\n${buildParamsXML(item.params)}\n    </params>`);
            }
            xmlParts.push(`  </update-queue>`);
        });

        if (Object.keys(globalUpdates).length > 0) {
            // Global updates params are expected to be { 'full.yarn.key': 'value' }
            xmlParts.push(`  <global-updates>`);
            xmlParts.push(buildParamsXML(globalUpdates));
            xmlParts.push(`  </global-updates>`);
        }

        xmlParts.push('</sched-conf>');
        return xmlParts.join('\n');
    }

    async putSchedulerChanges(batchMutationPayload) {
        const xmlBody = this._buildBatchMutationXML(batchMutationPayload);
        console.debug('ApiService: PUT XML Payload:', xmlBody);

        if (this.useMocks) {
            console.log('ApiService (Mock): Simulating PUT /scheduler-conf');
            await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate delay
            // Example: simulate specific mock failure based on payload content for testing
            if (xmlBody.includes('<key>capacity</key><value>200%</value>')) {
                // Mock a validation failure
                return {
                    status: 400,
                    data: '<error><message>Mock: Capacity cannot be 200%</message></error>',
                    error: 'Mock validation: Capacity > 100%.',
                };
            }
            return { status: 200, data: 'Configuration successfully applied (Mock Response).' };
        }

        return this._makeRequest(
            CONFIG.API_ENDPOINTS.SCHEDULER_CONF,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/xml',
                    Accept: 'application/xml',
                },
                body: xmlBody,
            },
            false
        );
    }
}
