import { View, StyleSheet, Alert } from 'react-native';
import { Text, List, Button, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { studentName, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/join-class');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.name}>
          {studentName}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Student
        </Text>
      </View>

      <Divider />

      <List.Section>
        <List.Subheader>Settings</List.Subheader>
        <List.Item
          title="Edit Profile"
          description="Update your name and preferences"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          onPress={() => {
            // TODO: Navigate to edit profile screen
            Alert.alert('Coming Soon', 'Profile editing will be available soon.');
          }}
        />
        <List.Item
          title="Notifications"
          description="Manage notification preferences"
          left={(props) => <List.Icon {...props} icon="bell" />}
          onPress={() => {
            // TODO: Navigate to notifications settings
            Alert.alert('Coming Soon', 'Notification settings will be available soon.');
          }}
        />
        <List.Item
          title="Theme"
          description="Light mode"
          left={(props) => <List.Icon {...props} icon="palette" />}
          onPress={() => {
            // TODO: Toggle theme
            Alert.alert('Coming Soon', 'Theme switching will be available soon.');
          }}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>About</List.Subheader>
        <List.Item
          title="App Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
      </List.Section>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={handleLogout}
          icon="logout"
          textColor="#d32f2f"
          style={styles.logoutButton}
        >
          Logout
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  footer: {
    padding: 16,
    marginTop: 'auto',
  },
  logoutButton: {
    borderColor: '#d32f2f',
  },
});
