import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	CheckCircle2,
	Eye,
	Pencil,
	ShieldCheck,
} from "lucide-react";
import {
	type Agreement,
	AgreementList,
} from "#/components/common/agreement-list.tsx";
import { DataList, DataRow } from "#/components/common/data-list.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import {
	PageActions,
	StickyActionBar,
} from "#/components/layout/action-bar.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";

export const Route = createFileRoute("/hospital/confirm")({
	component: HospitalConfirmPage,
});

const STEPS = [{ label: "병원 정보 입력" }, { label: "프로필 페이지 작성" }];

const DEPARTMENTS = ["소화기내과", "이비인후과", "소아청소년과"];

const NON_COVERED = [
	{ item: "독감 예방접종", detail: "4가 백신", price: "40,000원" },
	{ item: "대상포진 예방접종", detail: "싱그릭스", price: "180,000원" },
	{ item: "건강진단서", detail: "일반 진단서 발급", price: "20,000원" },
	{ item: "영문진단서", detail: "영문 진단서 발급", price: "30,000원" },
	{ item: "채용 신체검사", detail: "일반 채용검진", price: "30,000원" },
];

const AGREEMENTS: Agreement[] = [
	{
		id: "refund",
		label: "환불 · 정기결제 정책에 동의합니다.",
		required: true,
		description: "등록한 카드로 매월 정기적인 자동 결제가 진행됩니다.",
		defaultChecked: true,
	},
	{
		id: "privacy",
		label: "결제 및 정기 결제 등록을 위한 개인정보 수집 · 이용에 동의합니다.",
		required: true,
	},
	{
		id: "marketing",
		label: "마케팅 정보 수집 및 광고성 정보 수신에 동의합니다.",
		required: false,
		description:
			"다양한 이벤트, 프로모션 및 혜택 안내 정보를 받아보실 수 있습니다.",
	},
];

// 액션바 가운데 안내 문구는 정적이라 모듈 스코프로 끌어올려 매 렌더 재생성을 막는다.
const ACTION_BAR_CENTER = (
	<span>
		다른 의사들은 평균 <span className="font-bold text-brand">40개</span> 항목을
		작성했습니다
	</span>
);

function HospitalConfirmPage() {
	return (
		<AppShell
			steps={STEPS}
			current={0}
			userName="김의사"
			bottomBar={
				<StickyActionBar
					left={
						<Button variant="neutral-outline" size="xl">
							<Eye className="size-4" />
							미리보기
						</Button>
					}
					center={ACTION_BAR_CENTER}
					right={
						<Button
							variant="brand"
							size="xl"
							nativeButton={false}
							render={<Link to="/hospital/billing" />}
						>
							결제하기
							<ArrowRight className="size-4" />
						</Button>
					}
				/>
			}
		>
			<div className="flex flex-col gap-6">
				<InfoCallout
					tone="success"
					icon={<CheckCircle2 className="size-5 text-success" />}
				>
					등록 완료 안내가 작성자의 카카오 알림톡으로 자동 발송되었습니다.
				</InfoCallout>

				<header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
							병원 정보 확인
						</h1>
						<p className="text-base text-body-soft sm:text-[17px]">
							등록된 병원 정보와 선택하신 디자인 템플릿 내용을 최종적으로
							확인하세요.
						</p>
					</div>
					<Button variant="neutral-outline" size="xl" className="shrink-0">
						<Pencil className="size-4" />
						전체 수정
					</Button>
				</header>

				{/* 필수 정보 */}
				<SectionCard>
					<SectionTitle variant="info" className="mb-4">
						필수 정보
					</SectionTitle>
					<DataList>
						<DataRow label="병원명">닥스밋 의원</DataRow>
						<DataRow label="주소">
							서울특별시 강남구 테헤란로 000-00, 5층
						</DataRow>
						<DataRow label="연락처">02-1234-5678</DataRow>
						<DataRow label="진료시간">
							평일 09:00 ~ 18:00 (점심 13~14) / 토 09:00 ~ 13:00
						</DataRow>
						<DataRow label="운영 진료과목">
							<div className="flex flex-wrap gap-2">
								{DEPARTMENTS.map((dept) => (
									<Badge key={dept} variant="outline" size="lg">
										{dept}
									</Badge>
								))}
							</div>
						</DataRow>
						<DataRow label="의료진 정보">
							대표원장 김철수 외 2명 소속 완료
						</DataRow>
						<DataRow label="개설 년도">2018년 개설</DataRow>
						<DataRow label="인증 정보">
							<span className="inline-flex items-center gap-2 rounded-lg border border-brand bg-brand-50 px-3 py-1.5 text-base font-bold text-brand">
								<ShieldCheck className="size-4" />
								보건복지부 지정 전문병원
							</span>
						</DataRow>
					</DataList>
				</SectionCard>

				{/* 홈페이지 디자인 & 문구 설정 */}
				<SectionCard>
					<SectionTitle variant="info" className="mb-6">
						홈페이지 디자인 &amp; 문구 설정
					</SectionTitle>
					<div className="flex flex-col gap-8 sm:flex-row sm:items-start">
						<div className="flex flex-1 flex-col gap-4">
							<div className="flex flex-col gap-1">
								<span className="text-sm text-body-soft">테마 문구</span>
								<span className="text-[19px] font-medium text-ink">
									당신의 건강한 내일을 위한 최고의 선택!
								</span>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-sm text-body-soft">키 컬러</span>
								<span className="inline-flex items-center gap-2">
									<span className="size-[18px] rounded-full bg-brand" />
									<span className="text-[17px] font-bold text-brand">
										파랑 (Medical Blue)
									</span>
								</span>
							</div>
						</div>
						<div className="relative flex h-[180px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-line-soft bg-app-bg text-muted-fg sm:w-[340px]">
							<Eye className="size-6" />
							<span className="text-sm">템플릿 미리보기</span>
							<span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded border border-brand bg-surface px-2.5 py-1 text-xs font-bold text-brand">
								<span className="size-1.5 rounded-full bg-brand" />
								적용 완료
							</span>
						</div>
					</div>
				</SectionCard>

				{/* 오시는 길 */}
				<SectionCard>
					<SectionTitle variant="info" className="mb-4">
						오시는 길
					</SectionTitle>
					<DataList>
						<DataRow label="네이버 지도 URL">
							<span className="inline-flex items-center gap-1.5 text-brand">
								네이버 플레이스 지도 공유 링크(URL) 입력 완료
								<CheckCircle2 className="size-4 fill-brand text-surface" />
							</span>
						</DataRow>
						<DataRow label="의료기관 주소">
							서울특별시 강동구 구천면로 200, 2층
						</DataRow>
						<DataRow label="대표 연락처">02-1234-5678</DataRow>
						<DataRow label="지하철 정보">
							5호선 / 천호역 2번 출구 / 도보 5분
						</DataRow>
						<DataRow label="간선버스 번호">130, 341, 370</DataRow>
						<DataRow label="지선버스 번호">3214, 3316, 3411</DataRow>
						<DataRow label="정류장 명칭">천호역 현대백화점</DataRow>
						<DataRow label="주차 안내">
							건물 지하 주차장 이용 가능 (진료 시 2시간 무료)
						</DataRow>
						<DataRow label="만차 시 안내">
							만차 시 인근 공영주차장 이용 부탁드립니다.
						</DataRow>
					</DataList>
				</SectionCard>

				{/* 비급여 정보 */}
				<SectionCard>
					<SectionTitle variant="info" className="mb-6">
						비급여 정보
					</SectionTitle>
					<div className="overflow-hidden rounded-xl border border-line">
						<Table>
							<TableHeader>
								<TableRow className="border-line bg-app-bg hover:bg-app-bg">
									<TableHead className="h-14 w-1/3 px-6 text-base font-normal text-body-soft">
										항목
									</TableHead>
									<TableHead className="h-14 w-1/2 border-l border-line px-6 text-base font-normal text-body-soft">
										내용
									</TableHead>
									<TableHead className="h-14 border-l border-line px-6 text-right text-base font-normal text-body-soft">
										금액
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{NON_COVERED.map((row) => (
									<TableRow key={row.item} className="border-line-soft">
										<TableCell className="h-14 px-6 py-0 text-base text-ink">
											{row.item}
										</TableCell>
										<TableCell className="h-14 border-l border-line-soft px-6 py-0 text-base text-body-soft">
											{row.detail}
										</TableCell>
										<TableCell className="h-14 border-l border-line-soft px-6 py-0 text-right text-base text-ink">
											{row.price}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</SectionCard>

				{/* 결제 및 이용약관 */}
				<SectionCard>
					<SectionTitle variant="info" className="mb-2">
						결제 및 이용약관
					</SectionTitle>
					<AgreementList agreements={AGREEMENTS} />
				</SectionCard>

				<PageActions>
					<Button
						variant="neutral-outline"
						size="cta"
						className="sm:w-44"
						nativeButton={false}
						render={<Link to="/hospital/register" />}
					>
						이전으로
					</Button>
					<Button
						variant="brand"
						size="cta"
						className="sm:w-72"
						nativeButton={false}
						render={<Link to="/hospital/billing" />}
					>
						정보 저장 및 다음 단계
					</Button>
				</PageActions>
			</div>
		</AppShell>
	);
}
