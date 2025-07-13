# Video Analysis Backend Processor

A Node.js backend service for automated LiveBarn video processing and analysis.

## Features

- Automated LiveBarn authentication and session management
- Video segment download and processing
- Video stitching with smooth transitions
- Comment overlay generation
- Real-time job queue management
- WebSocket support for live updates
- Comprehensive logging and monitoring

## Prerequisites

- Node.js 18+
- FFmpeg installed and available in PATH
- LiveBarn account with access to rink feeds
- Sufficient disk space for video processing

## Installation

1. **Install system dependencies:**
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

2. **Install Node.js dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp config/env.example .env
   # Edit .env with your configuration
   ```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# LiveBarn Credentials
LIVEBARN_EMAIL=your_email@example.com
LIVEBARN_PASSWORD=your_password

# Video Processing
VIDEO_OUTPUT_DIR=./output
TEMP_DIR=./temp

# Database
DATABASE_URL=sqlite:./data/video_analysis.db

# Security
JWT_SECRET=your_jwt_secret_here
```

### LiveBarn Setup

1. **Create LiveBarn account** if you don't have one
2. **Subscribe to rink feeds** for the locations you need
3. **Note rink IDs** for configuration
4. **Test login** to ensure credentials work

## Development

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

## Project Structure

```
backend/
├── src/
│   ├── services/              # Core business logic
│   │   ├── livebarn-processor.ts  # LiveBarn automation
│   │   ├── video-processor.ts     # Video processing
│   │   └── job-queue.ts           # Job management
│   ├── api/                   # REST API endpoints
│   │   └── routes/
│   │       ├── sessions.ts    # Session management
│   │       └── processing.ts  # Job processing
│   ├── database/              # Data persistence
│   ├── utils/                 # Utilities
│   │   └── logger.ts          # Logging configuration
│   └── index.ts               # Main entry point
├── config/                    # Configuration files
├── logs/                      # Application logs
├── output/                    # Processed videos
└── temp/                      # Temporary files
```

## Core Services

### LiveBarnProcessor
- Handles LiveBarn authentication
- Navigates to rink feeds
- Downloads video segments
- Manages browser automation

### VideoProcessor
- Stitches video segments together
- Adds comment overlays
- Generates subtitle files
- Handles video metadata

### JobQueue
- Manages processing jobs
- Provides real-time progress updates
- Handles error recovery
- Coordinates between services

## API Endpoints

### Sessions
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

### Processing
- `POST /api/processing/jobs` - Start processing job
- `GET /api/processing/jobs/:id` - Get job status
- `GET /api/processing/jobs` - List all jobs
- `DELETE /api/processing/jobs/:id` - Cancel job

### WebSocket Events
- `jobAdded` - New job added to queue
- `jobStarted` - Job processing started
- `jobProgress` - Job progress update
- `jobCompleted` - Job completed successfully
- `jobFailed` - Job failed with error

## Video Processing Workflow

1. **Session Creation** - Mobile app creates session with comments
2. **Job Queuing** - Session added to processing queue
3. **LiveBarn Authentication** - Automated login to LiveBarn
4. **Rink Feed Location** - Find correct rink and game feed
5. **Segment Download** - Download video segments based on timestamps
6. **Video Stitching** - Combine segments into single video
7. **Overlay Generation** - Add comment overlays with timing
8. **Final Output** - Generate final review video

## Monitoring and Logging

### Log Files
- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only

### Log Levels
- `error` - Application errors
- `warn` - Warning messages
- `info` - General information
- `debug` - Detailed debugging info

### Health Check
```bash
curl http://localhost:3001/health
```

## Performance Considerations

### Video Processing
- Use SSD storage for better I/O performance
- Configure appropriate FFmpeg presets
- Monitor disk space usage
- Implement cleanup for temporary files

### Job Queue
- Limit concurrent jobs based on system resources
- Implement job timeout handling
- Add retry logic for failed operations
- Monitor queue length and processing times

## Security

### Authentication
- Secure storage of LiveBarn credentials
- JWT-based API authentication
- Rate limiting on API endpoints
- Input validation and sanitization

### File Security
- Validate uploaded files
- Scan for malware
- Implement file size limits
- Secure file storage paths

## Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Production Considerations
- Use PM2 or similar process manager
- Set up reverse proxy (nginx)
- Configure SSL/TLS certificates
- Implement monitoring and alerting
- Set up automated backups

## Troubleshooting

### Common Issues

1. **FFmpeg not found:**
   ```bash
   which ffmpeg
   # Add to PATH if needed
   ```

2. **LiveBarn authentication fails:**
   - Check credentials in .env
   - Verify account has access to rink feeds
   - Check for CAPTCHA or 2FA requirements

3. **Video processing errors:**
   - Check disk space
   - Verify FFmpeg installation
   - Review video file formats

4. **Memory issues:**
   - Reduce concurrent job limit
   - Increase Node.js memory limit
   - Monitor system resources

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

## Contributing

1. Follow TypeScript best practices
2. Add comprehensive error handling
3. Write tests for new features
4. Update documentation
5. Follow existing code style

## License

This project is licensed under the MIT License. 