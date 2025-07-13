import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  FAB,
  Portal,
  Modal,
  List,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { GameSession, RinkLocation } from '../../../shared/types';
import { useSessionStore } from '../stores/sessionStore';
import { apiService } from '../services/api';

// Mock rink locations - in real app, this would come from API
const MOCK_RINKS: RinkLocation[] = [
  {
    id: '1',
    name: 'Ice Palace Arena',
    address: '123 Hockey Way, Toronto, ON',
    livebarnId: 'ice_palace_toronto',
    timezone: 'America/Toronto',
  },
  {
    id: '2',
    name: 'Frozen Pond Center',
    address: '456 Skate Street, Toronto, ON',
    livebarnId: 'frozen_pond_toronto',
    timezone: 'America/Toronto',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { sessions, createSession } = useSessionStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRink, setSelectedRink] = useState<RinkLocation | null>(null);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [rinks, setRinks] = useState<RinkLocation[]>([]);
  const [loadingRinks, setLoadingRinks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch rinks from API on component mount
  useEffect(() => {
    const fetchRinks = async () => {
      try {
        setLoadingRinks(true);
        const fetchedRinks = await apiService.getRinks();
        setRinks(fetchedRinks);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch rinks:', err);
        setError('Failed to load rinks');
        // Fallback to mock rinks if API fails
        setRinks(MOCK_RINKS);
      } finally {
        setLoadingRinks(false);
      }
    };

    fetchRinks();
  }, []);

  const handleStartSession = () => {
    if (!selectedRink || !homeTeam.trim() || !awayTeam.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newSession: GameSession = {
      id: uuidv4(),
      rinkLocation: selectedRink,
      gameDate: new Date(),
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      comments: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    createSession(newSession);
    setModalVisible(false);
    setSelectedRink(null);
    setHomeTeam('');
    setAwayTeam('');
    
    navigation.navigate('Session' as never, { sessionId: newSession.id } as never);
  };

  const activeSession = sessions.find(s => s.status === 'active');

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <Title>Welcome to Video Analysis</Title>
            <Paragraph>
              Create hockey review tapes with real-time commentary and automated video processing.
            </Paragraph>
          </Card.Content>
        </Card>

        {activeSession && (
          <Card style={styles.activeSessionCard}>
            <Card.Content>
              <Title>Active Session</Title>
              <Paragraph>
                {activeSession.homeTeam} vs {activeSession.awayTeam}
              </Paragraph>
              <Paragraph>
                {activeSession.rinkLocation.name}
              </Paragraph>
              <Paragraph>
                Started: {format(activeSession.createdAt, 'MMM dd, yyyy HH:mm')}
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('Session' as never, { sessionId: activeSession.id } as never)}
              >
                Continue Session
              </Button>
            </Card.Actions>
          </Card>
        )}

        <Card style={styles.recentSessionsCard}>
          <Card.Content>
            <Title>Recent Sessions</Title>
            {sessions.slice(0, 5).map((session) => (
              <List.Item
                key={session.id}
                title={`${session.homeTeam} vs ${session.awayTeam}`}
                description={`${session.rinkLocation.name} - ${format(session.createdAt, 'MMM dd, yyyy')}`}
                left={(props) => <List.Icon {...props} icon="hockey-sticks" />}
                right={(props) => (
                  <View {...props}>
                    <Paragraph style={styles.statusText}>{session.status}</Paragraph>
                  </View>
                )}
                onPress={() => navigation.navigate('Session' as never, { sessionId: session.id } as never)}
              />
            ))}
            {sessions.length === 0 && (
              <Paragraph>No sessions yet. Start your first game!</Paragraph>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Title style={styles.modalTitle}>Start New Session</Title>
          
          <TextInput
            label="Home Team"
            value={homeTeam}
            onChangeText={setHomeTeam}
            style={styles.input}
          />
          
          <TextInput
            label="Away Team"
            value={awayTeam}
            onChangeText={setAwayTeam}
            style={styles.input}
          />

          <Title style={styles.sectionTitle}>Select Rink</Title>
          {loadingRinks ? (
            <Paragraph>Loading rinks...</Paragraph>
          ) : error ? (
            <Paragraph style={{ color: 'red' }}>{error}</Paragraph>
          ) : rinks.length === 0 ? (
            <Paragraph>No rinks available</Paragraph>
          ) : (
            rinks.map((rink) => (
              <List.Item
                key={rink.id}
                title={rink.name}
                description={rink.address}
                left={(props) => (
                  <List.Icon 
                    {...props} 
                    icon={selectedRink?.id === rink.id ? "radiobox-marked" : "radiobox-blank"} 
                  />
                )}
                onPress={() => setSelectedRink(rink)}
                style={[
                  styles.rinkItem,
                  selectedRink?.id === rink.id && styles.selectedRinkItem
                ]}
              />
            ))
          )}

          <View style={styles.modalActions}>
            <Button 
              mode="outlined" 
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleStartSession}
              style={styles.modalButton}
            >
              Start Session
            </Button>
          </View>
        </Modal>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setModalVisible(true)}
      />
    </View>
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
  welcomeCard: {
    marginBottom: 16,
  },
  activeSessionCard: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  recentSessionsCard: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  rinkItem: {
    borderRadius: 4,
  },
  selectedRinkItem: {
    backgroundColor: '#e3f2fd',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
}); 