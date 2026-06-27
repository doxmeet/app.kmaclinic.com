import { Fragment } from "react";
import { cn } from "#/lib/utils.ts";

export type Step = { label: string };

/**
 * Stepper — 상단 진행 단계 표시 (병원 정보 입력 → 프로필 작성 등).
 * 활성/완료 단계는 파란 원, 이후 단계는 회색 원.
 */
function Stepper({
	steps,
	current,
	className,
}: {
	steps: Step[];
	/** 0-based 현재 단계 */
	current: number;
	className?: string;
}) {
	return (
		<ol className={cn("flex items-center gap-2 sm:gap-3", className)}>
			{steps.map((step, i) => {
				const state = i < current ? "done" : i === current ? "active" : "todo";
				return (
					<Fragment key={step.label}>
						{i > 0 ? (
							<li
								aria-hidden
								className="h-px w-5 shrink-0 bg-line-strong sm:w-8"
							/>
						) : null}
						<li className="flex items-center gap-2">
							<span
								className={cn(
									"flex size-6 items-center justify-center rounded-full text-xs font-semibold",
									state === "todo"
										? "bg-muted text-muted-fg"
										: "bg-brand text-brand-foreground",
								)}
							>
								{i + 1}
							</span>
							<span
								className={cn(
									"hidden text-sm font-medium sm:inline",
									state === "todo" ? "text-muted-fg" : "text-ink",
								)}
							>
								{step.label}
							</span>
						</li>
					</Fragment>
				);
			})}
		</ol>
	);
}

export { Stepper };
