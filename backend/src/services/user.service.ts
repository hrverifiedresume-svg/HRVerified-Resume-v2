import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

export const userService = {
  async getUserById(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  },

  async updateUserProfile(userId: string, updates: any) {
    const { data: userUpdate, error: userError } = await supabase
      .from('users')
      .update({
        name: updates.name,
        profile_photo_url: updates.profile_photo_url,
        headline: updates.headline,
        bio: updates.bio,
        university_id: updates.university_id,
      })
      .eq('id', userId)
      .select()
      .single();

    if (userError) throw userError;
    return userUpdate;
  }
};
