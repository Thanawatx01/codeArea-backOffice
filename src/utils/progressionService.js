const { from, TABLE_NAMES } = require('../models/index');

/**
 * ProgressionService handles the logic for user streaks, skills, and achievements.
 */
class ProgressionService {
  /**
   * Main entry point called after a successful submission (ACCEPTED).
   */
  async handleProgressionUpdate(userId, questionId, submissionId) {
    try {
      console.log(`[ProgressionService] Updating progression for user ${userId} on question ${questionId}`);
      
      // 1. Update Streak
      await this.updateStreak(userId);
      
      // 2. Update Skill Scores
      await this.updateSkills(userId, questionId);
      
      // 3. Check and Award Achievements
      await this.checkAchievements(userId);
      
    } catch (err) {
      console.error('[ProgressionService] Update failed:', err);
    }
  }

  /**
   * Updates the user's streak based on daily activity.
   */
  async updateStreak(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: streak, error } = await from(TABLE_NAMES.USER_STREAKS)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!streak) {
      // First time activity
      await from(TABLE_NAMES.USER_STREAKS).insert({
        user_id: userId,
        current_streak: 1,
        max_streak: 1,
        last_activity_date: today,
        activity_history: [true]
      });
      return;
    }

    const lastDate = streak.last_activity_date;
    if (lastDate === today) {
      // Already active today, nothing to update
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newCurrentStreak = 1;
    if (lastDate === yesterdayStr) {
      // Continued streak
      newCurrentStreak = streak.current_streak + 1;
    }

    const newMaxStreak = Math.max(streak.max_streak, newCurrentStreak);
    
    // Update history (keep last 7 days for simplicity in this example)
    const newHistory = [...(streak.activity_history || []), true].slice(-7);

    await from(TABLE_NAMES.USER_STREAKS)
      .update({
        current_streak: newCurrentStreak,
        max_streak: newMaxStreak,
        last_activity_date: today,
        activity_history: newHistory
      })
      .eq('user_id', userId);
  }

  /**
   * Updates user skills based on the question's category.
   */
  async updateSkills(userId, questionId) {
    const { data: question } = await from(TABLE_NAMES.QUESTIONS)
      .select('category_id, points, question_categories(name)')
      .eq('id', questionId)
      .single();

    if (!question) return;

    const categoryName = question.question_categories?.name?.toLowerCase() || '';
    const points = question.points || 10;

    const { data: skills } = await from(TABLE_NAMES.USER_SKILLS)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const patch = {
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    if (categoryName.includes('frontend')) patch.frontend = (skills?.frontend || 0) + points;
    else if (categoryName.includes('backend')) patch.backend = (skills?.backend || 0) + points;
    else if (categoryName.includes('algorithm')) patch.algorithms = (skills?.algorithms || 0) + points;
    else if (categoryName.includes('devops')) patch.devops = (skills?.devops || 0) + points;
    else {
      // Default to algorithms if unknown
      patch.algorithms = (skills?.algorithms || 0) + points;
    }

    if (!skills) {
      await from(TABLE_NAMES.USER_SKILLS).insert(patch);
    } else {
      await from(TABLE_NAMES.USER_SKILLS).update(patch).eq('user_id', userId);
    }
  }

  /**
   * Checks if user qualifies for any new achievements.
   */
  async checkAchievements(userId) {
    // 1. Fetch earned achievements
    const { data: earned } = await from(TABLE_NAMES.USER_ACHIEVEMENTS)
      .select('achievement_id')
      .eq('user_id', userId);
    const earnedIds = new Set(earned?.map(e => e.achievement_id) || []);

    // 2. Fetch all achievements
    const { data: allAchievements } = await from(TABLE_NAMES.ACHIEVEMENTS).select('*');

    // 3. Fetch user stats for criteria checking
    const { data: subs } = await from(TABLE_NAMES.SUBMISSIONS)
      .select('id, language, created_at')
      .eq('user_id', userId)
      .eq('status', 1); // ACCEPTED
    
    const { data: streak } = await from(TABLE_NAMES.USER_STREAKS).select('*').eq('user_id', userId).maybeSingle();

    const solveCount = subs?.length || 0;
    const langCount = new Set(subs?.map(s => s.language) || []).size;
    const currentStreak = streak?.current_streak || 0;

    for (const ach of allAchievements || []) {
      if (earnedIds.has(ach.id)) continue;

      let qualified = false;
      switch (ach.criteria_type) {
        case 'solve_count':
          if (solveCount >= ach.criteria_value) qualified = true;
          break;
        case 'language_count':
          if (langCount >= ach.criteria_value) qualified = true;
          break;
        case 'streak_count':
          if (currentStreak >= ach.criteria_value) qualified = true;
          break;
        case 'night_solve':
          // Check if any sub was between 12 AM and 5 AM
          qualified = subs?.some(s => {
            const hour = new Date(s.created_at).getHours();
            return hour >= 0 && hour < 5;
          });
          break;
      }

      if (qualified) {
        await from(TABLE_NAMES.USER_ACHIEVEMENTS).insert({
          user_id: userId,
          achievement_id: ach.id
        });
      }
    }
  }
}

module.exports = new ProgressionService();
