# Video Analysis Generator

A comprehensive system for creating hockey review tapes from LiveBarn footage with real-time commentary and automated video processing.

## Overview

This application consists of two main components:

1. **Mobile App** - Real-time comment capture with timestamps
2. **Background Processor** - Automated video download, stitching, and overlay generation

## Architecture

### Mobile App (React Native)
- Real-time comment input with timestamp capture
- Rink location selection
- Session management and data sync
- Offline capability for poor connectivity

### Background Processor (Node.js/Python)
- LiveBarn authentication and session management
- Video segment download automation
- Video stitching and processing
- Comment overlay generation
- Final video export

## Project Structure

```
video-analysis-gen/
├── mobile-app/                 # React Native mobile application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── screens/           # App screens
│   │   ├── services/          # API and data services
│   │   ├── utils/             # Helper functions
│   │   └── types/             # TypeScript definitions
│   ├── assets/                # Images, fonts, etc.
│   └── package.json
├── backend/                   # Background processing system
│   ├── src/
│   │   ├── services/          # Core business logic
│   │   ├── video-processor/   # Video processing modules
│   │   ├── livebarn-client/   # LiveBarn API integration
│   │   ├── database/          # Data persistence
│   │   └── api/               # REST API endpoints
│   ├── config/                # Configuration files
│   └── package.json
├── shared/                    # Shared types and utilities
│   ├── types/                 # Common TypeScript interfaces
│   └── utils/                 # Shared utility functions
└── docs/                      # Documentation
```

## Key Features

### Mobile App Features
- Real-time timestamp capture during live games
- Comment input with rich text formatting
- Rink location and game selection
- Offline data storage
- Session synchronization
- User authentication

### Background Processor Features
- Automated LiveBarn login and session management
- Intelligent video segment detection and download
- Video stitching with smooth transitions
- Comment overlay generation with timing
- Multiple export formats (MP4, MOV)
- Progress tracking and notifications

## Technology Stack

### Mobile App
- React Native with TypeScript
- Expo for development and deployment
- AsyncStorage for local data
- React Navigation for routing

### Backend Processor
- Node.js with TypeScript
- FFmpeg for video processing
- Puppeteer for web automation
- SQLite/PostgreSQL for data storage
- Express.js for API endpoints

### Shared
- TypeScript for type safety
- Zod for data validation
- Jest for testing

## Getting Started

See individual component READMEs for setup instructions:
- [Mobile App Setup](./mobile-app/README.md)
- [Backend Setup](./backend/README.md)
