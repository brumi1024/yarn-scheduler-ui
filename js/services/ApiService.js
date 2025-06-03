/**
 * @file Service for handling API interactions with the YARN ResourceManager.
 */
class ApiService {
    constructor(baseUrl, useMocks = false, mockDataBasePath = './mock') {
        this.baseUrl = baseUrl;
        this.useMocks = useMocks;
        this.mockDataBasePath = mockDataBasePath; // e.g., "./mock"
        this.defaultHeaders = {
            'Content-Type': 'application/json', // Default for GET, may be overridden
            'Accept': 'application/json',       // Default for GET
        };
    }

    /**
     * Adds the user.name query parameter to a URL.
     * @param {string} url - The URL to modify.
     * @returns {string} The URL with the user.name parameter.
     * @private
     */
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
            headers: this.defaultHeaders,
            ...options,
        };

        try {
            const response = await fetch(url, requestOptions);
            const responseText = await response.text(); // Always get text first

            if (!response.ok) {
                // Try to parse as XML for YARN error messages, otherwise use text
                let errorMessage = responseText;
                if (requestOptions.headers?.Accept?.includes('application/xml') || options.method === 'PUT') { // PUT errors are often XML
                    try {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(responseText, "application/xml");
                        const exceptionNode = xmlDoc.querySelector("RemoteException > exception");
                        if (exceptionNode && exceptionNode.textContent) {
                            errorMessage = `${exceptionNode.textContent.trim()}: ${xmlDoc.querySelector("RemoteException > message")?.textContent?.trim() || 'No further details.'}`;
                        }
                    } catch (e) { /* Parsing failed, stick with responseText */ }
                }
                console.error(`API Error for ${endpoint} - Status ${response.status}:`, errorMessage);
                return { status: response.status, data: null, error: errorMessage };
            }

            let data;
            if (isJsonExpected) {
                try {
                    data = JSON.parse(responseText);
                } catch (e) {
                    console.warn(`ApiService: Expected JSON but received non-JSON for ${endpoint}:`, responseText.substring(0,100));
                    // Some YARN success responses (like PUT) might be plain text "Successfully applied..."
                    // despite Accept header asking for XML/JSON.
                    if (options.method === 'PUT' && responseText.toLowerCase().includes("successfully applied")) {
                        data = responseText; // Treat as successful text response
                    } else {
                        return { status: response.status, data: responseText, error: `Failed to parse JSON response.` };
                    }
                }
            } else {
                data = responseText; // For XML or plain text responses
            }
            return { status: response.status, data: data };

        } catch (error) {
            console.error(`ApiService: Network or fetch error for ${endpoint}:`, error);
            return { status: 0, data: null, error: error.message || 'Network error' };
        }
    }

    /**
     * Fetches data from a mock JSON file.
     * @param {string} endpoint - The API endpoint (used to construct mock file path).
     * @returns {Promise<{status: number, data: any, error?: string}>}
     * @private
     */
    async _getMock(endpoint) {
        // Construct mock file path, e.g. ./mock/ws/v1/cluster/scheduler-conf.json
        const mockFile = `${this.mockDataBasePath}${endpoint}.json`;
        try {
            const response = await fetch(mockFile);
            if (!response.ok) {
                const errorMsg = `Mock file not found or error: ${mockFile} (Status: ${response.status})`;
                console.error(errorMsg);
                return { status: response.status, data: null, error: errorMsg };
            }
            const jsonData = await response.json();
            return { status: 200, data: jsonData };
        } catch (error) {
            console.error(`ApiService: Error fetching mock data for ${mockFile}:`, error);
            return { status: 0, data: null, error: `Failed to fetch mock: ${error.message}` };
        }
    }

    /**
     * Fetches the scheduler configuration.
     * @returns {Promise<{status: number, data: Array<Object>|null, error?: string}>}
     *          On success, data is properties array like `scheduler-conf.json`.
     */
    async fetchSchedulerConfig() {
        if (this.useMocks) {
            return this._getMock(CONFIG.API_ENDPOINTS.SCHEDULER_CONF);
        }
        // Actual API returns XML but we parse scheduler-conf.json structure, so expect JSON for ease.
        // If YARN RM strictly returns XML here, the calling code needs to adapt or this method needs XML parsing.
        // The problem statement implies we work with the JSON structure provided.
        // Assuming the provided scheduler-conf.json IS what the UI expects AFTER some transformation if raw is XML.
        // For simplicity of this refactor based on provided mocks, we assume JSON can be fetched or transformed.
        return this._makeRequest(CONFIG.API_ENDPOINTS.SCHEDULER_CONF, {
            headers: { 'Accept': 'application/json' } // Prefer JSON
        }, true);
    }

    /**
     * Fetches the live scheduler information.
     * @returns {Promise<{status: number, data: Object|null, error?: string}>}
     *          On success, data is scheduler info object like `scheduler.json`.
     */
    async fetchSchedulerInfo() {
        if (this.useMocks) {
            return this._getMock(CONFIG.API_ENDPOINTS.SCHEDULER_INFO);
        }
        return this._makeRequest(CONFIG.API_ENDPOINTS.SCHEDULER_INFO, {
            headers: { 'Accept': 'application/json' }
        }, true);
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

        const escapeXml = (str) => String(str)
            .replace(/&/g, "&").replace(/</g, "<")
            .replace(/>/g, ">").replace(/"/g, "\"")
            .replace(/'/g, "'");

        const buildParamsXML = (params) => Object.entries(params)
            .map(([key, value]) =>
                `    <entry><key>${escapeXml(key)}</key><value>${escapeXml(value)}</value></entry>`
            ).join('\n');

        removeQueues.forEach(queueName => {
            xmlParts.push(`  <remove-queue>${escapeXml(queueName)}</remove-queue>`);
        });

        addQueues.forEach(item => {
            xmlParts.push(`  <add-queue>`);
            xmlParts.push(`    <queue-name>${escapeXml(item.queueName)}</queue-name>`);
            if (item.params && Object.keys(item.params).length > 0) {
                xmlParts.push(`    <params>\n${buildParamsXML(item.params)}\n    </params>`);
            }
            xmlParts.push(`  </add-queue>`);
        });

        updateQueues.forEach(item => {
            xmlParts.push(`  <update-queue>`);
            xmlParts.push(`    <queue-name>${escapeXml(item.queueName)}</queue-name>`);
            if (item.params && Object.keys(item.params).length > 0) {
                xmlParts.push(`    <params>\n${buildParamsXML(item.params)}\n    </params>`);
            }
            xmlParts.push(`  </update-queue>`);
        });

        if (Object.keys(globalUpdates).length > 0) {
            // Note: API docs for <global-updates> shows a map, where each key-value is an <entry>.
            // The existing api.js implied globalUpdates was an array of {params: object}.
            // Correcting based on `scheduler-mutation.txt`: <global-updates><entry><key>FULL_KEY</key>..</entry></global-updates>
            // So, globalUpdates should be { "full.yarn.key": "value" }
            xmlParts.push(`  <global-updates>`);
            xmlParts.push(buildParamsXML(globalUpdates)); // buildParamsXML works for this structure
            xmlParts.push(`  </global-updates>`);
        }

        xmlParts.push('</sched-conf>');
        return xmlParts.join('\n');
    }

    /**
     * Sends configuration changes (add, update, remove queues; global updates) to the API.
     * @param {Object} batchMutationPayload - The payload containing all changes.
     *        Matches structure for `_buildBatchMutationXML`.
     * @returns {Promise<{status: number, data: string|null, error?: string}>}
     *          On success, data is typically a success message string from YARN.
     */
    async putSchedulerChanges(batchMutationPayload) {
        const xmlBody = this._buildBatchMutationXML(batchMutationPayload);
        // console.log("ApiService: Sending PUT with XML Body:", xmlBody); // For debugging

        if (this.useMocks) {
            // Mocking PUT is tricky as it implies state change.
            // For now, assume mock success. Could add mock failure scenarios later.
            console.log("ApiService (Mock): PUT /scheduler-conf with payload:", xmlBody);
            // Simulate a slight delay
            await new Promise(resolve => setTimeout(resolve, 500));
            if (xmlBody.includes("FAIL_VALIDATION_MOCK")) { // Example mock failure
                return { status: 400, data: null, error: "Mock Validation Error: Capacity sum exceeds 100%."};
            }
            return { status: 200, data: "Configuration successfully applied." };
        }

        return this._makeRequest(CONFIG.API_ENDPOINTS.SCHEDULER_CONF, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/xml',
                'Accept': 'application/xml', // YARN returns XML or text on success/error for PUT
            },
            body: xmlBody,
        }, false); // Expect XML or text, not JSON, for PUT response
    }
}