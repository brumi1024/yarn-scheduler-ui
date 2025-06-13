export interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    renderTime: number;
    memoryUsage: number;
    drawCalls: number;
    cacheHitRate: number;
    visibleNodes: number;
    totalNodes: number;
}

export interface PerformanceAlert {
    type: 'warning' | 'error';
    message: string;
    value: number;
    threshold: number;
    timestamp: number;
}

export class PerformanceMonitor {
    private frameCount: number = 0;
    private lastTime: number = 0;
    private frameTimes: number[] = [];
    private renderTimes: number[] = [];
    private drawCalls: number = 0;
    private alerts: PerformanceAlert[] = [];
    private isMonitoring: boolean = false;

    // Performance thresholds
    private readonly FPS_WARNING_THRESHOLD = 30;
    private readonly FPS_ERROR_THRESHOLD = 15;
    private readonly FRAME_TIME_WARNING_THRESHOLD = 33; // ~30fps
    private readonly FRAME_TIME_ERROR_THRESHOLD = 66; // ~15fps
    private readonly MEMORY_WARNING_THRESHOLD = 100 * 1024 * 1024; // 100MB
    private readonly MEMORY_ERROR_THRESHOLD = 200 * 1024 * 1024; // 200MB

    // Buffer sizes for averaging
    private readonly FRAME_BUFFER_SIZE = 60;

    /**
     * Start monitoring
     */
    startMonitoring(): void {
        this.isMonitoring = true;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.frameTimes = [];
        this.renderTimes = [];
        this.alerts = [];
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        this.isMonitoring = false;
    }

    /**
     * Mark start of frame
     */
    frameStart(): void {
        if (!this.isMonitoring) return;

        const now = performance.now();
        if (this.lastTime > 0) {
            const frameTime = now - this.lastTime;
            this.addFrameTime(frameTime);
        }
        this.lastTime = now;
        this.frameCount++;
    }

    /**
     * Mark start of render
     */
    renderStart(): number {
        return performance.now();
    }

    /**
     * Mark end of render
     */
    renderEnd(startTime: number): void {
        if (!this.isMonitoring) return;

        const renderTime = performance.now() - startTime;
        this.addRenderTime(renderTime);
    }

    /**
     * Increment draw call counter
     */
    incrementDrawCalls(count: number = 1): void {
        if (!this.isMonitoring) return;
        this.drawCalls += count;
    }

    /**
     * Get current performance metrics
     */
    getMetrics(cacheHitRate: number = 0, visibleNodes: number = 0, totalNodes: number = 0): PerformanceMetrics {
        const fps = this.calculateFPS();
        const frameTime = this.getAverageFrameTime();
        const renderTime = this.getAverageRenderTime();
        const memoryUsage = this.getMemoryUsage();

        // Check for performance issues
        this.checkPerformanceThresholds(fps, frameTime, memoryUsage);

        return {
            fps,
            frameTime,
            renderTime,
            memoryUsage,
            drawCalls: this.drawCalls,
            cacheHitRate,
            visibleNodes,
            totalNodes,
        };
    }

    /**
     * Get performance alerts
     */
    getAlerts(): PerformanceAlert[] {
        return [...this.alerts];
    }

    /**
     * Clear alerts
     */
    clearAlerts(): void {
        this.alerts = [];
    }

    /**
     * Reset counters (call at end of frame)
     */
    resetFrameCounters(): void {
        this.drawCalls = 0;
    }

    /**
     * Add frame time to buffer
     */
    private addFrameTime(frameTime: number): void {
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.FRAME_BUFFER_SIZE) {
            this.frameTimes.shift();
        }
    }

    /**
     * Add render time to buffer
     */
    private addRenderTime(renderTime: number): void {
        this.renderTimes.push(renderTime);
        if (this.renderTimes.length > this.FRAME_BUFFER_SIZE) {
            this.renderTimes.shift();
        }
    }

    /**
     * Calculate current FPS
     */
    private calculateFPS(): number {
        if (this.frameTimes.length === 0) return 0;

        const averageFrameTime = this.getAverageFrameTime();
        return averageFrameTime > 0 ? 1000 / averageFrameTime : 0;
    }

    /**
     * Get average frame time
     */
    private getAverageFrameTime(): number {
        if (this.frameTimes.length === 0) return 0;

        const sum = this.frameTimes.reduce((a, b) => a + b, 0);
        return sum / this.frameTimes.length;
    }

    /**
     * Get average render time
     */
    private getAverageRenderTime(): number {
        if (this.renderTimes.length === 0) return 0;

        const sum = this.renderTimes.reduce((a, b) => a + b, 0);
        return sum / this.renderTimes.length;
    }

    /**
     * Get memory usage (approximate)
     */
    private getMemoryUsage(): number {
        // Use performance.memory if available (Chrome)
        if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
        }

        // Fallback estimation based on frame complexity
        return this.frameCount * 1024; // Rough estimate
    }

    /**
     * Check performance thresholds and create alerts
     */
    private checkPerformanceThresholds(fps: number, frameTime: number, memoryUsage: number): void {
        const now = Date.now();

        // FPS checks
        if (fps < this.FPS_ERROR_THRESHOLD) {
            this.addAlert('error', `Critically low FPS: ${fps.toFixed(1)}`, fps, this.FPS_ERROR_THRESHOLD, now);
        } else if (fps < this.FPS_WARNING_THRESHOLD) {
            this.addAlert('warning', `Low FPS: ${fps.toFixed(1)}`, fps, this.FPS_WARNING_THRESHOLD, now);
        }

        // Frame time checks
        if (frameTime > this.FRAME_TIME_ERROR_THRESHOLD) {
            this.addAlert(
                'error',
                `High frame time: ${frameTime.toFixed(1)}ms`,
                frameTime,
                this.FRAME_TIME_ERROR_THRESHOLD,
                now
            );
        } else if (frameTime > this.FRAME_TIME_WARNING_THRESHOLD) {
            this.addAlert(
                'warning',
                `Elevated frame time: ${frameTime.toFixed(1)}ms`,
                frameTime,
                this.FRAME_TIME_WARNING_THRESHOLD,
                now
            );
        }

        // Memory checks
        if (memoryUsage > this.MEMORY_ERROR_THRESHOLD) {
            this.addAlert(
                'error',
                `High memory usage: ${(memoryUsage / 1024 / 1024).toFixed(1)}MB`,
                memoryUsage,
                this.MEMORY_ERROR_THRESHOLD,
                now
            );
        } else if (memoryUsage > this.MEMORY_WARNING_THRESHOLD) {
            this.addAlert(
                'warning',
                `Elevated memory usage: ${(memoryUsage / 1024 / 1024).toFixed(1)}MB`,
                memoryUsage,
                this.MEMORY_WARNING_THRESHOLD,
                now
            );
        }
    }

    /**
     * Add performance alert
     */
    private addAlert(
        type: 'warning' | 'error',
        message: string,
        value: number,
        threshold: number,
        timestamp: number
    ): void {
        // Avoid duplicate alerts (within 5 seconds)
        const recentAlert = this.alerts.find(
            (alert) => alert.message === message && timestamp - alert.timestamp < 5000
        );

        if (!recentAlert) {
            this.alerts.push({ type, message, value, threshold, timestamp });

            // Keep only recent alerts (last 50)
            if (this.alerts.length > 50) {
                this.alerts.shift();
            }
        }
    }

    /**
     * Get performance summary
     */
    getSummary(): string {
        const metrics = this.getMetrics();
        const alerts = this.getAlerts();

        let summary = `FPS: ${metrics.fps.toFixed(1)}, `;
        summary += `Frame: ${metrics.frameTime.toFixed(1)}ms, `;
        summary += `Render: ${metrics.renderTime.toFixed(1)}ms, `;
        summary += `Draws: ${metrics.drawCalls}, `;
        summary += `Cache: ${(metrics.cacheHitRate * 100).toFixed(1)}%`;

        if (alerts.length > 0) {
            const errorCount = alerts.filter((a) => a.type === 'error').length;
            const warningCount = alerts.filter((a) => a.type === 'warning').length;
            summary += ` | Alerts: ${errorCount} errors, ${warningCount} warnings`;
        }

        return summary;
    }

    /**
     * Export metrics for analysis
     */
    exportMetrics(): {
        frameTimes: number[];
        renderTimes: number[];
        alerts: PerformanceAlert[];
        summary: PerformanceMetrics;
    } {
        return {
            frameTimes: [...this.frameTimes],
            renderTimes: [...this.renderTimes],
            alerts: [...this.alerts],
            summary: this.getMetrics(),
        };
    }
}
