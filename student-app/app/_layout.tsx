import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <Stack
          screenOptions={{
            headerShown: true,
            gestureEnabled: true,
            animation: 'default',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="assignment/[id]"
            options={{
              headerShown: true,
              title: 'Assignment Details',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="tutor-session/[sessionId]"
            options={{
              headerShown: true,
              title: 'Tutor Session',
              presentation: 'card',
            }}
          />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
