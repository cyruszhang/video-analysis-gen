import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, TextInput, Button } from 'react-native-paper';

export default function CommentScreen() {
  const [comment, setComment] = useState('');

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Add Comment</Title>
          <TextInput
            label="Comment"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            style={styles.input}
          />
          <Button mode="contained" onPress={() => {}}>
            Save Comment
          </Button>
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
  input: {
    marginBottom: 16,
  },
}); 