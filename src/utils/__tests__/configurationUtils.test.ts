/**
 * Tests for configuration utility functions
 */

import { convertChangesToApiRequest } from '../configurationUtils';
import type { ChangeSet } from '../../types/Configuration';

describe('configurationUtils', () => {
    describe('convertChangesToApiRequest', () => {
        it('should convert changes to API request format', () => {
            const changes: ChangeSet[] = [
                {
                    id: 'change-1',
                    queuePath: 'root.queue1',
                    property: 'capacity',
                    oldValue: '30',
                    newValue: '50%',
                    timestamp: new Date(),
                },
                {
                    id: 'change-2',
                    queuePath: 'root.queue2',
                    property: 'state',
                    oldValue: 'STOPPED',
                    newValue: 'RUNNING',
                    timestamp: new Date(),
                },
            ];

            const result = convertChangesToApiRequest(changes);

            expect(result).toEqual({
                'update-queue': [
                    {
                        'queue-name': 'root.queue1',
                        params: { capacity: '50%' },
                    },
                    {
                        'queue-name': 'root.queue2',
                        params: { state: 'RUNNING' },
                    },
                ],
            });
        });

        it('should group multiple changes for the same queue', () => {
            const changes: ChangeSet[] = [
                {
                    id: 'change-1',
                    queuePath: 'root.queue1',
                    property: 'capacity',
                    oldValue: '30',
                    newValue: '50%',
                    timestamp: new Date(),
                },
                {
                    id: 'change-2',
                    queuePath: 'root.queue1',
                    property: 'state',
                    oldValue: 'STOPPED',
                    newValue: 'RUNNING',
                    timestamp: new Date(),
                },
            ];

            const result = convertChangesToApiRequest(changes);

            expect(result).toEqual({
                'update-queue': [
                    {
                        'queue-name': 'root.queue1',
                        params: { 
                            capacity: '50%',
                            state: 'RUNNING',
                        },
                    },
                ],
            });
        });

        it('should handle empty changes array', () => {
            const changes: ChangeSet[] = [];

            const result = convertChangesToApiRequest(changes);

            expect(result).toEqual({
                'update-queue': [],
            });
        });
    });
});