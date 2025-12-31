import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { SessionGrade, Assignment, AssignmentRubric } from '../../types/database.types';

export default function SessionResultsScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();

  const { data: grade, isLoading: gradeLoading } = useQuery({
    queryKey: ['session-grade', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_grades')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;
      return data as SessionGrade;
    },
  });

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: assignment } = useQuery({
    queryKey: ['assignment', session?.assignment_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', session?.assignment_id)
        .single();

      if (error) throw error;
      return data as Assignment;
    },
    enabled: !!session?.assignment_id,
  });

  const { data: rubrics } = useQuery({
    queryKey: ['rubrics', session?.assignment_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_rubrics')
        .select('*')
        .eq('assignment_id', session?.assignment_id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as AssignmentRubric[];
    },
    enabled: !!session?.assignment_id,
  });

  if (gradeLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your results...</Text>
      </View>
    );
  }

  if (!grade) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="titleMedium">No grade available yet</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.button}>
          Go Back
        </Button>
      </View>
    );
  }

  // Get score color based on percentage
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4caf50'; // green
    if (score >= 80) return '#8bc34a'; // light green
    if (score >= 70) return '#ffc107'; // yellow
    if (score >= 60) return '#ff9800'; // orange
    return '#f44336'; // red
  };

  const scoreColor = getScoreColor(grade.overall_score);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {assignment?.title}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Assignment Results
        </Text>
      </View>

      {/* Overall Score */}
      <Card style={styles.scoreCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.scoreLabel}>
            Overall Score
          </Text>
          <Text variant="displayMedium" style={[styles.scoreValue, { color: scoreColor }]}>
            {grade.overall_score.toFixed(1)}%
          </Text>
          {grade.ai_feedback && (
            <View style={styles.feedbackContainer}>
              <Divider style={styles.divider} />
              <Text variant="bodyMedium" style={styles.feedback}>
                {grade.ai_feedback}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Rubric Breakdown */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Rubric Breakdown
        </Text>

        {rubrics?.map((rubric) => {
          const rubricGrade = grade.rubric_scores[rubric.id];
          if (!rubricGrade) return null;

          const rubricPercentage = (rubricGrade.score / 4) * 100;
          const rubricColor = getScoreColor(rubricPercentage);

          return (
            <Card key={rubric.id} style={styles.rubricCard}>
              <Card.Content>
                <View style={styles.rubricHeader}>
                  <Text variant="titleSmall" style={styles.rubricTitle}>
                    {rubric.rubric_title}
                  </Text>
                  <View style={styles.rubricScore}>
                    <Text variant="titleMedium" style={[styles.rubricScoreText, { color: rubricColor }]}>
                      {rubricGrade.score}/4
                    </Text>
                    <Text variant="bodySmall" style={styles.rubricWeight}>
                      ({rubric.weight}%)
                    </Text>
                  </View>
                </View>

                <Text variant="bodyMedium" style={styles.rubricFeedback}>
                  {rubricGrade.feedback}
                </Text>

                {rubricGrade.evidence && rubricGrade.evidence.length > 0 && (
                  <View style={styles.evidenceContainer}>
                    <Text variant="labelMedium" style={styles.evidenceLabel}>
                      Evidence from your responses:
                    </Text>
                    {rubricGrade.evidence.map((quote, idx) => (
                      <View key={idx} style={styles.evidenceItem}>
                        <Text variant="bodySmall" style={styles.evidenceQuote}>
                          "{quote}"
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => router.push('/(tabs)/assignments')}
          style={styles.button}
        >
          Back to Assignments
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.button}
        >
          Review Conversation
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontWeight: '600',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  scoreCard: {
    margin: 16,
    backgroundColor: '#fff',
  },
  scoreLabel: {
    textAlign: 'center',
    color: '#666',
  },
  scoreValue: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 8,
  },
  feedbackContainer: {
    marginTop: 16,
  },
  divider: {
    marginBottom: 12,
  },
  feedback: {
    color: '#333',
    lineHeight: 22,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  rubricCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  rubricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rubricTitle: {
    flex: 1,
    fontWeight: '600',
  },
  rubricScore: {
    alignItems: 'flex-end',
  },
  rubricScoreText: {
    fontWeight: 'bold',
  },
  rubricWeight: {
    color: '#666',
    marginTop: 2,
  },
  rubricFeedback: {
    color: '#555',
    lineHeight: 20,
    marginTop: 4,
  },
  evidenceContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  evidenceLabel: {
    color: '#666',
    marginBottom: 8,
  },
  evidenceItem: {
    marginBottom: 6,
  },
  evidenceQuote: {
    fontStyle: 'italic',
    color: '#333',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    marginVertical: 4,
  },
});
