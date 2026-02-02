"use client";

import { useEffect, useState } from "react";

interface UseDeepLinkOptions<T> {
  /** The hash prefix to match (e.g., "donor", "entity", "country", "sdg") */
  hashPrefix: string;
  /** The section ID to scroll to */
  sectionId: string;
  /** Transform the hash value (default: identity function) */
  transform?: (value: string) => T;
}

/**
 * Hook for handling deep links with hash-based routing.
 * Parses URL hash, sets pending value, and scrolls to section.
 * 
 * @returns The pending deep link value (or null if none)
 */
export function useDeepLink<T = string>({
  hashPrefix,
  sectionId,
  transform,
}: UseDeepLinkOptions<T>): [T | null, (value: T | null) => void] {
  const [pendingDeepLink, setPendingDeepLink] = useState<T | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const prefix = `#${hashPrefix}=`;
      if (hash.startsWith(prefix)) {
        const rawValue = decodeURIComponent(hash.replace(prefix, ""));
        const value = transform ? transform(rawValue) : (rawValue as unknown as T);
        
        // For number transforms, check if parsing succeeded
        if (value !== null && value !== undefined && !Number.isNaN(value)) {
          setPendingDeepLink(value);
          // Scroll to the section
          setTimeout(() => {
            document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      }
    }
  }, [hashPrefix, sectionId, transform]);

  return [pendingDeepLink, setPendingDeepLink];
}
