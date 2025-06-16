import React from 'react';
import { QueueVisualizationContainer } from './QueueVisualizationContainer';

export interface QueueVisualizationProps {
    width?: number;
    height?: number;
    className?: string;
}

/**
 * QueueVisualization component
 * - QueueVisualizationContainer: Main orchestration and data management
 * - CanvasDisplay: Canvas rendering and interaction handling
 * - VisualizationControls: UI controls and overlays
 * - QueueDataProcessor: Data transformation and processing logic
 */
export const QueueVisualization: React.FC<QueueVisualizationProps> = ({ className }) => {
    return <QueueVisualizationContainer className={className} />;
};
