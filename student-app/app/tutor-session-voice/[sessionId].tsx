import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, IconButton, ActivityIndicator, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { TutorSession, TutorTurn, Assignment, AssignmentRubric } from '../../types/database.types';
import { Audio } from 'expo-av';
import { transcribeAudio, textToSpeech } from '../../lib/openai';
import { generateTutorResponse, shouldMoveToNextRubric } from '../../lib/anthropic';
import { gradeConversation } from '../../lib/grading';
import { useAuthStore } from '../../stores/authStore';

export default function TutorSessionVoiceScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const studentId = useAuthStore((state) => state.studentId);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

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

  // Request audio permissions and start conversation on mount
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permissions to use voice mode.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Start the conversation if not started
      if (!hasStarted && assignment && rubrics && (!messages || messages.length === 0)) {
        setHasStarted(true);
        await startConversation();
      }
    })();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [assignment, rubrics, messages]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const startConversation = async () => {
    if (!assignment || !rubrics) return;

    setIsProcessing(true);
    try {
      const currentRubricIndex = 0;

      // Generate initial AI greeting
      const aiResponse = await generateTutorResponse({
        assignment,
        rubrics,
        conversationHistory: [],
        currentRubricIndex,
      });

      // Save AI's greeting
      const { error } = await supabase
        .from('tutor_turns')
        .insert([{
          session_id: sessionId,
          turn_index: 1,
          role: 'ai',
          content: aiResponse,
        }]);

      if (error) throw error;

      // Convert to speech and play
      const audioUri = await textToSpeech(aiResponse);
      await playAudio(audioUri);

      queryClient.invalidateQueries({ queryKey: ['turns', sessionId] });
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start the conversation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      // Set audio mode back to recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording || !assignment || !rubrics || !messages) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('No audio URI');
      }

      // Transcribe the audio
      const transcription = await transcribeAudio(uri);
      console.log('Transcribed:', transcription);

      const turnIndex = messages.length + 1;

      // Save student's response
      const { error: studentError } = await supabase
        .from('tutor_turns')
        .insert([{
          session_id: sessionId,
          turn_index: turnIndex,
          role: 'student',
          content: transcription,
        }]);

      if (studentError) throw studentError;

      // Refresh messages to include student response
      await queryClient.invalidateQueries({ queryKey: ['turns', sessionId] });
      const updatedMessages = await queryClient.fetchQuery({
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

      // Determine current rubric
      const currentRubricIndex = shouldMoveToNextRubric(updatedMessages, Math.floor(updatedMessages.length / 6))
        ? Math.min(Math.floor(updatedMessages.length / 6) + 1, rubrics.length - 1)
        : Math.floor(updatedMessages.length / 6);

      // Generate AI response
      const aiResponse = await generateTutorResponse({
        assignment,
        rubrics,
        conversationHistory: updatedMessages,
        currentRubricIndex,
      });

      // Save AI response
      const { error: aiError } = await supabase
        .from('tutor_turns')
        .insert([{
          session_id: sessionId,
          turn_index: turnIndex + 1,
          role: 'ai',
          content: aiResponse,
        }]);

      if (aiError) throw aiError;

      // Convert to speech and play
      const audioUri = await textToSpeech(aiResponse, 'nova');
      await playAudio(audioUri);

      queryClient.invalidateQueries({ queryKey: ['turns', sessionId] });
    } catch (error) {
      console.error('Error processing recording:', error);
      Alert.alert('Error', 'Failed to process your response. Please try again.');
    } finally {
      setRecording(null);
      setIsProcessing(false);
    }
  };

  const playAudio = async (audioUri: string) => {
    try {
      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Set audio mode for playback (not recording)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {
          shouldPlay: true,
          volume: 1.0, // Maximum volume
        }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const playMessage = async (messageId: string, content: string) => {
    if (isPlaying && currentPlayingId === messageId) {
      // Stop playing
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      setIsPlaying(false);
      setCurrentPlayingId(null);
      return;
    }

    setCurrentPlayingId(messageId);
    const audioUri = await textToSpeech(content);
    await playAudio(audioUri);
  };

  const currentRubricIndex = messages ? Math.floor(messages.length / 6) : 0;
  const currentRubric = rubrics && rubrics.length > currentRubricIndex ? rubrics[currentRubricIndex] : rubrics?.[0];

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerTitle}>
          {assignment?.title}
        </Text>
        {currentRubric && (
          <Text variant="bodySmall" style={styles.rubricInfo}>
            Current Objective: {currentRubric.rubric_title}
          </Text>
        )}
        <Text variant="labelSmall" style={styles.modeLabel}>
          🎤 Voice Mode
        </Text>
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
              variant="bodySmall"
              style={msg.role === 'student' ? styles.studentText : styles.aiText}
            >
              {msg.content}
            </Text>
          </View>
        ))}

        {isProcessing && (
          <Card style={[styles.messageBubble, styles.aiBubble]}>
            <Card.Content>
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#1976d2" />
                <Text variant="bodySmall" style={styles.processingText}>
                  {isRecording ? 'Listening...' : 'Thinking...'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <View style={styles.recordingContainer}>
        <Text variant="bodySmall" style={styles.instruction}>
          {isRecording ? '🔴 Recording... Tap to stop' : isProcessing ? 'Processing...' : 'Tap to record your answer'}
        </Text>

        <View style={styles.buttonRow}>
          <IconButton
            icon={isRecording ? 'stop-circle' : 'microphone'}
            size={60}
            iconColor={isRecording ? '#d32f2f' : '#1976d2'}
            style={[
              styles.micButton,
              isRecording && styles.recordingActive,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          />
        </View>

        <Button
          mode="outlined"
          onPress={async () => {
            Alert.alert(
              'End Conversation',
              'Are you sure you want to end this conversation? Your responses will be graded.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'End & Grade',
                  onPress: async () => {
                    if (!assignment || !rubrics || !messages || !studentId) {
                      Alert.alert('Error', 'Missing data to complete grading');
                      return;
                    }

                    setIsProcessing(true);
                    try {
                      // 1. Complete the session
                      await supabase
                        .from('tutor_sessions')
                        .update({ status: 'completed', completed_at: new Date().toISOString() })
                        .eq('id', sessionId);

                      // 2. Grade the conversation
                      const gradeResult = await gradeConversation({
                        assignment,
                        rubrics,
                        conversationHistory: messages,
                      });

                      // 3. Save the grade
                      const { error: gradeError } = await supabase
                        .from('session_grades')
                        .insert([{
                          session_id: sessionId,
                          overall_score: gradeResult.overall_score,
                          rubric_scores: gradeResult.rubric_scores,
                          ai_feedback: gradeResult.ai_feedback,
                        }]);

                      if (gradeError) throw gradeError;

                      // 4. Update or create student_assignment status
                      const { data: existingAssignment } = await supabase
                        .from('student_assignments')
                        .select('*')
                        .eq('student_id', studentId)
                        .eq('assignment_id', assignment.id)
                        .maybeSingle();

                      if (existingAssignment) {
                        // Update existing
                        await supabase
                          .from('student_assignments')
                          .update({
                            status: 'retake',
                            current_session_id: sessionId,
                            latest_score: gradeResult.overall_score,
                            attempts: existingAssignment.attempts + 1,
                            last_attempt_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                          })
                          .eq('id', existingAssignment.id);
                      } else {
                        // Create new
                        await supabase
                          .from('student_assignments')
                          .insert([{
                            student_id: studentId,
                            assignment_id: assignment.id,
                            status: 'retake',
                            current_session_id: sessionId,
                            latest_score: gradeResult.overall_score,
                            attempts: 1,
                            last_attempt_at: new Date().toISOString(),
                          }]);
                      }

                      // 5. Navigate to results screen
                      router.replace(`/session-results/${sessionId}`);
                    } catch (error) {
                      console.error('Error grading conversation:', error);
                      Alert.alert('Error', 'Failed to grade the conversation. Please try again.');
                    } finally {
                      setIsProcessing(false);
                    }
                  },
                },
              ]
            );
          }}
          style={styles.endButton}
          textColor="#d32f2f"
          disabled={isProcessing}
        >
          End Conversation
        </Button>
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
  loadingText: {
    marginTop: 12,
    color: '#666',
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
  modeLabel: {
    color: '#1976d2',
    marginTop: 4,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  studentBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1976d2',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  messageContent: {
    padding: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageText: {
    flex: 1,
  },
  studentText: {
    color: '#fff',
  },
  aiText: {
    color: '#333',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    color: '#666',
  },
  recordingContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  instruction: {
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  micButton: {
    backgroundColor: '#e3f2fd',
  },
  recordingActive: {
    backgroundColor: '#ffebee',
  },
  endButton: {
    marginTop: 8,
    borderColor: '#d32f2f',
  },
});
