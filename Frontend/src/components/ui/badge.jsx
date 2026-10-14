import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#111827] text-white hover:bg-[#1f2937]",
        secondary:
          "border-[#E5E7EB] bg-[#F7F8FA] text-[#172033] hover:bg-[#EEF2F6]",
        destructive:
          "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        outline:
          "border-[#E5E7EB] text-[#667085] bg-transparent",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        warning:
          "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
        accent:
          "border-indigo-100 bg-indigo-50 text-[#6558D9] hover:bg-indigo-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
