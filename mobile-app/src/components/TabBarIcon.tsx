import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TabBarIconProps {
  route: string;
  focused: boolean;
  color: string;
  size: number;
}

export function TabBarIcon({ route, focused, color, size }: TabBarIconProps) {
  let iconName: keyof typeof MaterialCommunityIcons.glyphMap;

  if (route === 'Home') {
    iconName = focused ? 'home' : 'home-outline';
  } else if (route === 'History') {
    iconName = focused ? 'history' : 'history';
  } else if (route === 'Settings') {
    iconName = focused ? 'cog' : 'cog-outline';
  } else {
    iconName = 'circle';
  }

  return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
} 