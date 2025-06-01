import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useApp } from '../contexts/AppContext';

const LoadingOverlay = () => {
  const { isLoading } = useApp();

  return (
    <Modal
      transparent
      visible={isLoading}
      animationType="fade"
      onRequestClose={() => {}}
      testID="loading-overlay"
    >
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" testID="loading-indicator" />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default LoadingOverlay; 