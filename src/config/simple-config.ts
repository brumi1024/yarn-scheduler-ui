/**
 * Simplified Configuration API
 *
 * Simple, direct API for working with YARN configuration properties.
 */

import { QUEUE_PROPERTIES } from './queueProperties';

/**
 * Get queue property groups for UI organization
 */
export function getQueuePropertyGroups() {
    // Convert new QUEUE_PROPERTIES to grouped format
    const coreProperties = ['capacity', 'maximum-capacity', 'state'];
    const resourceProperties = ['user-limit-factor', 'maximum-am-resource-percent', 'maximum-applications'];
    const advancedProperties = ['ordering-policy', 'disable_preemption', 'acl_submit_applications', 'acl_administer_queue'];

    return [
        {
            groupName: 'Core Properties',
            properties: coreProperties.map(key => QUEUE_PROPERTIES[key as keyof typeof QUEUE_PROPERTIES]).filter(Boolean)
        },
        {
            groupName: 'Resource Limits & Management', 
            properties: resourceProperties.map(key => QUEUE_PROPERTIES[key as keyof typeof QUEUE_PROPERTIES]).filter(Boolean)
        },
        {
            groupName: 'Advanced Settings',
            properties: advancedProperties.map(key => QUEUE_PROPERTIES[key as keyof typeof QUEUE_PROPERTIES]).filter(Boolean)
        }
    ];
}