import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

type IconProps = {
  icon: IconSvgElement;
  size?: number;
  className?: string;
};

export function Icon({ icon, size = 20, className }: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color="currentColor"
      strokeWidth={1.5}
      className={className}
    />
  );
}
