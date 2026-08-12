const axios = require('axios');

async function getHearThisMetrics(hearthisUsername) {
  if (!hearthisUsername) return null;
  try {
    // Extract username if URL
    let username = hearthisUsername;
    if (username.includes('hearthis.at/')) {
      const parts = username.split('hearthis.at/');
      if (parts.length > 1) {
        username = parts[1].split('/')[0];
      }
    }

    const headers = {
      'x-rapidapi-key': process.env.HEARTHIS_RAPIDAPI_KEY,
      'x-rapidapi-host': process.env.HEARTHIS_RAPIDAPI_HOST || 'hearthis-at.p.rapidapi.com',
      'Content-Type': 'application/json'
    };

    // Parallel fetch profile + features (latest tracks)
    const [profileRes, featuresRes] = await Promise.all([
      axios.get(`https://hearthis-at.p.rapidapi.com/${username}/`, { headers }).catch(() => null),
      axios.get(`https://hearthis-at.p.rapidapi.com/${username}/features/?count=100`, { headers }).catch(() => null)
    ]);

    const profile = profileRes?.data;
    const features = featuresRes?.data || [];

    if (!profile) return null;

    let totalPlays = 0;
    features.forEach(track => {
      totalPlays += (track.playback_count || 0);
    });

    return {
      platform: 'hearthis',
      followers: profile.followers_count || 0,
      plays: totalPlays,
      tracks: profile.track_count || features.length || 0,
      username
    };
  } catch (e) {
    console.error('HearThis metrics error', e.message);
    return null;
  }
}

async function getSoundCloudMetrics(soundcloudUrl) {
  if (!soundcloudUrl) return null;
  try {
    // We use oEmbed for basic info since actual API requires client ID which isn't easy to get
    const res = await axios.get(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(soundcloudUrl)}`);
    return {
      platform: 'soundcloud',
      title: res.data.title,
      thumbnail_url: res.data.thumbnail_url,
      author_name: res.data.author_name
    };
  } catch (e) {
    // Ignore errors for soundcloud fetching (usually 404 or unsupported url)
    return null;
  }
}

async function getMixCloudMetrics(mixcloudUsername) {
  if (!mixcloudUsername) return null;
  try {
    let username = mixcloudUsername;
    if (username.includes('mixcloud.com/')) {
      const parts = username.split('mixcloud.com/');
      if (parts.length > 1) {
        username = parts[1].split('/')[0];
      }
    }

    const res = await axios.get(`https://api.mixcloud.com/${username}/`);
    return {
      platform: 'mixcloud',
      followers: res.data.follower_count || 0,
      plays: res.data.listen_count || 0,
      username
    };
  } catch (e) {
    return null;
  }
}

async function aggregateMetrics(dj) {
  const streamingLinks = dj.streamingLinks || {};
  
  const [hearthis, soundcloud, mixcloud] = await Promise.all([
    getHearThisMetrics(streamingLinks.hearthis),
    getSoundCloudMetrics(streamingLinks.soundcloud),
    getMixCloudMetrics(streamingLinks.mixcloud)
  ]);

  let totalReach = 0;
  let totalPlays = 0;

  if (hearthis) {
    totalReach += hearthis.followers;
    totalPlays += hearthis.plays;
  }
  
  if (mixcloud) {
    totalReach += mixcloud.followers;
    totalPlays += mixcloud.plays;
  }

  return {
    hearthis,
    soundcloud,
    mixcloud,
    totalReach,
    totalPlays
  };
}

module.exports = {
  getHearThisMetrics,
  getSoundCloudMetrics,
  getMixCloudMetrics,
  aggregateMetrics
};
