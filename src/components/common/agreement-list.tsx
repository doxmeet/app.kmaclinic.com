import { useState } from "react";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import { cn } from "#/lib/utils.ts";

/**
 * AgreementList / AgreementItem — 약관 동의 체크박스 행 묶음.
 * 각 행: [체크박스] 라벨 [필수]/[선택] ... [바로가기].
 * 결제/이용약관 동의(병원 정보 확인) 등에서 재사용.
 */
export type Agreement = {
	id: string;
	/** 동의 문구 */
	label: string;
	/** 필수 여부 → [필수]/[선택] 배지 */
	required?: boolean;
	/** 라벨 아래 보조 설명 */
	description?: string;
	/** 기본 체크 여부 */
	defaultChecked?: boolean;
};

function AgreementRow({
	agreement,
	checked,
	onCheckedChange,
}: {
	agreement: Agreement;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-start gap-3 py-4">
			<Checkbox
				id={`agreement-${agreement.id}`}
				checked={checked}
				onCheckedChange={onCheckedChange}
				className="mt-0.5"
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex flex-wrap items-center gap-2">
					<label
						htmlFor={`agreement-${agreement.id}`}
						className="cursor-pointer text-base text-ink"
					>
						{agreement.label}
					</label>
					<span
						className={cn(
							"text-sm font-medium",
							agreement.required ? "text-brand" : "text-body-soft",
						)}
					>
						{agreement.required ? "[필수]" : "[선택]"}
					</span>
				</div>
				{agreement.description ? (
					<p className="text-sm text-body-soft">{agreement.description}</p>
				) : null}
			</div>
			<button
				type="button"
				className="shrink-0 rounded-md bg-brand-50 px-3 py-1.5 text-sm text-brand transition-colors hover:bg-brand-100"
			>
				바로가기
			</button>
		</div>
	);
}

function AgreementList({
	agreements,
	className,
}: {
	agreements: Agreement[];
	className?: string;
}) {
	const [checked, setChecked] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(
			agreements.map((a) => [a.id, Boolean(a.defaultChecked)]),
		),
	);

	return (
		<div className={cn("divide-y divide-line-soft", className)}>
			{agreements.map((agreement) => (
				<AgreementRow
					key={agreement.id}
					agreement={agreement}
					checked={checked[agreement.id] ?? false}
					onCheckedChange={(value) =>
						setChecked((prev) => ({ ...prev, [agreement.id]: value }))
					}
				/>
			))}
		</div>
	);
}

export { AgreementList, AgreementRow };
