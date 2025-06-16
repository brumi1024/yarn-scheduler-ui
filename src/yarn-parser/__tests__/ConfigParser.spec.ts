// src/yarn-parser/__tests__/ConfigParser.spec.ts

import { ConfigParser } from '../ConfigParser';
import { mockSimpleConfig } from '../../api/mocks/mockConfigData';

describe('ConfigParser Characterization Tests', () => {
    it('should parse the root queue correctly', () => {
        const result = ConfigParser.parse(mockSimpleConfig);
        expect(result.queues).toHaveLength(1);
        expect(result.queues[0].name).toBe('root');
        expect(result.queues[0].path).toBe('root');
    });

    it('should handle nested queues', () => {
        const result = ConfigParser.parse(mockSimpleConfig);
        expect(result.queues[0].children).toHaveLength(1);
        expect(result.queues[0].children[0].name).toBe('default');
        expect(result.queues[0].children[0].path).toBe('root.default');
    });

    // TODO: Add more tests based on the existing ConfigParser.test.ts
    // - Test for correct capacity values (percentage, weight, absolute)
    // - Test for maximum-capacity values
    // - Test for auto-queue creation properties
    // - Test edge cases like queues with names that could be mistaken for properties
});
