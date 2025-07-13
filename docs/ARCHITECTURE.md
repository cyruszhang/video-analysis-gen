# Video Analysis System Architecture

## Overview

The Video Analysis System is a comprehensive solution for creating hockey review tapes from LiveBarn footage with real-time commentary. The system consists of two main components that work together to provide a seamless experience for coaches and analysts.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Backend API   │    │  LiveBarn Web   │
│  (React Native) │◄──►│  (Node.js/TS)   │◄──►│   (Puppeteer)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Local Storage  │    │  Video Processor│    │  Video Segments │
│  (AsyncStorage) │    │   (FFmpeg)      │    │   (Downloads)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Details

### 1. Mobile Application (React Native)

**Purpose**: Real-time comment capture and session management

**Key Features**:
- Real-time timestamp capture during live games
- Offline-first data storage with sync capabilities
- Intuitive UI for quick comment entry
- Session management and history
- Rink and team selection

**Technology Stack**:
- React Native with TypeScript
- Expo for development and deployment
- Zustand for state management
- React Navigation for routing
- React Native Paper for UI components

**Data Flow**:
1. User creates new session with rink/team info
2. During game, user records comments with timestamps
3. Comments stored locally with offline capability
4. Data synced to backend when connection available

### 2. Backend Processor (Node.js)

**Purpose**: Automated video processing and LiveBarn integration

**Key Features**:
- Automated LiveBarn authentication and navigation
- Video segment download and processing
- Video stitching with smooth transitions
- Comment overlay generation
- Real-time job queue management
- WebSocket support for live updates

**Technology Stack**:
- Node.js with TypeScript
- Express.js for REST API
- Puppeteer for web automation
- FFmpeg for video processing
- Socket.io for real-time communication
- Winston for logging

**Core Services**:

#### LiveBarnProcessor
- Handles browser automation for LiveBarn
- Manages authentication and session cookies
- Navigates to specific rink feeds
- Downloads video segments based on timestamps

#### VideoProcessor
- Stitches multiple video segments together
- Generates subtitle files from comments
- Adds comment overlays with proper timing
- Handles video metadata and optimization

#### JobQueue
- Manages processing job lifecycle
- Provides real-time progress updates
- Handles error recovery and retries
- Coordinates between LiveBarn and video processing

## Data Models

### GameSession
```typescript
interface GameSession {
  id: string;
  rinkLocation: RinkLocation;
  gameDate: Date;
  homeTeam: string;
  awayTeam: string;
  comments: Comment[];
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

### Comment
```typescript
interface Comment {
  id: string;
  timestamp: number; // Unix timestamp in milliseconds
  text: string;
  author: string;
  gameTime?: string; // Optional game time (e.g., "15:30 2nd Period")
  position?: { x: number; y: number };
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### VideoSegment
```typescript
interface VideoSegment {
  id: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  filePath?: string;
  status: VideoSegmentStatus;
  comments: Comment[];
}
```

## Processing Workflow

### 1. Session Creation
```
Mobile App → Backend API → Database
     ↓
Session created with rink/team info
```

### 2. Real-time Comment Capture
```
Mobile App (Local Storage)
     ↓
Comments with timestamps stored locally
     ↓
Sync to backend when connection available
```

### 3. Video Processing Initiation
```
Mobile App → Backend API → Job Queue
     ↓
Processing job created and queued
```

### 4. LiveBarn Integration
```
Job Queue → LiveBarnProcessor → LiveBarn Web
     ↓
Authentication and session management
     ↓
Navigate to specific rink feed
```

### 5. Video Segment Download
```
LiveBarnProcessor → Video Segments
     ↓
Download segments based on comment timestamps
     ↓
Store locally for processing
```

### 6. Video Processing
```
VideoProcessor → FFmpeg
     ↓
Stitch segments into single video
     ↓
Add comment overlays with timing
     ↓
Generate final review video
```

### 7. Completion and Notification
```
VideoProcessor → Job Queue → WebSocket → Mobile App
     ↓
Job status updated to completed
     ↓
Real-time notification to mobile app
     ↓
Final video available for download
```

## Security Considerations

### Authentication & Authorization
- JWT-based API authentication
- Secure storage of LiveBarn credentials
- Rate limiting on API endpoints
- Input validation and sanitization

### Data Protection
- Encrypted storage of sensitive data
- Secure transmission of credentials
- File upload validation and scanning
- Access control for video files

### Privacy
- User data anonymization options
- Secure deletion of temporary files
- Compliance with data protection regulations
- Audit logging for data access

## Performance Optimization

### Mobile App
- Offline-first architecture
- Efficient local storage management
- Optimized UI rendering
- Background sync capabilities

### Backend Processing
- Concurrent job processing
- Efficient video processing with FFmpeg
- Memory management for large files
- Disk I/O optimization

### Network Optimization
- Compressed data transmission
- Efficient WebSocket communication
- Progressive video loading
- CDN integration for video delivery

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Database connection pooling
- Load balancing for API endpoints
- Microservices architecture potential

### Vertical Scaling
- Resource monitoring and optimization
- Efficient memory usage
- CPU-intensive task optimization
- Storage capacity planning

### Caching Strategy
- Redis for session management
- CDN for video delivery
- Browser caching for static assets
- Database query optimization

## Monitoring and Observability

### Logging
- Structured logging with Winston
- Error tracking and alerting
- Performance metrics collection
- Audit trail maintenance

### Health Checks
- API endpoint health monitoring
- Database connectivity checks
- External service availability
- Resource usage monitoring

### Metrics
- Job processing times
- Video processing performance
- API response times
- Error rates and types

## Deployment Architecture

### Development Environment
```
Local Development
├── Mobile App (Expo)
├── Backend API (Node.js)
└── Database (SQLite)
```

### Production Environment
```
Production Deployment
├── Mobile App (App Store/Play Store)
├── Backend API (Cloud/Container)
├── Database (PostgreSQL/MySQL)
├── File Storage (S3/Cloud Storage)
└── CDN (Video Delivery)
```

## Future Enhancements

### AI/ML Integration
- Automated highlight detection
- Player tracking and analysis
- Performance analytics
- Predictive insights

### Advanced Features
- Multi-camera support
- Real-time collaboration
- Advanced video editing
- Integration with other platforms

### Platform Expansion
- Web application
- Desktop application
- API for third-party integrations
- Mobile app for different sports 