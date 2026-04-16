import { supabase } from './supabase';
import { Profile } from '../types/db';

export const signInWithGoogle = async () => {
  const redirectTo = window.location.origin + window.location.pathname;
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
};

export const signOut = async () => supabase.auth.signOut();

export const getMyProfile = async (): Promise<Profile | null> => {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
};
