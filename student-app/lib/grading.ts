import { Assignment, AssignmentRubric, TutorTurn, SessionGrade } from '../types/database.types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('Warning: EXPO_PUBLIC_OPENAI_API_KEY is not set');
}

interface GradingContext {
  assignment: Assignment;
  rubrics: AssignmentRubric[];
  conversationHistory: TutorTurn[];
}

interface RubricGrade {
  score: number; // 0-4
  feedback: string;
  evidence: string[]; // Array of quotes from conversation
}

/**
 * Build the grading prompt for OpenAI
 */
function buildGradingPrompt(context: GradingContext, rubric: AssignmentRubric): string {
  const { assignment, conversationHistory } = context;

  // Extract student responses from conversation
  const studentResponses = conversationHistory
    .filter(turn => turn.role === 'student')
    .map((turn, idx) => `Student Response ${idx + 1}: "${turn.content}"`)
    .join('\n');

  return `You are an expert teacher grading a student's reading comprehension assignment based on their conversation with an AI tutor.

ASSIGNMENT DETAILS:
Title: ${assignment.title}
Description: ${assignment.description || 'N/A'}
Evidence Required: ${assignment.evidence_required ? 'Yes - student must cite specific examples' : 'No - general understanding acceptable'}

READING MATERIAL:
${assignment.pasted_text || 'See book chapters'}

RUBRIC TO GRADE:
Title: ${rubric.rubric_title}
What this tests: ${rubric.what_this_tests}
Looking for: ${rubric.ai_looking_for}
Weight: ${rubric.weight}%

GRADING SCALE:
4 (Strong Mastery): ${rubric.strong_mastery}
3 (Adequate): ${rubric.adequate}
2 (Emerging): ${rubric.emerging}
1 (Minimal): ${rubric.minimal}
0 (No Evidence): ${rubric.no_evidence}

STUDENT'S CONVERSATION:
${studentResponses}

INSTRUCTIONS:
Analyze the student's responses in the conversation and assign a score (0-4) based on the rubric criteria.

Return your analysis as a JSON object with this exact structure:
{
  "score": <number 0-4>,
  "feedback": "<2-3 sentences explaining why this score was given>",
  "evidence": ["<quote from student showing mastery>", "<another quote if relevant>"]
}

Focus on what the student actually said. Extract specific quotes that demonstrate (or fail to demonstrate) their understanding. Be fair but rigorous.`;
}

/**
 * Grade a single rubric based on the conversation
 */
async function gradeRubric(context: GradingContext, rubric: AssignmentRubric): Promise<RubricGrade> {
  try {
    const prompt = buildGradingPrompt(context, rubric);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent grading
        messages: [
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
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

    const result = JSON.parse(data.choices[0].message.content);
    return {
      score: result.score,
      feedback: result.feedback,
      evidence: result.evidence || [],
    };
  } catch (error) {
    console.error('Error grading rubric:', error);
    throw error;
  }
}

/**
 * Generate overall feedback based on all rubric grades
 */
async function generateOverallFeedback(
  context: GradingContext,
  rubricGrades: { [rubricId: string]: RubricGrade }
): Promise<string> {
  const { assignment, rubrics } = context;

  const rubricSummaries = rubrics.map(rubric => {
    const grade = rubricGrades[rubric.id];
    return `${rubric.rubric_title}: ${grade.score}/4 - ${grade.feedback}`;
  }).join('\n');

  const prompt = `You are a supportive teacher providing overall feedback on a student's reading assignment.

ASSIGNMENT: ${assignment.title}

RUBRIC GRADES:
${rubricSummaries}

Write a brief (3-4 sentences) overall feedback message that:
1. Acknowledges what the student did well
2. Identifies one key area for improvement
3. Encourages the student

Be warm, specific, and constructive. This is for a student to read directly.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 200,
        temperature: 0.7,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating overall feedback:', error);
    return 'Great job completing this assignment! Keep up the good work.';
  }
}

/**
 * Grade the entire conversation and return a SessionGrade
 */
export async function gradeConversation(context: GradingContext): Promise<Omit<SessionGrade, 'id' | 'session_id' | 'created_at' | 'graded_at'>> {
  const { rubrics } = context;

  // Grade each rubric
  const rubricGrades: { [rubricId: string]: RubricGrade } = {};

  for (const rubric of rubrics) {
    rubricGrades[rubric.id] = await gradeRubric(context, rubric);
  }

  // Calculate weighted overall score
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const rubric of rubrics) {
    const grade = rubricGrades[rubric.id];
    const normalizedScore = (grade.score / 4) * 100; // Convert 0-4 to percentage
    totalWeightedScore += normalizedScore * (rubric.weight / 100);
    totalWeight += rubric.weight;
  }

  const overall_score = totalWeight > 0 ? totalWeightedScore : 0;

  // Generate overall feedback
  const ai_feedback = await generateOverallFeedback(context, rubricGrades);

  return {
    overall_score,
    rubric_scores: rubricGrades,
    ai_feedback,
  };
}
