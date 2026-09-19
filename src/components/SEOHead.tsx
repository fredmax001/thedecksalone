import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DOMAIN = 'https://decksalone.com';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  noIndex?: boolean;
}

export function formatPageTitle(rawTitle?: string): string {
  if (!rawTitle) return 'Deck Salone';

  const trimmed = rawTitle.trim();

  // If already exactly 'Deck Salone' or home-specific phrases
  if (
    trimmed === 'Deck Salone' ||
    trimmed === "Deck Salone — Sierra Leone's Official DJ Platform" ||
    trimmed === "Deck Salone - Sierra Leone's Official DJ Platform" ||
    trimmed.toLowerCase() === 'home' ||
    trimmed.toLowerCase() === 'home — deck salone' ||
    trimmed.toLowerCase() === 'home - deck salone' ||
    trimmed.toLowerCase() === 'deck salone | home'
  ) {
    return 'Deck Salone';
  }

  // If already formatted like 'Deck Salone | Something'
  if (/^Deck\s+Salone\s*\|\s*/i.test(trimmed)) {
    const section = trimmed.replace(/^Deck\s+Salone\s*\|\s*/i, '').trim();
    return section ? `Deck Salone | ${section}` : 'Deck Salone';
  }

  // Strip trailing platform suffixes like " — Deck Salone", " - Deck Salone", " — The Deck Salone", etc.
  let cleanName = trimmed
    .replace(/\s*[—–|-]\s*(The\s+)?Deck\s+Salone.*$/i, '')
    .replace(/^(The\s+)?Deck\s+Salone\s*[—–|-]\s*/i, '')
    .trim();

  if (!cleanName || cleanName.toLowerCase() === 'home') {
    return 'Deck Salone';
  }

  return `Deck Salone | ${cleanName}`;
}

export default function SEOHead({
  title = 'Deck Salone',
  description = "Discover top DJs, listen to exclusive Sierra Leonean mixes, book DJs for events, and experience live DJ battles on Deck Salone.",
  image = `${DOMAIN}/og-image.jpg?v=5`,
  type = 'website',
  noIndex = false,
}: SEOHeadProps) {
  const location = useLocation();

  useEffect(() => {
    // 1. Calculate clean canonical URL (strip query parameters and trailing slashes)
    let cleanPath = location.pathname;
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    const canonicalUrl = `${DOMAIN}${cleanPath}`;

    // 2. Format Page Title
    const formattedTitle = formatPageTitle(title);
    document.title = formattedTitle;

    // 3. Helper to create or update meta/link elements
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 4. Update Description
    setMetaTag('meta[name="description"]', 'name', 'description', description);

    // 5. Update OpenGraph Tags
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', formattedTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', image);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', type);

    // 6. Update Twitter Cards
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', formattedTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', image);

    // 7. Update NoIndex Robots Tag if requested (e.g. private dashboard routes)
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement('meta');
      robotsTag.setAttribute('name', 'robots');
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute('content', noIndex ? 'noindex, nofollow' : 'index, follow');

    // 8. Update Canonical Link Tag (Fixes Google Search Console duplicate canonical error!)
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

  }, [location.pathname, title, description, image, type, noIndex]);

  return null;
}
