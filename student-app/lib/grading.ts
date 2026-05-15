import { Assignment, AssignmentRubric, TutorTurn, SessionGrade } from '../types/database.types';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn('Warning: EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');
}

interface GradingContext {
  assignment: Assignment;
  rubrics: AssignmentRubric[];
  conversationHistory: TutorTurn[];
}

interface RubricGrade {
  score: number; // 0-4
  feedback: string;
  evidence: string[];
}

function buildGradingPrompt(context: GradingContext, rubric: AssignmentRubric): string {
  const { assignment, conversationHistory } = context;

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
Analyze the student's responses and assign a score (0-4) based on the rubric criteria.

Return ONLY a JSON object with this exact structure (no markdown, no explanation outside the JSON):
{
  "score": <number 0-4>,
  "feedback": "<2-3 sentences explaining why this score was given>",
  "evidence": ["<quote from student showing mastery>", "<another quote if relevant>"]
}`;
}

async function gradeRubric(context: GradingContext, rubric: AssignmentRubric): Promise<RubricGrade> {
  try {
    const prompt = buildGradingPrompt(context, rubric);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || data.content[0].type !== 'text') {
      throw new Error('No response from Anthropic');
    }

    // Strip markdown code fences if present
    const raw = data.content[0].text.trim();
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const result = JSON.parse(jsonText);

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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error generating overall feedback:', error);
    return 'Great job completing this assignment! Keep up the good work.';
  }
}

export async function gradeConversation(context: GradingContext): Promise<Omit<SessionGrade, 'id' | 'session_id' | 'created_at' | 'graded_at'>> {
  const { rubrics } = context;

  const rubricGrades: { [rubricId: string]: RubricGrade } = {};

  for (const rubric of rubrics) {
    rubricGrades[rubric.id] = await gradeRubric(context, rubric);
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const rubric of rubrics) {
    const grade = rubricGrades[rubric.id];
    const normalizedScore = (grade.score / 4) * 100;
    totalWeightedScore += normalizedScore * (rubric.weight / 100);
    totalWeight += rubric.weight;
  }

  const overall_score = totalWeight > 0 ? totalWeightedScore : 0;

  const ai_feedback = await generateOverallFeedback(context, rubricGrades);

  return {
    overall_score,
    rubric_scores: rubricGrades,
    ai_feedback,
  };
}
