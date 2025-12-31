import { View, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Assignment } from '../../types/database.types';

export default function TestModeSelectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const studentId = useAuthStore((state) => state.studentId);

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Assignment;
    },
  });

  const createSession = async (mode: 'spoken' | 'typed') => {
    // 1. Create the session
    const { data: session, error } = await supabase
      .from('tutor_sessions')
      .insert([{
        student_id: studentId,
        assignment_id: id,
        status: 'in_progress',
        interaction_mode: mode,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return;
    }

    // 2. Update or create student_assignment status to 'in_progress'
    const { data: existingAssignment } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', studentId)
      .eq('assignment_id', id)
      .maybeSingle();

    if (existingAssignment) {
      // Update existing to in_progress
      await supabase
        .from('student_assignments')
        .update({
          status: 'in_progress',
          current_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAssignment.id);
    } else {
      // Create new record
      await supabase
        .from('student_assignments')
        .insert([{
          student_id: studentId,
          assignment_id: id,
          status: 'in_progress',
          current_session_id: session.id,
          attempts: 0,
        }]);
    }

    // 3. Navigate to session screen
    if (mode === 'spoken') {
      router.push(`/tutor-session-voice/${session.id}`);
    } else {
      router.push(`/tutor-session/${session.id}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.centerContainer}>
        <Text>Assignment not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Choose Test Mode
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          How would you like to take the test for "{assignment.title}"?
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.modeOption}>
              <Text variant="titleLarge" style={styles.modeTitle}>
                🎤 Spoken Test
              </Text>
              <Text variant="bodyMedium" style={styles.modeDescription}>
                Have a conversation with the AI tutor. The tutor will ask questions and you'll respond by speaking.
              </Text>
              <Button
                mode="contained"
                onPress={() => createSession('spoken')}
                style={styles.modeButton}
                icon="microphone"
              >
                Start Spoken Test
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.modeOption}>
              <Text variant="titleLarge" style={styles.modeTitle}>
                ⌨️ Typed Test
              </Text>
              <Text variant="bodyMedium" style={styles.modeDescription}>
                The tutor will write questions and you can type your answers.
              </Text>
              <Button
                mode="outlined"
                onPress={() => createSession('typed')}
                style={styles.modeButton}
                icon="keyboard"
              >
                Start Typed Test
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  modeOption: {
    alignItems: 'center',
  },
  modeTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  modeDescription: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  modeButton: {
    minWidth: 200,
  },
});
