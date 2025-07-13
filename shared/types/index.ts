// Core data types shared between mobile app and backend processor

export interface Comment {
  id: string;
  timestamp: number; // Unix timestamp in milliseconds
  text: string;
  author: string;
  gameTime?: string; // Optional game time (e.g., "15:30 2nd Period")
  position?: {
    x: number;
    y: number;
  };
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameSession {
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

export interface RinkLocation {
  id: string;
  name: string;
  address: string;
  livebarnId: string; // LiveBarn's internal rink identifier
  timezone: string;
}

export type SessionStatus = 
  | 'active'      // Currently recording comments
  | 'processing'  // Backend is downloading/processing videos
  | 'completed'   // Final video is ready
  | 'failed'      // Processing failed

export interface VideoSegment {
  id: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  filePath?: string;
  status: VideoSegmentStatus;
  comments: Comment[];
}

export type VideoSegmentStatus = 
  | 'pending'     // Waiting to be downloaded
  | 'downloading' // Currently downloading
  | 'downloaded'  // Successfully downloaded
  | 'failed'      // Download failed

export interface ProcessedVideo {
  id: string;
  sessionId: string;
  filePath: string;
  duration: number;
  resolution: string;
  fileSize: number;
  createdAt: Date;
  metadata: VideoMetadata;
}

export interface VideoMetadata {
  rinkLocation: RinkLocation;
  gameDate: Date;
  homeTeam: string;
  awayTeam: string;
  totalComments: number;
  segments: VideoSegment[];
}

export interface LiveBarnCredentials {
  email: string;
  password: string;
  sessionToken?: string;
}

export interface ProcessingJob {
  id: string;
  sessionId: string;
  status: JobStatus;
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export type JobStatus = 
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
} 