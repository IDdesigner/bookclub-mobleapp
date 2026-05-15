import React from 'react'
import { Alert } from 'react-native'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider as PaperProvider } from 'react-native-paper'
import TutorSessionVoiceScreen from '../../app/tutor-session-voice/[sessionId]'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ sessionId: 'test-session-id' }),
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock('../../lib/supabase', () => {
  const makeChain = () => {
    const chain: Record<string, any> = {}
    ;['select', 'update', 'insert', 'eq'].forEach(m => { chain[m] = jest.fn(() => chain) })
    // Terminal methods — order is awaited directly, single/maybeSingle are explicit
    chain['order'] = jest.fn(() => Promise.resolve({ data: [], error: null }))
    chain['single'] = jest.fn(() => Promise.resolve({ data: null, error: null }))
    chain['maybeSingle'] = jest.fn(() => Promise.resolve({ data: null, error: null }))
    return chain
  }
  return { supabase: { from: jest.fn(() => makeChain()) } }
})

jest.mock('../../lib/anthropic', () => ({
  generateTutorResponse: jest.fn(() => Promise.resolve('Test tutor response')),
  shouldMoveToNextRubric: jest.fn(() => false),
}))

jest.mock('../../lib/grading', () => ({
  gradeConversation: jest.fn(() =>
    Promise.resolve({ overall_score: 75, rubric_scores: {}, ai_feedback: 'Good job!' })
  ),
}))

jest.mock('../../lib/openai', () => ({
  transcribeAudio: jest.fn(() => Promise.resolve('test transcription')),
  textToSpeech: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
}))

jest.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({ studentId: 'test-student-id' }),
}))

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Recording: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          recording: {
            stopAndUnloadAsync: jest.fn(() => Promise.resolve()),
            getURI: jest.fn(() => 'file://test.m4a'),
          },
        })
      ),
      RecordingOptionsPresets: { HIGH_QUALITY: {} },
    },
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            playAsync: jest.fn(() => Promise.resolve()),
            unloadAsync: jest.fn(() => Promise.resolve()),
            setOnPlaybackStatusUpdate: jest.fn(),
          },
        })
      ),
    },
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <TutorSessionVoiceScreen />
      </PaperProvider>
    </QueryClientProvider>
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TutorSessionVoiceScreen — End Conversation dialog', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    mockReplace.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('dialog has Back To Test, End Without Grading, and End & Grade buttons', async () => {
    renderScreen()
    fireEvent.press(await screen.findByText('End Conversation'))

    expect(Alert.alert).toHaveBeenCalledWith(
      'End Conversation',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Back To Test' }),
        expect.objectContaining({ text: 'End Without Grading' }),
        expect.objectContaining({ text: 'End & Grade' }),
      ])
    )
  })

  it("'Back To Test' button has cancel style", async () => {
    renderScreen()
    fireEvent.press(await screen.findByText('End Conversation'))

    const buttons: any[] = (Alert.alert as jest.Mock).mock.calls[0][2]
    const btn = buttons.find((b: any) => b.text === 'Back To Test')
    expect(btn.style).toBe('cancel')
  })

  it("'End Without Grading' button has destructive style", async () => {
    renderScreen()
    fireEvent.press(await screen.findByText('End Conversation'))

    const buttons: any[] = (Alert.alert as jest.Mock).mock.calls[0][2]
    const btn = buttons.find((b: any) => b.text === 'End Without Grading')
    expect(btn.style).toBe('destructive')
  })
})
