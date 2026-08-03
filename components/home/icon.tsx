import {
  Briefcase,
  Building2,
  Clapperboard,
  ClipboardCheck,
  Code2,
  CreditCard,
  Factory,
  FileText,
  Gauge,
  GitBranch,
  GraduationCap,
  HeartPulse,
  Monitor,
  Palette,
  Play,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Workflow,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  Briefcase,
  Building2,
  Clapperboard,
  ClipboardCheck,
  Code2,
  CreditCard,
  Factory,
  FileText,
  Gauge,
  GitBranch,
  GraduationCap,
  HeartPulse,
  Monitor,
  Palette,
  Play,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Workflow,
};

export type IconProps = LucideProps & {
  name: string;
};

export function Icon({ name, size = 20, strokeWidth = 1.5, ...rest }: IconProps) {
  const Comp = icons[name] ?? Sparkles;
  return <Comp size={size} strokeWidth={strokeWidth} aria-hidden {...rest} />;
}
