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

export default function SEOHead({
  title = "Deck Salone — Sierra Leone's Official DJ Platform",
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

    // 2. Set Document Title
    document.title = title;

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
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', image);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', type);

    // 6. Update Twitter Cards
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
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
