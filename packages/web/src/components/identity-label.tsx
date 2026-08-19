"use client";

/* Identity providers return arbitrary external avatar URLs. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { shortAddress } from "@/lib/monad-chain";
import { identityLabel, resolveIdentity } from "@/lib/identity";

interface IdentityLabelProps {
  address: string;
  className?: string;
  /** Show tiny avatar when available */
  avatar?: boolean;
  titlePrefix?: string;
}

/** ENS / web3.bio name with hex fallback — never blocks render. */
export function IdentityLabel({
  address,
  className,
  avatar = false,
  titlePrefix,
}: IdentityLabelProps) {
  const [label, setLabel] = useState(shortAddress(address));
  const [src, setSrc] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLabel(shortAddress(address));
    setSrc(null);
    void resolveIdentity(address).then((id) => {
      if (cancelled) return;
      setLabel(identityLabel(id));
      setSrc(id.avatar);
      setPlatform(id.platform);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const tip = [titlePrefix, label, platform, shortAddress(address)]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`} title={tip}>
      {avatar && src && (
        <img
          src={src}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 rounded-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
