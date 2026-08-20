"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function AvatarImage({
  className,
  src,
  alt = "",
  onError,
  ...props
}: React.ComponentProps<"img">) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
  const imageSrc = typeof src === "string" && src ? src : null

  if (!imageSrc || failedSrc === imageSrc) {
    return null
  }

  return (
    // Avatar URLs are user-provided and are not limited to configured Next.js
    // image hosts, so a small native image is the safe generic primitive here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-slot="avatar-image"
      src={imageSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "bg-muted absolute inset-0 z-10 aspect-square size-full object-cover",
        className
      )}
      onError={(event) => {
        setFailedSrc(imageSrc)
        onError?.(event)
      }}
      {...props}
    />
  )
}

export { AvatarImage }
