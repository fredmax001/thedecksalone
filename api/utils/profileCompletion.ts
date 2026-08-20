import { sendEmail } from './email';
import { prisma } from './prisma';


export interface CompletionStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  actionUrl: string;
  actionLabel: string;
}

export interface ProfileCompletionResult {
  percentage: number;
  completedCount: number;
  totalSteps: number;
  isComplete: boolean;
  steps: CompletionStep[];
}

export function calculateProfileCompletion(user: any, djProfile?: any, mixCount: number = 0): ProfileCompletionResult {
  const isDj = user.role === 'DJ' || !!djProfile;

  // Step 1: Profile Photo
  const hasPhoto = !!(user.avatar || djProfile?.avatar);

  // Step 2: Complete Profile Details
  let hasDetails = false;
  if (isDj && djProfile) {
    const hasBio = !!(djProfile.bio && djProfile.bio.trim().length >= 10);
    const hasLocation = !!(djProfile.location || djProfile.city);
    const hasGenres = Array.isArray(djProfile.genres) && djProfile.genres.length > 0;
    const social = djProfile.socialLinks || {};
    const hasSocial = !!(social.instagram || social.facebook || social.twitter || social.youtube || social.mixcloud || social.audiomack || social.soundcloud);
    hasDetails = (hasBio && hasLocation && hasGenres) || (hasBio && hasSocial);
  } else {
    const hasName = !!(user.name || user.username);
    const hasBioOrGender = !!(user.gender || user.dateOfBirth);
    hasDetails = hasName && hasBioOrGender;
  }

  // Step 3: Mix Upload / Content Exploration
  const hasContent = isDj ? mixCount > 0 : true; // regular users complete this step by exploring or defaults true

  // Step 4: Email / Phone Verification
  const isVerified = user.status === 'ACTIVE' || !!user.phoneVerified;

  // Step 5: Share Profile / Referral Link
  const hasShareCode = !!user.referralCode;

  const steps: CompletionStep[] = [
    {
      id: 1,
      title: '1. Add a Profile Photo',
      description: 'Upload a clear photo that represents your DJ brand or profile.',
      completed: hasPhoto,
      actionUrl: isDj ? '/dashboard/settings' : '/user/settings',
      actionLabel: 'Upload Photo',
    },
    {
      id: 2,
      title: '2. Complete Your DJ Profile',
      description: 'Fill in your bio, location, genres, experience, and social media links.',
      completed: hasDetails,
      actionUrl: isDj ? '/dashboard/settings' : '/user/settings',
      actionLabel: 'Edit Profile',
    },
    {
      id: 3,
      title: '3. Upload Your First DJ Mix',
      description: 'Showcase your sound by uploading at least one original DJ mix.',
      completed: hasContent,
      actionUrl: '/dashboard/mixes',
      actionLabel: 'Upload Mix',
    },
    {
      id: 4,
      title: '4. Verify Your Email Address',
      description: 'Confirm your email to secure your account and receive important updates.',
      completed: isVerified,
      actionUrl: isDj ? '/dashboard/settings' : '/user/settings',
      actionLabel: 'Check Status',
    },
    {
      id: 5,
      title: '5. Share Your Profile',
      description: 'Share your Deck Salone profile with your fans and invite them to follow your journey.',
      completed: hasShareCode,
      actionUrl: '/dashboard',
      actionLabel: 'Share Link',
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const percentage = Math.round((completedCount / totalSteps) * 100);

  return {
    percentage,
    completedCount,
    totalSteps,
    isComplete: percentage === 100,
    steps,
  };
}

/**
 * Send automated profile completion nudge email
 */
export async function sendProfileNudgeEmail(user: any, djProfile?: any, mixCount: number = 0) {
  const completion = calculateProfileCompletion(user, djProfile, mixCount);
  const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'https://decksalone.com';
  const name = djProfile?.stageName || user.name || user.username;

  const stepsHtml = completion.steps.map(step => `
    <div style="background:${step.completed ? '#112211' : '#1a1a1a'}; border:1px solid ${step.completed ? '#22c55e44' : '#333'}; border-radius:10px; padding:14px; margin-bottom:10px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="font-weight:700; color:${step.completed ? '#22c55e' : '#f4e059'}; font-size:14px;">
          ${step.completed ? '✅' : '⏳'} ${step.title}
        </span>
        <span style="font-size:11px; padding:2px 8px; border-radius:4px; background:${step.completed ? '#22c55e22' : '#f4e05922'}; color:${step.completed ? '#22c55e' : '#f4e059'};">
          ${step.completed ? 'Completed' : 'Pending'}
        </span>
      </div>
      <p style="color:#aaa; font-size:12px; margin:6px 0 0; line-height:1.4;">${step.description}</p>
    </div>
  `).join('');

  const result = await sendEmail({
    to: user.email,
    subject: `⚡ Welcome to Deck Salone! Complete your profile (${completion.percentage}% Done)`,
    text: `Hi ${name}, welcome to Deck Salone! Your profile is ${completion.percentage}% complete. Log in to complete your remaining steps: ${frontendUrl}/dashboard`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Complete Your Profile</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:30px 15px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid #222;">
        <tr><td style="background:linear-gradient(135deg,#1f1a0a,#0a0a0a);padding:32px;text-align:center;border-bottom:1px solid #333;">
          <h1 style="color:#f4e059;margin:0;font-size:24px;font-weight:800;letter-spacing:1px;">DECK SALONE</h1>
          <p style="color:#888;margin:6px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Sierra Leone's #1 DJ Platform</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="color:#fff;margin:0 0 8px;font-size:20px;font-weight:700;">Welcome, ${name}! 👋</h2>
          <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Complete these 5 simple steps to activate your profile and help fans, promoters, and event organizers discover you.
          </p>

          <!-- Progress Bar -->
          <div style="background:#1a1a1a;border-radius:12px;padding:16px;border:1px solid #2a2a2a;margin-bottom:24px;text-align:center;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="color:#fff;font-weight:700;font-size:13px;">Profile Strength</span>
              <span style="color:#f4e059;font-weight:800;font-size:16px;">${completion.percentage}%</span>
            </div>
            <div style="background:#222;border-radius:6px;height:10px;overflow:hidden;width:100%;">
              <div style="background:linear-gradient(90deg,#f4e059,#ceb100);height:100%;width:${completion.percentage}%;border-radius:6px;"></div>
            </div>
            <p style="color:#888;font-size:11px;margin:8px 0 0;">${completion.completedCount} of ${completion.totalSteps} steps completed</p>
          </div>

          <!-- 5 Steps Checklist -->
          <h3 style="color:#fff;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Your 5 Action Steps</h3>
          ${stepsHtml}

          <div style="text-align:center;margin-top:28px;">
            <a href="${frontendUrl}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#f4e059,#ceb100);color:#000;font-weight:800;font-size:14px;padding:14px 32px;border-radius:30px;text-decoration:none;">
              Complete My Profile Now →
            </a>
          </div>
        </td></tr>
        <tr><td style="background:#0a0a0a;padding:20px;text-align:center;border-top:1px solid #222;">
          <p style="color:#444;margin:0;font-size:11px;">Deck Salone — Freetown, Sierra Leone</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  // Track nudge timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastProfileNudgeSentAt: new Date() },
  }).catch(() => {});

  return result;
}
