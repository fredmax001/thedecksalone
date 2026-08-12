const express = require('express');
const router = express.Router();
const axios = require('axios');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function getCache(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { timestamp: Date.now(), data });
}

function getHeaders() {
  return {
    'x-rapidapi-key': process.env.HEARTHIS_RAPIDAPI_KEY,
    'x-rapidapi-host': process.env.HEARTHIS_RAPIDAPI_HOST || 'hearthis-at.p.rapidapi.com',
    'Content-Type': 'application/json'
  };
}

router.get('/:username/mixes', async (req, res) => {
  try {
    const { username } = req.params;
    const count = req.query.count || 20;
    const page = req.query.page || 1;
    
    const cacheKey = `mixes:${username}:${count}:${page}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://hearthis-at.p.rapidapi.com/${username}/features/?count=${count}&page=${page}`, {
      headers: getHeaders()
    });

    const data = response.data.map((track) => ({
      id: track.id,
      title: track.title,
      uri: track.uri,
      permalink_url: track.permalink_url,
      artwork_url: track.artwork_url,
      stream_url: track.stream_url,
      duration: track.duration,
      playback_count: track.playback_count,
      favoritings_count: track.favoritings_count,
      comment_count: track.comment_count,
      user: {
        username: track.user?.username,
        avatar_url: track.user?.avatar_url
      }
    }));

    const result = { success: true, data, meta: { count: data.length, username } };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('HearThis mixes error:', error.message);
    res.status(502).json({ success: false, error: 'HearThis API error', details: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter q is required' });
    }
    
    const count = req.query.count || 20;
    const page = req.query.page || 1;
    
    const cacheKey = `search:${q}:${count}:${page}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://hearthis-at.p.rapidapi.com/search/?t=${q}&count=${count}&page=${page}&type=tracks`, {
      headers: getHeaders()
    });

    const data = response.data;
    const result = { success: true, data };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('HearThis search error:', error.message);
    res.status(502).json({ success: false, error: 'HearThis API error', details: error.message });
  }
});

router.get('/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;
    
    const cacheKey = `stats:${username}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://hearthis-at.p.rapidapi.com/${username}/`, {
      headers: getHeaders()
    });

    const user = response.data;
    const data = {
      username: user.username,
      display_name: user.username,
      avatar_url: user.avatar_url,
      follower_count: user.followers_count || 0, // HearThis sometimes uses followers_count instead of follower_count
      followings_count: user.following_count || 0,
      track_count: user.track_count || 0,
      city: user.city || ''
    };

    const result = { success: true, data };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('HearThis stats error:', error.message);
    res.status(502).json({ success: false, error: 'HearThis API error', details: error.message });
  }
});

module.exports = router;
