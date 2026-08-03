import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export type FieldProps = {
  label?: ReactNode;
  className?: string;
  children: ReactNode;
  htmlFor?: string;
};

export function Field({ label, className, children, htmlFor }: FieldProps) {
  return (
    <label className={cn("field", className)} htmlFor={htmlFor}>
      {label != null && <span className="field__label">{label}</span>}
      {children}
    </label>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return <input className={cn("input", className)} {...rest} />;
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea className={cn("textarea", className)} {...rest} />;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
};

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select className={cn("select", className)} {...rest}>
      {children}
    </select>
  );
}
