"use client";

import { useState } from "react";

type RecipeImageProps = {
  src: string;
  alt: string;
  className?: string;
  detail?: boolean;
};

export function RecipeImage({ src, alt, className = "", detail = false }: RecipeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`image-fallback ${detail ? "image-fallback--detail" : ""} ${className}`} role="img" aria-label={`${alt}图片暂不可用`}>
        <span aria-hidden="true">🍽️</span>
        <small>图片暂不可用</small>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />
  );
}
