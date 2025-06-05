/**
 * Error thrown when API calls fail
 */
class ApiError extends YarnSchedulerError {
    constructor(message, code = 'API_ERROR', details = {}) {
        super(message, code, details);
        this.statusCode = details.statusCode || null;
        this.endpoint = details.endpoint || null;
        this.method = details.method || 'GET';
        this.responseData = details.responseData || null;
    }

    isRetryable() {
        if (this.statusCode) {
            // Retry on server errors (5xx) and some client errors
            return this.statusCode >= 500 || 
                   this.statusCode === 408 || // Request Timeout
                   this.statusCode === 429 || // Too Many Requests
                   this.statusCode === 0;     // Network error
        }
        return false;
    }

    getUserMessage() {
        if (this.details.userFriendlyMessage) {
            return this.details.userFriendlyMessage;
        }

        switch (this.statusCode) {
            case 400:
                return `Invalid request: ${this.message}`;
            case 401:
                return 'Authentication required. Please check your credentials.';
            case 403:
                return 'Permission denied. You do not have access to perform this operation.';
            case 404:
                return 'The requested resource was not found.';
            case 408:
                return 'Request timed out. Please try again.';
            case 429:
                return 'Too many requests. Please wait a moment before trying again.';
            case 500:
                return 'Server error occurred. Please try again later.';
            case 502:
                return 'Bad gateway. The server is temporarily unavailable.';
            case 503:
                return 'Service unavailable. Please try again later.';
            case 504:
                return 'Gateway timeout. The server took too long to respond.';
            case 0:
                return 'Network error. Please check your connection and try again.';
            default:
                if (this.statusCode >= 500) {
                    return 'Server error occurred. Please try again later.';
                }
                return `Request failed: ${this.message}`;
        }
    }

    /**
     * Parses YARN XML error responses
     */
    static fromXmlResponse(xmlText, endpoint, method = 'PUT') {
        try {
            const parser = new DOMParser();
            const xmlDocument = parser.parseFromString(xmlText, 'application/xml');
            
            const exceptionNode = xmlDocument.querySelector('RemoteException > exception');
            const messageNode = xmlDocument.querySelector('RemoteException > message');
            const javaClassNode = xmlDocument.querySelector('RemoteException > javaClassName');
            
            let message = 'Unknown API error';
            let code = 'API_ERROR';
            
            if (messageNode && messageNode.textContent) {
                message = messageNode.textContent.trim();
            }
            
            if (exceptionNode && exceptionNode.textContent) {
                const exceptionType = exceptionNode.textContent.trim();
                if (exceptionType.includes('YarnException')) {
                    code = 'YARN_ERROR';
                } else if (exceptionType.includes('AccessControlException')) {
                    code = 'ACCESS_DENIED';
                } else if (exceptionType.includes('InvalidResourceRequestException')) {
                    code = 'INVALID_RESOURCE_REQUEST';
                }
            }

            return new ApiError(message, code, {
                endpoint,
                method,
                statusCode: 400,
                responseData: xmlText,
                javaClassName: javaClassNode?.textContent?.trim(),
                userFriendlyMessage: ApiError._getYarnErrorUserMessage(message, code)
            });
        } catch (error) {
            return new ApiError('Failed to parse API error response', 'PARSE_ERROR', {
                endpoint,
                method,
                statusCode: 400,
                responseData: xmlText,
                parseError: error.message
            });
        }
    }

    static _getYarnErrorUserMessage(message, code) {
        if (message.toLowerCase().includes('capacity')) {
            return 'Queue capacity configuration is invalid. Please check that child queue capacities sum to 100%.';
        }
        if (message.toLowerCase().includes('queue') && message.toLowerCase().includes('not found')) {
            return 'The specified queue was not found. It may have been deleted by another user.';
        }
        if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('access')) {
            return 'You do not have permission to modify this queue configuration.';
        }
        if (message.toLowerCase().includes('running') && message.toLowerCase().includes('application')) {
            return 'Cannot modify queue with running applications. Please wait for applications to complete.';
        }
        return `Configuration update failed: ${message}`;
    }
}