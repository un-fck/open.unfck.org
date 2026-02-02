"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ShareButtonProps {
  /** The hash to append to the URL (e.g., "donor=USA" or "entity=UNDP") */
  hash: string;
}

export function ShareButton({ hash }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <Tooltip open={copied ? true : undefined} delayDuration={50}>
      <TooltipTrigger asChild>
        <button
          onClick={handleShare}
          className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all duration-200 ease-out hover:bg-gray-400 hover:text-gray-100 focus:bg-gray-400 focus:text-gray-100 focus:outline-none"
          aria-label={copied ? "Link copied!" : "Copy link to clipboard"}
        >
          {copied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="border border-slate-200 bg-white text-slate-800 shadow-lg"
      >
        {copied ? "Link copied!" : "Copy link"}
      </TooltipContent>
    </Tooltip>
  );
}
