# YARN Scheduler UI - Project Overview

## Project Purpose

The YARN Scheduler UI is a modern web-based interface for managing Apache Hadoop YARN Capacity Scheduler configurations. This tool provides an intuitive visual interface for viewing, editing, and managing queue hierarchies in YARN clusters.

## Key Features

- **Visual Queue Tree**: Interactive hierarchical view of scheduler queues
- **Multi-mode Capacity Management**: Support for percentage, weight, and absolute resource modes
- **Batch Operations**: Stage multiple changes and apply them atomically
- **Real-time Validation**: Client-side validation with capacity totals checking
- **Search & Sort**: Find queues quickly with search and sorting options
- **Change Tracking**: Visual indicators for pending additions, modifications, and deletions

## Project Status

- Currently under development
- Version 2 implementation using React from scratch
- Will eventually be integrated into the Hadoop repository
- Live demo available at: https://brumi1024.github.io/yarn-scheduler-ui/

## Development Environment

- Local development server runs on port 8080
- Automatically loads mock data for development and testing
- No backend required for development (uses MSW for API mocking)
