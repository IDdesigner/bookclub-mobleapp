import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Assignment, AssignmentRubric } from '../../types/database.types';

export default function AssignmentDetailScreen() {
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

  const { data: rubrics } = useQuery({
    queryKey: ['rubrics', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_rubrics')
        .select('*')
        .eq('assignment_id', id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as AssignmentRubric[];
    },
  });

  const handleViewReading = () => {
    router.push(`/reading-material/${id}`);
  };

  const handleStartTest = () => {
    router.push(`/test-mode-selection/${id}`);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading assignment...</Text>
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
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          {assignment.title}
        </Text>

        {assignment.description && (
          <Text variant="bodyLarge" style={styles.description}>
            {assignment.description}
          </Text>
        )}

        {assignment.due_date && (
          <Chip icon="calendar" style={styles.chip}>
            Due: {new Date(assignment.due_date).toLocaleDateString()}
          </Chip>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Reading Material
            </Text>
            <Text variant="bodyMedium" numberOfLines={5} style={styles.readingPreview}>
              {assignment.pasted_text || 'Content from book chapters'}
            </Text>
            <Button
              mode="outlined"
              onPress={handleViewReading}
              style={styles.viewReadingButton}
              icon="file-document-outline"
            >
              View Reading Material
            </Button>
          </Card.Content>
        </Card>

        {rubrics && rubrics.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Learning Objectives ({rubrics.length})
              </Text>
              {rubrics.map((rubric, index) => (
                <View key={rubric.id} style={styles.rubricItem}>
                  <View style={styles.rubricHeader}>
                    <Text variant="bodyLarge" style={styles.rubricTitle}>
                      {index + 1}. {rubric.rubric_title}
                    </Text>
                    <Chip compact={true}>
                      {rubric.weight}%
                    </Chip>
                  </View>
                  <Text variant="bodyMedium" style={styles.rubricDescription}>
                    {rubric.what_this_tests}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          onPress={handleStartTest}
          style={styles.startButton}
          icon="clipboard-check-outline"
        >
          Start Assignment Test
        </Button>
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
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    color: '#666',
    marginBottom: 16,
  },
  chip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  readingPreview: {
    lineHeight: 24,
    color: '#333',
  },
  previewNote: {
    marginTop: 8,
    color: '#999',
    fontStyle: 'italic',
  },
  viewReadingButton: {
    marginTop: 12,
  },
  rubricItem: {
    marginBottom: 16,
  },
  rubricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rubricTitle: {
    fontWeight: '600',
    flex: 1,
  },
  rubricDescription: {
    color: '#666',
    marginTop: 4,
  },
  startButton: {
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 6,
  },
});
