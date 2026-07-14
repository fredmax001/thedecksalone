import { useEffect } from 'react';

export function usePageMeta(title: string, description: string, image?: string, url?: string) {
  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, attr: string, value?: string) => {
      if (!value) return;
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    const setProp = (prop: string, value?: string) => {
      setMeta(`meta[property="${prop}"]`, 'property', prop);
      setMeta(`meta[property="${prop}"]`, 'content', value);
    };

    setMeta('meta[name="description"]', 'name', description);
    setProp('og:title', title);
    setProp('og:description', description);
    setProp('og:image', image);
    setProp('og:url', url);
    setMeta('meta[name="twitter:title"]', 'name', title);
    setMeta('meta[name="twitter:description"]', 'name', description);
    setMeta('meta[name="twitter:image"]', 'name', image);
  }, [title, description, image, url]);
}
