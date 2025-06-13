import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validationMiddleware } from '../validationMiddleware';

describe('validationMiddleware', () => {
    let mockStore: any;
    let mockNext: any;
    let mockDispatch: any;
    let mockGetState: any;

    beforeEach(() => {
        mockDispatch = vi.fn();
        mockGetState = vi.fn();
        mockNext = vi.fn();

        mockStore = {
            dispatch: mockDispatch,
            getState: mockGetState,
        };

        // Default state
        mockGetState.mockReturnValue({
            configuration: {
                scheduler: {
                    scheduler: {
                        schedulerInfo: {
                            queues: {
                                queue: [
                                    {
                                        queueName: 'root',
                                        queues: {
                                            queue: [
                                                { queueName: 'default' },
                                                { queueName: 'production' },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });
    });

    describe('Basic middleware functionality', () => {
        it('calls next middleware with action', () => {
            const action = { type: 'SOME_ACTION', payload: {} };
            const middleware = validationMiddleware(mockStore)(mockNext);

            middleware(action);

            expect(mockNext).toHaveBeenCalledWith(action);
        });

        it('returns result from next middleware', () => {
            const action = { type: 'SOME_ACTION', payload: {} };
            const expectedResult = { success: true };
            mockNext.mockReturnValue(expectedResult);

            const middleware = validationMiddleware(mockStore)(mockNext);
            const result = middleware(action);

            expect(result).toBe(expectedResult);
        });
    });

    describe('STAGE_CHANGE validation', () => {
        describe('Required fields validation', () => {
            it('validates change with all required fields', () => {
                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        id: 'change-1',
                        type: 'update-queue',
                        description: 'Update queue capacity',
                        queueName: 'root.default',
                        property: 'capacity',
                        newValue: '50',
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                middleware(action);

                // Should not dispatch any validation errors
                expect(mockDispatch).not.toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_CONFLICT',
                    })
                );
            });

            it('adds validation error for missing id', () => {
                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        type: 'update-queue',
                        description: 'Update queue capacity',
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                middleware(action);

                expect(mockDispatch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_LOG_ENTRY',
                        payload: expect.objectContaining({
                            type: 'validation',
                            level: 'warn',
                            message: 'Attempted to stage invalid change',
                        }),
                    })
                );

                expect(mockDispatch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_CONFLICT',
                        payload: expect.objectContaining({
                            type: 'validation',
                            message: 'Change is missing required fields',
                            severity: 'error',
                        }),
                    })
                );
            });

            it('adds validation error for missing type', () => {
                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        id: 'change-1',
                        description: 'Update queue capacity',
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                middleware(action);

                expect(mockDispatch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_CONFLICT',
                        payload: expect.objectContaining({
                            message: 'Change is missing required fields',
                        }),
                    })
                );
            });

            it('adds validation error for missing description', () => {
                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        id: 'change-1',
                        type: 'update-queue',
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                middleware(action);

                expect(mockDispatch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_CONFLICT',
                        payload: expect.objectContaining({
                            message: 'Change is missing required fields',
                        }),
                    })
                );
            });
        });

        describe('Queue existence validation', () => {
            it('validates existing queue', () => {
                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        id: 'change-1',
                        type: 'update-queue',
                        description: 'Update queue capacity',
                        queueName: 'root.default',
                        property: 'capacity',
                        newValue: '50',
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                middleware(action);

                // Should not add conflict for existing queue
                expect(mockDispatch).not.toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_CONFLICT',
                        payload: expect.objectContaining({
                            message: expect.stringContaining('does not exist'),
                        }),
                    })
                );
            });

            it('adds conflict for non-existent queue', () => {
                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        id: 'change-1',
                        type: 'update-queue',
                        description: 'Update queue capacity',
                        queueName: 'root.nonexistent',
                        property: 'capacity',
                        newValue: '50',
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                middleware(action);

                expect(mockDispatch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_CONFLICT',
                        payload: expect.objectContaining({
                            changeId: 'change-1',
                            type: 'validation',
                            message: "Queue 'root.nonexistent' does not exist",
                            severity: 'error',
                            suggestions: ['Create the queue first', 'Check the queue path'],
                        }),
                    })
                );
            });

            it('handles missing scheduler state gracefully', () => {
                mockGetState.mockReturnValue({
                    configuration: {
                        scheduler: null,
                    },
                });

                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        id: 'change-1',
                        type: 'update-queue',
                        description: 'Update queue capacity',
                        queueName: 'root.default',
                        property: 'capacity',
                        newValue: '50',
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                
                // Should not throw error
                expect(() => middleware(action)).not.toThrow();
            });

            it('handles empty queue structure', () => {
                mockGetState.mockReturnValue({
                    configuration: {
                        scheduler: {
                            scheduler: {
                                schedulerInfo: {
                                    queues: {
                                        queue: [],
                                    },
                                },
                            },
                        },
                    },
                });

                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        id: 'change-1',
                        type: 'update-queue',
                        description: 'Update queue capacity',
                        queueName: 'root.default',
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                middleware(action);

                expect(mockDispatch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_CONFLICT',
                        payload: expect.objectContaining({
                            message: "Queue 'root.default' does not exist",
                        }),
                    })
                );
            });
        });

        describe('Capacity validation', () => {
            it('validates valid capacity values', () => {
                const validCapacities = ['0', '50', '100', '25.5'];

                validCapacities.forEach((capacity) => {
                    const action = {
                        type: 'STAGE_CHANGE',
                        payload: {
                            id: `change-${capacity}`,
                            type: 'update-queue',
                            description: 'Update queue capacity',
                            queueName: 'root.default',
                            property: 'capacity',
                            newValue: capacity,
                        },
                    };

                    mockDispatch.mockClear();
                    const middleware = validationMiddleware(mockStore)(mockNext);
                    middleware(action);

                    // Should not add capacity validation conflicts
                    expect(mockDispatch).not.toHaveBeenCalledWith(
                        expect.objectContaining({
                            type: 'ADD_CONFLICT',
                            payload: expect.objectContaining({
                                message: 'Capacity must be a number between 0 and 100',
                            }),
                        })
                    );
                });
            });

            it('adds conflict for invalid capacity values', () => {
                const invalidCapacities = ['-10', '150', 'invalid', 'NaN'];

                invalidCapacities.forEach((capacity) => {
                    const action = {
                        type: 'STAGE_CHANGE',
                        payload: {
                            id: `change-${capacity}`,
                            type: 'update-queue',
                            description: 'Update queue capacity',
                            property: 'capacity',
                            newValue: capacity,
                        },
                    };

                    mockDispatch.mockClear();
                    const middleware = validationMiddleware(mockStore)(mockNext);
                    middleware(action);

                    expect(mockDispatch).toHaveBeenCalledWith(
                        expect.objectContaining({
                            type: 'ADD_CONFLICT',
                            payload: expect.objectContaining({
                                changeId: `change-${capacity}`,
                                type: 'validation',
                                message: 'Capacity must be a number between 0 and 100',
                                severity: 'error',
                                suggestions: ['Enter a valid percentage value (0-100)'],
                            }),
                        })
                    );
                });
            });

            it('skips capacity validation for non-capacity properties', () => {
                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        id: 'change-1',
                        type: 'update-queue',
                        description: 'Update queue state',
                        property: 'state',
                        newValue: 'STOPPED',
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                middleware(action);

                // Should not validate as capacity
                expect(mockDispatch).not.toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_CONFLICT',
                        payload: expect.objectContaining({
                            message: 'Capacity must be a number between 0 and 100',
                        }),
                    })
                );
            });

            it('skips capacity validation when newValue is missing', () => {
                const action = {
                    type: 'STAGE_CHANGE',
                    payload: {
                        id: 'change-1',
                        type: 'update-queue',
                        description: 'Update queue capacity',
                        property: 'capacity',
                        // newValue is missing
                    },
                };

                const middleware = validationMiddleware(mockStore)(mockNext);
                middleware(action);

                // Should not throw or add capacity conflict
                expect(mockDispatch).not.toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_CONFLICT',
                        payload: expect.objectContaining({
                            message: 'Capacity must be a number between 0 and 100',
                        }),
                    })
                );
            });
        });
    });

    describe('Activity logging', () => {
        it('logs STAGE_CHANGE actions', () => {
            const action = {
                type: 'STAGE_CHANGE',
                payload: {
                    id: 'change-1',
                    type: 'update-queue',
                    description: 'Test change',
                },
            };

            const middleware = validationMiddleware(mockStore)(mockNext);
            middleware(action);

            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ADD_LOG_ENTRY',
                    payload: expect.objectContaining({
                        type: 'user_action',
                        level: 'info',
                        message: 'Change management: STAGE_CHANGE',
                        details: { action },
                    }),
                })
            );
        });

        it('logs UNSTAGE_CHANGE actions', () => {
            const action = {
                type: 'UNSTAGE_CHANGE',
                payload: {
                    changeId: 'change-1',
                },
            };

            const middleware = validationMiddleware(mockStore)(mockNext);
            middleware(action);

            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ADD_LOG_ENTRY',
                    payload: expect.objectContaining({
                        type: 'user_action',
                        level: 'info',
                        message: 'Change management: UNSTAGE_CHANGE',
                        details: { action },
                    }),
                })
            );
        });

        it('logs APPLY_CHANGES_SUCCESS actions', () => {
            const action = {
                type: 'APPLY_CHANGES_SUCCESS',
                payload: {
                    appliedChanges: ['change-1', 'change-2'],
                },
            };

            const middleware = validationMiddleware(mockStore)(mockNext);
            middleware(action);

            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ADD_LOG_ENTRY',
                    payload: expect.objectContaining({
                        type: 'user_action',
                        level: 'info',
                        message: 'Change management: APPLY_CHANGES_SUCCESS',
                        details: { action },
                    }),
                })
            );
        });

        it('does not log unrelated actions', () => {
            const action = {
                type: 'SET_SELECTED_QUEUE',
                payload: {
                    queuePath: 'root.default',
                },
            };

            const middleware = validationMiddleware(mockStore)(mockNext);
            middleware(action);

            expect(mockDispatch).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ADD_LOG_ENTRY',
                })
            );
        });
    });

    describe('findQueueByPath helper function', () => {
        it('finds queue by exact name match', () => {
            const action = {
                type: 'STAGE_CHANGE',
                payload: {
                    id: 'change-1',
                    type: 'update-queue',
                    description: 'Update queue',
                    queueName: 'default', // Exact match
                },
            };

            const middleware = validationMiddleware(mockStore)(mockNext);
            middleware(action);

            // Should not add conflict
            expect(mockDispatch).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ADD_CONFLICT',
                    payload: expect.objectContaining({
                        message: expect.stringContaining('does not exist'),
                    }),
                })
            );
        });

        it('finds queue by path ending', () => {
            const action = {
                type: 'STAGE_CHANGE',
                payload: {
                    id: 'change-1',
                    type: 'update-queue',
                    description: 'Update queue',
                    queueName: 'root.default', // Path ending match
                },
            };

            const middleware = validationMiddleware(mockStore)(mockNext);
            middleware(action);

            // Should not add conflict
            expect(mockDispatch).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ADD_CONFLICT',
                    payload: expect.objectContaining({
                        message: expect.stringContaining('does not exist'),
                    }),
                })
            );
        });

        it('recursively searches nested queues', () => {
            // Set up deeper nesting
            mockGetState.mockReturnValue({
                configuration: {
                    scheduler: {
                        scheduler: {
                            schedulerInfo: {
                                queues: {
                                    queue: [
                                        {
                                            queueName: 'root',
                                            queues: {
                                                queue: [
                                                    {
                                                        queueName: 'production',
                                                        queues: {
                                                            queue: [
                                                                { queueName: 'high-priority' },
                                                                { queueName: 'low-priority' },
                                                            ],
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            });

            const action = {
                type: 'STAGE_CHANGE',
                payload: {
                    id: 'change-1',
                    type: 'update-queue',
                    description: 'Update queue',
                    queueName: 'high-priority',
                },
            };

            const middleware = validationMiddleware(mockStore)(mockNext);
            middleware(action);

            // Should find the nested queue
            expect(mockDispatch).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ADD_CONFLICT',
                    payload: expect.objectContaining({
                        message: expect.stringContaining('does not exist'),
                    }),
                })
            );
        });
    });
});