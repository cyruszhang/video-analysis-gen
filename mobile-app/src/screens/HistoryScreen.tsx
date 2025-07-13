import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, List, Paragraph } from 'react-native-paper';
import { format } from 'date-fns';
import { useSessionStore } from '../stores/sessionStore';

export default function HistoryScreen() {
  const { sessions } = useSessionStore();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Session History</Title>
            {sessions.length === 0 ? (
              <Paragraph>No sessions found</Paragraph>
            ) : (
              sessions.map((session) => (
                <List.Item
                  key={session.id}
                  title={`${session.homeTeam} vs ${session.awayTeam}`}
                  description={`${session.rinkLocation.name} - ${format(session.createdAt, 'MMM dd, yyyy')}`}
                  left={(props) => <List.Icon {...props} icon="hockey-sticks" />}
                />
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
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
  card: {
    marginBottom: 16,
  },
}); 