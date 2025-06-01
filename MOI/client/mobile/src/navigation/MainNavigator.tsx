import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../utils/theme';

// Screens
import HomeScreen from '../screens/main/HomeScreen';
import ContentScreen from '../screens/main/ContentScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ApprovalScreen from '../screens/content/ApprovalScreen';
import ContentDetailScreen from '../screens/content/ContentDetailScreen';

export type MainTabParamList = {
  Home: undefined;
  Content: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type ContentStackParamList = {
  ContentList: undefined;
  ContentDetail: { contentId: string };
  Approval: { contentId: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const ContentStack = createStackNavigator<ContentStackParamList>();

const ContentNavigator = () => {
  return (
    <ContentStack.Navigator>
      <ContentStack.Screen
        name="ContentList"
        component={ContentScreen}
        options={{ headerShown: false }}
      />
      <ContentStack.Screen
        name="ContentDetail"
        component={ContentDetailScreen}
        options={{ title: 'Content Details' }}
      />
      <ContentStack.Screen
        name="Approval"
        component={ApprovalScreen}
        options={{ title: 'Content Approval' }}
      />
    </ContentStack.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Content':
              iconName = focused ? 'file-document' : 'file-document-outline';
              break;
            case 'Notifications':
              iconName = focused ? 'bell' : 'bell-outline';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: '#e0e0e0',
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Content"
        component={ContentNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
