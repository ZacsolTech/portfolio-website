import type { Testimonial } from "./types";

export const testimonials: Testimonial[] = [
  {
    quote:
      "The AI agent handles two-thirds of what used to reach a person, and it escalates the rest with the context already attached.",
    metric: "68%",
    metricLabel: "Support tickets deflected",
    name: "A. Thammawong",
    role: "COO",
    company: "Meridian Retail",
    initials: "AT",
  },
  {
    quote:
      "Three hundred technicians moved off paper in fourteen weeks. Nothing broke, and nobody needed a training week.",
    metric: "41%",
    metricLabel: "Faster dispatch",
    name: "P. Worrapong",
    role: "Head of Ops",
    company: "Halcyon Logistics",
    initials: "PW",
  },
  {
    quote:
      "We used to lose orders in the chat scroll every single day. Since launch, not one.",
    metric: "0",
    metricLabel: "Orders lost in six months",
    name: "P. Manalappan",
    role: "Founder",
    company: "Verdant Supply",
    initials: "PM",
  },
];
