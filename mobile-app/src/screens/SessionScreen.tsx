import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  FAB,
  List,
  Chip,
  IconButton,
  Portal,
  Modal,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';

import { useSessionStore } from '../stores/sessionStore';

export default function SessionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId } = route.params as { sessionId: string };
  
  const { getSessionById, addComment, updateSession } = useSessionStore();
  const session = getSessionById(sessionId);
  
  const [commentText, setCommentText] = useState('');
  const [gameTime, setGameTime] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!session) {
      Alert.alert('Error', 'Session not found');
      navigation.goBack();
      return;
    }
  }, [session, navigation]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingStartTime(Date.now());
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordingStartTime(null);
    updateSession(sessionId, { status: 'processing' });
  };

  const handleAddComment = () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    const timestamp = recordingStartTime ? Date.now() - recordingStartTime : Date.now();
    
    addComment(sessionId, {
      timestamp,
      text: commentText.trim(),
      author: 'Coach', // In real app, this would be the logged-in user
      gameTime: gameTime.trim() || undefined,
    });

    setCommentText('');
    setGameTime('');
  };

  const formatTimestamp = (timestamp: number) => {
    const minutes = Math.floor(timestamp / 60000);
    const seconds = Math.floor((timestamp % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Paragraph>Loading session...</Paragraph>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <Card style={styles.sessionInfoCard}>
          <Card.Content>
            <Title>{session.homeTeam} vs {session.awayTeam}</Title>
            <Paragraph>{session.rinkLocation.name}</Paragraph>
            <Paragraph>Started: {format(session.createdAt, 'MMM dd, yyyy HH:mm')}</Paragraph>
            <Chip 
              mode="outlined" 
              style={styles.statusChip}
              textStyle={{ color: session.status === 'active' ? '#4caf50' : '#ff9800' }}
            >
              {session.status}
            </Chip>
          </Card.Content>
        </Card>

        <Card style={styles.commentsCard}>
          <Card.Content>
            <Title>Comments ({session.comments.length})</Title>
            {session.comments.length === 0 ? (
              <Paragraph>No comments yet. Start recording to add comments!</Paragraph>
            ) : (
              session.comments.map((comment) => (
                <List.Item
                  key={comment.id}
                  title={comment.text}
                  description={`${formatTimestamp(comment.timestamp)}${comment.gameTime ? ` - ${comment.gameTime}` : ''}`}
                  left={(props) => <List.Icon {...props} icon="comment-text" />}
                  right={(props) => (
                    <View {...props}>
                      <Paragraph style={styles.timestampText}>
                        {formatTimestamp(comment.timestamp)}
                      </Paragraph>
                    </View>
                  )}
                />
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {isRecording && (
        <Card style={styles.recordingCard}>
          <Card.Content>
            <View style={styles.recordingContent}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Paragraph>Recording...</Paragraph>
              </View>
              <TextInput
                label="Game Time (e.g., 15:30 2nd Period)"
                value={gameTime}
                onChangeText={setGameTime}
                style={styles.gameTimeInput}
                mode="outlined"
              />
              <TextInput
                label="Comment"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={3}
                style={styles.commentInput}
                mode="outlined"
              />
              <Button 
                mode="contained" 
                onPress={handleAddComment}
                style={styles.addCommentButton}
              >
                Add Comment
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      <FAB
        style={[styles.fab, isRecording && styles.stopFab]}
        icon={isRecording ? "stop" : "record"}
        onPress={isRecording ? handleStopRecording : handleStartRecording}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sessionInfoCard: {
    marginBottom: 16,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  commentsCard: {
    marginBottom: 16,
  },
  timestampText: {
    fontSize: 12,
    color: '#666',
  },
  recordingCard: {
    margin: 16,
    backgroundColor: '#fff3e0',
  },
  recordingContent: {
    gap: 12,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f44336',
  },
  gameTimeInput: {
    marginBottom: 8,
  },
  commentInput: {
    marginBottom: 8,
  },
  addCommentButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  stopFab: {
    backgroundColor: '#f44336',
  },
}); 