import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { StudentAssignment } from '../../types/database.types';

export default function ProgressScreen() {
  const studentName = useAuthStore((state) => state.studentName);
  const studentId = useAuthStore((state) => state.studentId);

  const { data: studentAssignments, isLoading } = useQuery({
    queryKey: ['student-assignments', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('student_id', studentId);

      if (error) throw error;
      return data as StudentAssignment[];
    },
    enabled: !!studentId,
  });

  // Calculate metrics
  const completedCount = studentAssignments?.filter(sa => sa.status === 'completed' || sa.status === 'retake').length || 0;
  const scores = studentAssignments?.filter(sa => sa.latest_score !== null && sa.latest_score !== undefined).map(sa => sa.latest_score!) || [];
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.greeting}>
          Hi, {studentName}!
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Assignments Completed
            </Text>
            <Text variant="displaySmall" style={styles.statNumber}>
              {completedCount}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Average Score
            </Text>
            <Text variant="displaySmall" style={styles.statNumber}>
              {averageScore !== null ? `${averageScore.toFixed(1)}%` : '--'}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Total Attempts
            </Text>
            <Text variant="displaySmall" style={styles.statNumber}>
              {studentAssignments?.reduce((sum, sa) => sum + sa.attempts, 0) || 0}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.placeholder}>
          <Text variant="bodyLarge" style={styles.placeholderText}>
            Progress charts and detailed statistics will appear here as you complete assignments.
          </Text>
        </View>
      </View>
    </ScrollView>
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
  greeting: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  cardTitle: {
    marginBottom: 8,
    color: '#666',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  placeholder: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#1976d2',
  },
});
