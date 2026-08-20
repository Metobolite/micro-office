"use client";

import { AvatarImage } from "@/components/ui/avatar";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";

type ProfileAvatarImageProps = Omit<
  ComponentProps<typeof AvatarImage>,
  "src" | "onError"
> & {
  customSrc?: string | null;
  providerSrc?: string | null;
};

export function ProfileAvatarImage({
  customSrc,
  providerSrc,
  ...props
}: ProfileAvatarImageProps) {
  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          [customSrc, providerSrc].filter(
            (source): source is string =>
              typeof source === "string" && source.length > 0,
          ),
        ),
      ),
    [customSrc, providerSrc],
  );
  const sourceKey = JSON.stringify(sources);
  const [failureState, setFailureState] = useState({
    sourceKey: "",
    failedSources: [] as string[],
  });
  const failedSources =
    failureState.sourceKey === sourceKey ? failureState.failedSources : [];

  const activeSource = sources.find(
    (source) => !failedSources.includes(source),
  );

  return (
    <AvatarImage
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
