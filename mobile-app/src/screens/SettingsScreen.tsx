import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, List, Switch } from 'react-native-paper';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Settings</Title>
          <List.Item
            title="Auto-sync comments"
            description="Automatically sync comments to cloud"
            right={() => <Switch value={true} onValueChange={() => {}} />}
          />
          <List.Item
            title="Notifications"
            description="Receive notifications when videos are ready"
            right={() => <Switch value={false} onValueChange={() => {}} />}
          />
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
}); 