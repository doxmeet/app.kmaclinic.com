import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/error/payment-failed")({
	component: PaymentFailedPage,
});

function PaymentFailedPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-black/45 px-4 py-10">
			<div className="flex w-full max-w-[400px] flex-col items-center gap-6 rounded-3xl bg-surface p-8 shadow-[0_25px_50px_0_rgba(0,0,0,0.25)]">
				<div className="flex size-16 items-center justify-center rounded-full bg-danger-bg">
					<div className="flex size-10 items-center justify-center rounded-full bg-danger-strong">
						<X className="size-5 text-white" strokeWidth={2.5} />
					</div>
				</div>

				<h1 className="text-2xl font-bold text-ink">정기 결제 실패</h1>

				<p className="text-center text-[17px] leading-7 text-body-soft">
					결제 처리 중 문제가 발생했습니다.
					<br />
					카드 정보를 확인한 뒤 다시 시도해 주세요.
				</p>

				<div className="flex w-full flex-col gap-3">
					<Button variant="brand" size="2xl" className="w-full">
						다시 시도
					</Button>
					<Button variant="neutral-outline" size="2xl" className="w-full">
						창 닫기
					</Button>
				</div>
			</div>
		</div>
	);
}
