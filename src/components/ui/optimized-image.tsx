import { useState, useMemo, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  fallbackSrc?: string;
  placeholder?: 'blur' | 'skeleton' | 'none';
  loading?: 'eager' | 'lazy';
  fetchpriority?: 'high' | 'low' | 'auto';
  /** Generate srcset for local public images that have responsive variants */
  responsive?: boolean;
  sizes?: string;
  containerClassName?: string;
}

function getResponsiveSet(baseSrc: string, width: number): { srcset?: string; src?: string } {
  if (!baseSrc || baseSrc.startsWith('data:') || baseSrc.startsWith('blob:') || baseSrc.startsWith('http')) {
    return {};
  }
  const isAbsolute = baseSrc.startsWith('/');
  const path = isAbsolute ? baseSrc.slice(1) : baseSrc;
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return {};

  const base = path.slice(0, lastDot);
  const variants = [640, 768, 1024, 1280, 1920];
  const relevant = variants.filter((w) => !width || w <= width * 2 || w === 1920);

  const webpSrcSet = relevant
    .map((w) => `${isAbsolute ? '' : '/'}${base}-${w}.webp ${w}w`)
    .join(', ');

  return {
    srcset: webpSrcSet,
    src: `${isAbsolute ? '' : '/'}${base}-1920.webp`,
  };
}

const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      width,
      height,
      aspectRatio,
      objectFit = 'cover',
      fallbackSrc = '/default-avatar.jpg',
      placeholder = 'skeleton',
      loading = 'lazy',
      fetchpriority = 'auto',
      responsive = false,
      sizes,
      containerClassName,
      className,
      style,
      onError,
      onLoad,
      ...props
    },
    ref
  ) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);

    const { srcset, src: responsiveSrc } = useMemo(
      () => (responsive && width ? getResponsiveSet(src, width) : {}),
      [responsive, src, width]
    );

    const finalSrc = error && fallbackSrc ? fallbackSrc : responsiveSrc || src;

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (!error && fallbackSrc) {
        setError(true);
      }
      onError?.(e);
    };

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoaded(true);
      onLoad?.(e);
    };

    const showSkeleton = placeholder === 'skeleton' && !isLoaded && !error;

    return (
      <div
        className={cn('relative overflow-hidden', containerClassName)}
        style={{
          aspectRatio: aspectRatio || (width && height ? `${width}/${height}` : undefined),
          ...style,
        }}
      >
        {showSkeleton && (
          <Skeleton className="absolute inset-0 z-[1] rounded-none bg-white/5" />
        )}
        <picture className="contents">
          {responsive && srcset && (
            <source
              type="image/webp"
              srcSet={srcset}
              sizes={sizes || (width ? `(max-width: ${width}px) 100vw, ${width}px` : '100vw')}
            />
          )}
          <img
            ref={ref}
            src={finalSrc}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            fetchPriority={fetchpriority}
            decoding="async"
            className={cn(
              'transition-opacity duration-300',
              objectFit === 'cover' && 'object-cover',
              objectFit === 'contain' && 'object-contain',
              objectFit === 'fill' && 'object-fill',
              objectFit === 'none' && 'object-none',
              !isLoaded && placeholder !== 'none' && 'opacity-0',
              isLoaded && 'opacity-100',
              'w-full h-full',
              className
            )}
            onError={handleError}
            onLoad={handleLoad}
            {...props}
          />
        </picture>
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

export { OptimizedImage };
