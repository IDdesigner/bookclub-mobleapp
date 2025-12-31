import * as FileSystem from 'expo-file-system/legacy';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('Warning: EXPO_PUBLIC_OPENAI_API_KEY is not set');
}

/**
 * Transcribe audio to text using OpenAI Whisper
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    // Create form data for the audio file
    const formData = new FormData();

    // Read the audio file and prepare it for upload
    const audioData = {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    };

    formData.append('file', audioData as any);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${error}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

/**
 * Convert text to speech using OpenAI TTS
 * Returns a local file URI for the audio
 */
export async function textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice,
        input: text,
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS API error: ${error}`);
    }

    // Get the audio data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64data = btoa(binary);

    // Save to a temporary file
    const filename = `tts-${Date.now()}.mp3`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, base64data, {
      encoding: 'base64',
    });

    return fileUri;
  } catch (error) {
    console.error('Error converting text to speech:', error);
    throw error;
  }
}
