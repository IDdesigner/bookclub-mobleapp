import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { TutorSession, TutorTurn, Assignment, AssignmentRubric } from '../../types/database.types';

export default function TutorSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputMessage, setInputMessage] = useState('');

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data as TutorSession;
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

  const { data: messages, isLoading } = useQuery({
    queryKey: ['turns', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_turns')
        .select('*')
        .eq('session_id', sessionId)
        .order('turn_index', { ascending: true });

      if (error) throw error;
      return data as TutorTurn[];
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      // Get current turn index
      const turnIndex = messages ? messages.length + 1 : 1;

      // Save student's message
      const { data: studentTurn, error: studentError } = await supabase
        .from('tutor_turns')
        .insert([{
          session_id: sessionId,
          turn_index: turnIndex,
          role: 'student',
          content: message,
        }])
        .select()
        .single();

      if (studentError) throw studentError;

      // TODO: Call Anthropic API to get AI response
      // For now, we'll add a placeholder AI response
      const aiResponse = "I understand your response. Let me ask you another question about the reading...";

      const { data: aiTurn, error: aiError } = await supabase
        .from('tutor_turns')
        .insert([{
          session_id: sessionId,
          turn_index: turnIndex + 1,
          role: 'ai',
          content: aiResponse,
        }])
        .select()
        .single();

      if (aiError) throw aiError;

      return { studentTurn, aiTurn };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turns', sessionId] });
      setInputMessage('');
    },
  });

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    sendMessageMutation.mutate(inputMessage.trim());
  };

  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Calculate current rubric based on number of turns (rough estimate)
  // TODO: Implement proper rubric tracking in session
  const currentRubricIndex = messages ? Math.floor(messages.length / 4) : 0;
  const currentRubric = rubrics && rubrics.length > currentRubricIndex ? rubrics[currentRubricIndex] : rubrics?.[0];

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading session...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerTitle}>
          {assignment?.title}
        </Text>
        {currentRubric && (
          <Text variant="bodySmall" style={styles.rubricInfo}>
            Current Objective: {currentRubric.rubric_title}
          </Text>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages?.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'student' ? styles.studentBubble : styles.aiBubble,
            ]}
          >
            <Text
              variant="bodyMedium"
              style={msg.role === 'student' ? styles.studentText : styles.aiText}
            >
              {msg.content}
            </Text>
          </View>
        ))}

        {sendMessageMutation.isPending && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <Text variant="bodyMedium" style={styles.aiText}>
              AI is thinking...
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Type your answer..."
          mode="outlined"
          style={styles.input}
          multiline
          maxLength={500}
        />
        <Button
          mode="contained"
          onPress={handleSend}
          disabled={!inputMessage.trim() || sendMessageMutation.isPending}
          style={styles.sendButton}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontWeight: '600',
  },
  rubricInfo: {
    color: '#666',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  studentBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1976d2',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  studentText: {
    color: '#fff',
  },
  aiText: {
    color: '#333',
  },
  inputContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sendButton: {
    paddingVertical: 4,
  },
});
