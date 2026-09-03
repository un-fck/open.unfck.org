"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SecondaryHeader,
  type SecondaryHeaderLinkProps,
} from "@un-eosg/ui/components/secondary-header";
import type { SectionNavItem } from "@/lib/navigation";

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

function isActive(pathname: string, item: SectionNavItem) {
  if (pathname === item.href) return true;
  return item.aliases?.some((alias) => pathname === alias) ?? false;
}

export function SectionSubnav({
  items,
  label,
}: {
  items: readonly SectionNavItem[];
  label: string;
}) {
  const pathname = normalizePath(usePathname());
  const activeItem = items.find((item) => isActive(pathname, item));

  const renderLink = ({ href, ...props }: SecondaryHeaderLinkProps) => (
    <Link href={href} {...props} />
  );

  return (
    <SecondaryHeader
      items={items}
      label={label}
      activeHref={activeItem?.href}
      renderLink={renderLink}
    />
  );
}
