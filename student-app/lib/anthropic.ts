import { Assignment, AssignmentRubric, TutorTurn } from '../types/database.types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('Warning: EXPO_PUBLIC_OPENAI_API_KEY is not set');
}

interface TutorContext {
  assignment: Assignment;
  rubrics: AssignmentRubric[];
  conversationHistory: TutorTurn[];
  currentRubricIndex: number;
}

/**
 * Build the system prompt for the AI tutor
 */
function buildSystemPrompt(context: TutorContext): string {
  const { assignment, rubrics, currentRubricIndex } = context;
  const currentRubric = rubrics[currentRubricIndex] || rubrics[0];

  return `You are an AI tutor helping a student understand their reading assignment. Your role is to ask questions and guide the student through a discussion about the reading material.

ASSIGNMENT DETAILS:
Title: ${assignment.title}
Description: ${assignment.description || 'N/A'}
AI Voice: ${assignment.ai_voice} (be ${assignment.ai_voice === 'supportive' ? 'encouraging and patient' : assignment.ai_voice === 'strict' ? 'direct and challenging' : 'fun and engaging'})
Difficulty: ${assignment.ai_tone}
Evidence Required: ${assignment.evidence_required ? 'Students must cite specific examples from the text' : 'General understanding is acceptable'}

READING MATERIAL:
${assignment.pasted_text || 'See book chapters'}

LEARNING OBJECTIVES (Rubrics):
${rubrics.map((r, i) => `${i + 1}. ${r.rubric_title} (Weight: ${r.weight}%)
   Tests: ${r.what_this_tests}
   Looking for: ${r.ai_looking_for}
   ${i === currentRubricIndex ? '← CURRENT FOCUS' : ''}`).join('\n')}

CURRENT RUBRIC FOCUS:
${currentRubric.rubric_title}
What this tests: ${currentRubric.what_this_tests}
What to look for: ${currentRubric.ai_looking_for}

GRADING CRITERIA:
- Strong Mastery (4): ${currentRubric.strong_mastery}
- Adequate (3): ${currentRubric.adequate}
- Emerging (2): ${currentRubric.emerging}
- Minimal (1): ${currentRubric.minimal}
- No Evidence (0): ${currentRubric.no_evidence}

INSTRUCTIONS:
1. Ask thought-provoking questions about the current rubric topic
2. Listen carefully to the student's response
3. Provide feedback and follow-up questions
4. If the response is weak, use: ${currentRubric.example_ai_followup_if_weak || 'Ask a simpler question to build understanding'}
5. Keep responses concise (2-3 sentences) since this is spoken
6. Move to the next rubric once you've adequately assessed this one
7. Be conversational and natural - this is a spoken discussion

Remember: Keep your responses SHORT and CONVERSATIONAL for voice interaction.`;
}

/**
 * Generate the next tutor question or response using OpenAI GPT-4
 */
export async function generateTutorResponse(context: TutorContext): Promise<string> {
  try {
    const systemPrompt = buildSystemPrompt(context);

    // Build conversation history for OpenAI
    const messages = context.conversationHistory
      .filter(turn => turn.content && turn.content.trim().length > 0)
      .map(turn => ({
        role: turn.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: turn.content,
      }));

    // If this is the first message, add an initial user prompt
    if (messages.length === 0) {
      messages.push({
        role: 'user',
        content: 'Hello, I\'m ready to discuss the reading assignment.',
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('No response from OpenAI');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating tutor response:', error);
    throw error;
  }
}

/**
 * Determine if we should move to the next rubric
 * This is a simple implementation - you could make this more sophisticated
 */
export function shouldMoveToNextRubric(conversationHistory: TutorTurn[], currentRubricIndex: number): boolean {
  // Count turns for the current rubric (rough heuristic: 4-6 turns per rubric)
  const turnsPerRubric = 6;
  const totalTurns = conversationHistory.length;
  const expectedTurnsForCurrentRubric = (currentRubricIndex + 1) * turnsPerRubric;

  return totalTurns >= expectedTurnsForCurrentRubric;
}
