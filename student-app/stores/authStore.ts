import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  studentId: string | null;
  studentName: string | null;
  classId: string | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signUpAndJoinClass: (email: string, password: string, name: string, inviteCode: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  studentId: null,
  studentName: null,
  classId: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Fetch student profile linked to this auth user
        const { data: student, error } = await supabase
          .from('students')
          .select('id, name')
          .eq('auth_user_id', session.user.id)
          .single();

        if (!error && student) {
          // Get student's class
          const { data: enrollment } = await supabase
            .from('class_students')
            .select('class_id')
            .eq('student_id', student.id)
            .single();

          set({
            session,
            studentId: student.id,
            studentName: student.name,
            classId: enrollment?.class_id || null,
            isLoading: false,
          });
        } else {
          set({ session, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          // Fetch student profile
          const { data: student } = await supabase
            .from('students')
            .select('id, name')
            .eq('auth_user_id', session.user.id)
            .single();

          if (student) {
            const { data: enrollment } = await supabase
              .from('class_students')
              .select('class_id')
              .eq('student_id', student.id)
              .single();

            set({
              session,
              studentId: student.id,
              studentName: student.name,
              classId: enrollment?.class_id || null,
            });
          }
        } else {
          set({
            session: null,
            studentId: null,
            studentName: null,
            classId: null,
          });
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },

  signUpAndJoinClass: async (email: string, password: string, name: string, inviteCode: string) => {
    try {
      set({ isLoading: true, error: null });

      // Validate invite code first
      const codeWithDash = inviteCode.toUpperCase();
      const codeWithoutDash = inviteCode.replace(/-/g, '').toUpperCase();

      let { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('invite_code', codeWithoutDash)
        .single();

      if (classError || !classData) {
        const result = await supabase
          .from('classes')
          .select('id')
          .eq('invite_code', codeWithDash)
          .single();

        classData = result.data;
        classError = result.error;
      }

      if (classError || !classData) {
        throw new Error('Invalid invite code. Please check and try again.');
      }

      console.log('Found class:', classData.id);

      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            class_id: classData.id,
          },
        },
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw new Error('Failed to create account: ' + signUpError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create account.');
      }

      console.log('User created:', authData.user.id);

      // The database trigger will automatically create the student profile
      // Wait a moment for it to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch the created student profile
      const { data: student } = await supabase
        .from('students')
        .select('id, name')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (student) {
        const { data: enrollment } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', student.id)
          .single();

        set({
          session: authData.session,
          studentId: student.id,
          studentName: student.name,
          classId: enrollment?.class_id || null,
          isLoading: false,
          error: null,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.message || 'An error occurred during signup.',
        isLoading: false,
      });
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (error) {
        throw new Error('Invalid email or password.');
      }

      if (!data.user) {
        throw new Error('Login failed.');
      }

      // Fetch student profile
      const { data: student } = await supabase
        .from('students')
        .select('id, name')
        .eq('auth_user_id', data.user.id)
        .single();

      if (student) {
        const { data: enrollment } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', student.id)
          .single();

        set({
          session: data.session,
          studentId: student.id,
          studentName: student.name,
          classId: enrollment?.class_id || null,
          isLoading: false,
        });
      } else {
        set({ session: data.session, isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.message || 'An error occurred during login.',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({
        session: null,
        studentId: null,
        studentName: null,
        classId: null,
        error: null,
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },
}));

// Initialize auth state on app start
useAuthStore.getState().initialize();
