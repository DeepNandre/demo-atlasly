import { useEffect, useRef } from "react";

interface DemoVideoProps {
  src: string;
  poster: string;
  caption: string;
  className?: string;
}

const DemoVideo = ({ src, poster, caption, className = "" }: DemoVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      video.pause();
    } else {
      video.play().catch(() => {
        // Autoplay blocked, video will show poster
      });
    }
  }, []);

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        poster={poster}
        className="w-full h-auto"
        aria-label={caption}
      >
        <source src={src} type="video/mp4" />
        <img src={poster} alt={caption} className="w-full h-auto" />
      </video>
      <div className="sr-only">{caption}</div>
    </div>
  );
};

export default DemoVideo;