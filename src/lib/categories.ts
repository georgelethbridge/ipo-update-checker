import { supabase } from './supabase';
import { Category } from '../types/db';

export const getActiveCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,description,sort_order,active')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
};
