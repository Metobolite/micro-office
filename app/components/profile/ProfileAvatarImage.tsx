"use client";

import { AvatarImage } from "@/components/ui/avatar";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";

const EMPTY_FALLBACK_SRCS: ReadonlyArray<string | null | undefined> = [];

type ProfileAvatarImageProps = Omit<
  ComponentProps<typeof AvatarImage>,
  "src" | "onError"
> & {
  customSrc?: string | null;
  providerSrc?: string | null;
  fallbackSrcs?: ReadonlyArray<string | null | undefined>;
};

export function ProfileAvatarImage({
  customSrc,
  providerSrc,
  fallbackSrcs = EMPTY_FALLBACK_SRCS,
  ...props
}: ProfileAvatarImageProps) {
  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          [customSrc, ...fallbackSrcs, providerSrc].flatMap((source) => {
            if (typeof source !== "string") return [];

            const normalizedSource = source.trim();
            return normalizedSource ? [normalizedSource] : [];
          }),
        ),
      ),
    [customSrc, fallbackSrcs, providerSrc],
  );
  const sourceKey = JSON.stringify(sources);
  const [failureState, setFailureState] = useState({
    sourceKey: "",
    failedSources: [] as string[],
  });
  const failedSources =
    failureState.sourceKey === sourceKey ? failureState.failedSources : [];

  useEffect(() => {
    setFailureState((currentState) =>
      currentState.sourceKey === sourceKey
        ? currentState
        : { sourceKey, failedSources: [] },
    );
  }, [sourceKey]);

  const activeSource = sources.find(
    (source) => !failedSources.includes(source),
  );

  return (
    <AvatarImage
      key={`${sourceKey}:${activeSource ?? "fallback"}`}
      {...props}
      src={activeSource}
      onError={() => {
        if (!activeSource) return;

        setFailureState((currentState) => {
          const currentSources =
            currentState.sourceKey === sourceKey
              ? currentState.failedSources
              : [];

          return {
            sourceKey,
            failedSources: currentSources.includes(activeSource)
              ? currentSources
              : [...currentSources, activeSource],
          };
        });
      }}
    />
  );
}
