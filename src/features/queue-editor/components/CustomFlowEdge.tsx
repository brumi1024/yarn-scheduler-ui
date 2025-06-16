import React from 'react';
import { type EdgeProps } from '@xyflow/react';

/**
 * Custom Sankey-like edge component that creates flowing connections between queue nodes.
 * 
 * This component creates thick, flowing connections where the width represents the capacity
 * flow between parent and child queues, similar to a Sankey diagram. The connections
 * use gradients and proper curve handling for a professional appearance.
 */
function CustomFlowEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
}: EdgeProps) {
    // Generate unique gradient ID for this edge
    const gradientId = `gradient-${id}`;

    // Determine flow colors based on target queue state
    const getFlowColors = () => {
        if (data?.targetState === 'RUNNING') {
            return {
                startColor: '#2196f3', // Running flow color
                endColor: '#64b5f6',   // Lighter blue for gradient effect
                opacity: 0.8,
            };
        } else if (data?.targetState === 'STOPPED') {
            return {
                startColor: '#f44336', // Stopped flow color
                endColor: '#e57373',   // Lighter red for gradient effect
                opacity: 0.8,
            };
        } else {
            return {
                startColor: '#9e9e9e', // Default flow color
                endColor: '#bdbdbd',   // Lighter gray for gradient effect
                opacity: 0.7,
            };
        }
    };

    const { startColor, endColor, opacity } = getFlowColors();

    // Calculate Sankey-style width based on capacity (min 8px, max 40px for visual clarity)
    const capacity = typeof data?.capacity === 'number' ? data.capacity : 0;
    const sankeyWidth = capacity > 0 ? Math.max(8, Math.min(40, capacity * 0.8)) : 12;

    // Create Sankey-style path using proportional segments
    const createSankeyPath = () => {
        const controlPointDistance = Math.abs(targetX - sourceX) * 0.5;
        
        // Use proportional positioning from D3TreeLayout if available
        const sourceStartY = data?.sourceStartY ?? sourceY - sankeyWidth / 2;
        const sourceEndY = data?.sourceEndY ?? sourceY + sankeyWidth / 2;
        const targetStartY = data?.targetStartY ?? targetY - sankeyWidth / 2;
        const targetEndY = data?.targetEndY ?? targetY + sankeyWidth / 2;

        // Create a thick flowing path using the proportional segments
        return [
            // Start at source (proportional segment start)
            `M ${sourceX} ${sourceStartY}`,
            
            // Top curve to target
            `C ${sourceX + controlPointDistance} ${sourceStartY}`,
            `${targetX - controlPointDistance} ${targetStartY}`,
            `${targetX} ${targetStartY}`,
            
            // Line to bottom of target segment
            `L ${targetX} ${targetEndY}`,
            
            // Bottom curve back to source
            `C ${targetX - controlPointDistance} ${targetEndY}`,
            `${sourceX + controlPointDistance} ${sourceEndY}`,
            `${sourceX} ${sourceEndY}`,
            
            // Close the path
            'Z'
        ].join(' ');
    };

    const sankeyPath = createSankeyPath();

    return (
        <g>
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: startColor, stopOpacity: opacity }} />
                    <stop offset="100%" style={{ stopColor: endColor, stopOpacity: opacity }} />
                </linearGradient>
                
                {/* Add a subtle shadow for depth */}
                <filter id={`shadow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1"/>
                </filter>
            </defs>
            
            {/* Shadow path */}
            <path
                d={sankeyPath}
                fill="rgba(0, 0, 0, 0.1)"
                transform="translate(2, 2)"
            />
            
            {/* Main Sankey flow path */}
            <path
                d={sankeyPath}
                fill={`url(#${gradientId})`}
                filter={`url(#shadow-${id})`}
                style={{
                    transition: 'all 0.2s ease-in-out',
                }}
            />
            
            {/* Optional animated flow indication for running queues */}
            {data?.targetState === 'RUNNING' && (
                <path
                    d={sankeyPath}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="2"
                    strokeDasharray="10 10"
                    style={{
                        animation: 'flow 3s linear infinite',
                    }}
                />
            )}

            <style>
                {`
                    @keyframes flow {
                        0% { stroke-dashoffset: 0; }
                        100% { stroke-dashoffset: 20; }
                    }
                `}
            </style>
        </g>
    );
}

export default CustomFlowEdge;