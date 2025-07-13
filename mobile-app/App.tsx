import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import SessionScreen from './src/screens/SessionScreen';
import CommentScreen from './src/screens/CommentScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HistoryScreen from './src/screens/HistoryScreen';

// Import components
import { TabBarIcon } from './src/components/TabBarIcon';

// Import store
import { useSessionStore } from './src/stores/sessionStore';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          return <TabBarIcon route={route.name} focused={focused} color={color} size={size} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ title: 'History' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: '#2196F3',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen 
              name="Main" 
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Session" 
              component={SessionScreen}
              options={{ title: 'Game Session' }}
            />
            <Stack.Screen 
              name="Comment" 
              component={CommentScreen}
              options={{ title: 'Add Comment' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </PaperProvider>
    </GestureHandlerRootView>
  );
} 