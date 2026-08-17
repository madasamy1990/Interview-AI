const { supabaseAdmin } = require('../services/supabase');

const checkCredits = (cost) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('credits_remaining, plan')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return res.status(500).json({ error: 'Internal Server Error', message: 'Could not fetch user profile' });
      }

      const { credits_remaining, plan } = profile;

      if (credits_remaining < cost) {
        return res.status(402).json({ 
          error: 'insufficient_credits', 
          message: `Not enough credits. You have ${credits_remaining} but need ${cost}.` 
        });
      }

      req.creditCost = cost;
      req.userProfile = profile;
      next();
    } catch (error) {
      console.error('Credits middleware error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};

module.exports = checkCredits;
