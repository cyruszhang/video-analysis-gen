import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

import { GameSession, Comment, SessionStatus } from '../../../shared/types';

interface SessionState {
  sessions: GameSession[];
  currentSessionId: string | null;
  
  // Actions
  createSession: (session: GameSession) => void;
  updateSession: (sessionId: string, updates: Partial<GameSession>) => void;
  deleteSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string | null) => void;
  
  // Comment actions
  addComment: (sessionId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateComment: (sessionId: string, commentId: string, updates: Partial<Comment>) => void;
  deleteComment: (sessionId: string, commentId: string) => void;
  
  // Getters
  getCurrentSession: () => GameSession | null;
  getSessionById: (sessionId: string) => GameSession | null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      createSession: (session) => {
        set((state) => ({
          sessions: [...state.sessions, session],
          currentSessionId: session.id,
        }));
      },

      updateSession: (sessionId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, ...updates, updatedAt: new Date() }
              : session
          ),
        }));
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== sessionId),
          currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        }));
      },

      setCurrentSession: (sessionId) => {
        set({ currentSessionId: sessionId });
      },

      addComment: (sessionId, commentData) => {
        const newComment: Comment = {
          id: uuidv4(),
          ...commentData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  comments: [...session.comments, newComment],
                  updatedAt: new Date(),
                }
              : session
          ),
        }));
      },

      updateComment: (sessionId, commentId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  comments: session.comments.map((comment) =>
                    comment.id === commentId
                      ? { ...comment, ...updates, updatedAt: new Date() }
                      : comment
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        }));
      },

      deleteComment: (sessionId, commentId) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  comments: session.comments.filter((comment) => comment.id !== commentId),
                  updatedAt: new Date(),
                }
              : session
          ),
        }));
      },

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find((session) => session.id === currentSessionId) || null;
      },

      getSessionById: (sessionId) => {
        const { sessions } = get();
        return sessions.find((session) => session.id === sessionId) || null;
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
); 