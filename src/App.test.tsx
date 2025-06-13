import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
    it('renders YARN Capacity Scheduler title', () => {
        render(<App />);
        expect(screen.getByText('YARN Capacity Scheduler')).toBeInTheDocument();
    });

    it('renders the main navigation tabs', () => {
        render(<App />);
        expect(screen.getByText('Queues')).toBeInTheDocument();
        expect(screen.getByText('Global Settings')).toBeInTheDocument();
        expect(screen.getByText('Node Labels')).toBeInTheDocument();
        expect(screen.getByText('Diagnostics')).toBeInTheDocument();
    });

    it('renders the default Queue Visualization view', () => {
        render(<App />);
        expect(screen.getByText('Queue Visualization')).toBeInTheDocument();
        expect(screen.getByText(/Interactive YARN Capacity Scheduler queue tree/)).toBeInTheDocument();
    });

    it('renders status bar', () => {
        render(<App />);
        expect(screen.getByText('YARN Scheduler UI v2.0')).toBeInTheDocument();
    });
});
