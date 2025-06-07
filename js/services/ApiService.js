/**
 * @file Service for handling API interactions with the YARN ResourceManager.
 * Uses constants from js/config/config.js
 */
class ApiService {
    constructor(baseUrl, useMocks = CONFIG.USE_MOCKS, mockDataBasePath = CONFIG.MOCK_DATA_BASE_PATH) {
        this.baseUrl = baseUrl || CONFIG.API_BASE_URL;
        this.useMocks = useMocks;
        this.mockDataBasePath = mockDataBasePath;
        this.errorHandler = new ErrorHandler();

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
            headers: { ...this.defaultHeaders, ...options.headers },
            method: options.method || 'GET',
            body: options.body,
            signal: options.signal,
        };

        try {
            const response = await fetch(url, requestOptions);
            const responseText = await response.text();

            if (!response.ok) {
                // Handle API errors using new error system
                if (requestOptions.method === 'PUT' && responseText && responseText.includes('<RemoteException>')) {
                    const apiError = ApiError.fromXmlResponse(responseText, endpoint, requestOptions.method);
                    return {
                        status: response.status,
                        data: null,
                        error: apiError.getUserMessage(),
                        originalError: apiError,
                    };
                }

                const apiError = new ApiError(responseText || response.statusText || 'Request failed', 'API_ERROR', {
                    statusCode: response.status,
                    endpoint,
                    method: requestOptions.method,
                    responseData: responseText,
                });

                return {
                    status: response.status,
                    data: null,
                    error: apiError.getUserMessage(),
                    originalError: apiError,
                };
            }

            let data;
            if (isJsonExpected) {
                try {
                    data = JSON.parse(responseText);
                } catch {
                    if (
                        requestOptions.method === 'PUT' &&
                        responseText.toLowerCase().includes('successfully applied')
                    ) {
                        data = responseText;
                    } else {
                        const configError = new ValidationError('Failed to parse JSON response', 'PARSE_ERROR', {
                            endpoint,
                            responseData: responseText.slice(0, 200),
                        });
                        return {
                            status: response.status,
                            data: responseText,
                            error: configError.getUserMessage(),
                            originalError: configError,
                        };
                    }
                }
            } else {
                data = responseText;
            }

            return { status: response.status, data: data };
        } catch (error) {
            const enhancedError = this.errorHandler._enhanceError(error);
            this.errorHandler.logError(enhancedError, `API request to ${endpoint}`);
            return { status: 0, data: null, error: enhancedError.getUserMessage(), originalError: enhancedError };
        }
    }

    async _getMock(endpoint, expectJson = true) {
        const largeSuffix = CONFIG.USE_LARGE_MOCKS ? '-large' : '';
        const extension = expectJson ? '.json' : '.xml';
        const mockFile = `${this.mockDataBasePath}${endpoint}${largeSuffix}${extension}`;
        try {
            const response = await fetch(mockFile);
            if (!response.ok) {
                const errorMessage = `Mock file error: ${mockFile} (Status: ${response.status})`;
                console.error(errorMessage);
                return { status: response.status, data: null, error: errorMessage };
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
     * Fetches cluster nodes information including node labels.
     * @returns {Promise<{status: number, data: Object|null, error?: string}>}
     *          On success, data is cluster nodes object like `nodes.json`.
     */
    async fetchClusterNodes() {
        if (this.useMocks) {
            return this._getMock(CONFIG.API_ENDPOINTS.CLUSTER_NODES, true);
        }
        return this._makeRequest(
            CONFIG.API_ENDPOINTS.CLUSTER_NODES,
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

        const buildParametersXML = (parameters) =>
            Object.entries(parameters)
                .filter(([key]) => key !== '_ui_capacityMode') // Filter out UI helper fields
                .map(
                    ([key, value]) =>
                        `    <entry><key>${DomUtils.escapeXml(key)}</key><value>${DomUtils.escapeXml(value)}</value></entry>`
                )
                .join('\n');

        for (const queueName of removeQueues) {
            xmlParts.push(`  <remove-queue>${DomUtils.escapeXml(queueName)}</remove-queue>`);
        }

        for (const item of addQueues) {
            xmlParts.push(`  <add-queue>`);
            xmlParts.push(`    <queue-name>${DomUtils.escapeXml(item.queueName)}</queue-name>`);
            if (item.params && Object.keys(item.params).length > 0) {
                xmlParts.push(`    <params>\n${buildParametersXML(item.params)}\n    </params>`);
            }
            xmlParts.push(`  </add-queue>`);
        }

        for (const item of updateQueues) {
            xmlParts.push(`  <update-queue>`);
            xmlParts.push(`    <queue-name>${DomUtils.escapeXml(item.queueName)}</queue-name>`);
            if (item.params && Object.keys(item.params).length > 0) {
                xmlParts.push(`    <params>\n${buildParametersXML(item.params)}\n    </params>`);
            }
            xmlParts.push(`  </update-queue>`);
        }

        if (Object.keys(globalUpdates).length > 0) {
            // Global updates params are expected to be { 'full.yarn.key': 'value' }
            xmlParts.push(`  <global-updates>`);
            xmlParts.push(buildParametersXML(globalUpdates), `  </global-updates>`);
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

        // Use retry logic for critical configuration updates
        try {
            return await this.errorHandler.handleWithRetry(
                async () => {
                    const result = await this._makeRequest(
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

                    // Throw enhanced error if request failed for retry logic
                    if (result.originalError) {
                        throw result.originalError;
                    }

                    return result;
                },
                {
                    maxRetries: 1, // Limited retries for configuration changes
                    baseDelay: 2000, // Longer delay for configuration operations
                }
            );
        } catch (error) {
            // Return in legacy format for backward compatibility
            return {
                status: error.statusCode || 0,
                data: null,
                error: error.getUserMessage(),
                originalError: error,
            };
        }
    }
}
