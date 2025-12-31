import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function JoinClassScreen() {
  const router = useRouter();
  const signUpAndJoinClass = useAuthStore((state) => state.signUpAndJoinClass);
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [studentName, setStudentName] = useState('');

  const formatInviteCode = (text: string) => {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 4) {
      return cleaned;
    }
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  };

  const handleInviteCodeChange = (text: string) => {
    const formatted = formatInviteCode(text);
    setInviteCode(formatted);
  };

  const handleJoinClass = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }

    if (!studentName.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    if (!inviteCode || inviteCode.length < 9) {
      Alert.alert('Invalid Code', 'Please enter a valid 8-character invite code.');
      return;
    }

    try {
      await signUpAndJoinClass(email.trim(), password, studentName.trim(), inviteCode);
      // Navigate to assignments after successful signup
      router.replace('/(tabs)/assignments');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join class. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text variant="headlineLarge" style={styles.title}>
            Welcome to Book Club
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Join your class to get started
          </Text>

          <View style={styles.form}>
            <TextInput
              label="Your Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              label="Your Name"
              value={studentName}
              onChangeText={setStudentName}
              mode="outlined"
              style={styles.input}
              autoCapitalize="words"
            />

            <TextInput
              label="Class Invite Code"
              value={inviteCode}
              onChangeText={handleInviteCodeChange}
              mode="outlined"
              style={styles.input}
              placeholder="XXXX-XXXX"
              autoCapitalize="characters"
            />

            {error && (
              <Text variant="bodyMedium" style={styles.errorText}>
                {error}
              </Text>
            )}

            <Button
              mode="contained"
              onPress={handleJoinClass}
              loading={!!isLoading}
              disabled={!!(isLoading || !inviteCode || !studentName || !email || !password)}
              style={styles.button}
            >
              Join Class
            </Button>

            <Button
              mode="text"
              onPress={() => router.push('/(auth)/login')}
              style={styles.textButton}
            >
              Already have an account? Log in
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  textButton: {
    marginTop: 8,
  },
});
