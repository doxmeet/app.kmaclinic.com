import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

const badgeVariants = cva(
	"inline-flex items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3",
	{
		variants: {
			variant: {
				default: "border-transparent bg-brand text-brand-foreground",
				soft: "border-brand-100 bg-brand-50 text-brand",
				secondary: "border-transparent bg-muted text-body",
				outline: "border-line text-body",
				success: "border-success-border bg-success-bg text-success",
				warning: "border-amber-200 bg-warning-bg text-amber-700",
				destructive: "border-red-200 bg-danger-bg text-danger-strong",
			},
			size: {
				default: "px-2 py-0.5 text-xs",
				lg: "rounded-lg px-2.5 py-1 text-[13px]",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	},
);

function Badge({
	className,
	variant,
	size,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return (
		<span
			data-slot="badge"
			className={cn(badgeVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Badge };
