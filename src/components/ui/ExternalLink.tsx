import React from "react";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface ExternalLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  showIcon?: boolean;
}

/** Lien externe : ouvre le navigateur du téléphone (Android ouvre aussi tel:, sms: et WhatsApp via le système). */
export default function ExternalLink({ href, showIcon = true, className, children, ...rest }: ExternalLinkProps) {
  const isWeb = /^https?:/i.test(href);
  return (
    <a
      href={href}
      {...(isWeb ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn("inline-flex items-center gap-1.5", className)}
      {...rest}
    >
      {children}
      {showIcon && isWeb && <ExternalLinkIcon size={14} className="shrink-0 opacity-60" />}
    </a>
  );
}
