import {
  Briefcase,
  Building2,
  Clapperboard,
  Code2,
  CreditCard,
  Factory,
  GraduationCap,
  HeartPulse,
  Monitor,
  Palette,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Monitor,
  Smartphone,
  Sparkles,
  TrendingUp,
  Code2,
  Palette,
  Workflow,
  Clapperboard,
  Store,
  HeartPulse,
  CreditCard,
  Truck,
  Building2,
  GraduationCap,
  Factory,
  Briefcase,
};

type ServiceIconProps = {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

/** Maps content `icon` string names to lucide-react icons. */
export function ServiceIcon({
  name,
  size = 20,
  className,
  strokeWidth = 1.75,
}: ServiceIconProps) {
  const Icon = iconMap[name] ?? Monitor;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}
