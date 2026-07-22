import { amountForCycle, firstAmountForCycle } from "#/lib/api/billing.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 결제 일정 안내 — 가입 결제 화면(commit-complete)에서 연간/월간 청구 흐름을 보여준다.
 * 디자이너 시안(2026-07 SVG)을 인라인 SVG로 재작성한 것.
 * - sm 이상: 가로 타임라인(주기 알약은 표 위, 타임라인이 전체 폭 사용)
 * - sm 미만: 세로 타임라인 — 시안의 모든 요소(점·연결선·₩ 반복·화살표)를 그대로 옮김
 * 두 버전 모두 viewBox 비율로 축소되므로 가로 스크롤이 생기지 않는다.
 * 색상은 다크모드 대응을 위해 디자인 토큰(CSS 변수), 금액은 billing.ts 단일 출처.
 */

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

type Tone = "brand" | "success";

type CycleSpec = {
	tone: Tone;
	pill: string;
	recommended?: boolean;
	/** 첫 결제 마커 보조 문구(금액). */
	firstText: string;
	/** 갱신 마커 보조 문구(금액). */
	renewText: string;
	/** 가운데 구간 라벨(연간). 없으면 월간식(짙은 구간 + 점선 위 ₩ 반복). */
	midSegLabel?: string;
};

const toneColor = (tone: Tone) =>
	tone === "brand" ? "var(--brand)" : "var(--success)";
const tonePillBg = (tone: Tone) =>
	tone === "brand" ? "var(--brand-50)" : "var(--success-bg)";

/** 레이아웃별(가로/세로) 크기 세트. 가로(PC)는 시안보다 전반적으로 키운 값. */
type Sizes = {
	/** 마커 반지름 */
	r: number;
	/** ₩ 폰트 */
	won: number;
	title: number;
	sub: number;
	seg: number;
	pill: { w: number; h: number; font: number };
	/** 추천 폰트 */
	badge: number;
	/** 선 위 점 반지름 */
	dot: number;
	/** 선 굵기 */
	stroke: number;
};

const H_SIZES: Sizes = {
	r: 13,
	won: 15,
	title: 15.5,
	sub: 14,
	seg: 13,
	pill: { w: 80, h: 26, font: 14 },
	badge: 12,
	dot: 4.5,
	stroke: 1.8,
};

const V_SIZES: Sizes = {
	r: 11.2,
	won: 13,
	title: 13.5,
	sub: 12.75,
	seg: 11.6,
	pill: { w: 69, h: 24, font: 12.9 },
	badge: 10.5,
	dot: 4,
	stroke: 1.5,
};

const titleProps = (sz: Sizes) =>
	({ fontSize: sz.title, fontWeight: 700, fill: "var(--ink)" }) as const;
const subProps = (sz: Sizes) =>
	({ fontSize: sz.sub, fill: "var(--muted-fg)" }) as const;
const segProps = (sz: Sizes) =>
	({ fontSize: sz.seg, fontWeight: 700, fill: "var(--ink)" }) as const;

/** 카드 등록 마커 안의 카드 아이콘(시안의 rect+line). k=마커 배율. */
function CardGlyph({ cx, cy, k = 1 }: { cx: number; cy: number; k?: number }) {
	return (
		<g stroke="#fff" strokeWidth={1.2 * k} fill="none">
			<rect
				x={cx - 7 * k}
				y={cy - 4.7 * k}
				width={14 * k}
				height={9.4 * k}
				rx={1.4 * k}
			/>
			<line
				x1={cx - 7 * k}
				y1={cy - 1.9 * k}
				x2={cx + 7 * k}
				y2={cy - 1.9 * k}
			/>
		</g>
	);
}

/** 원형 마커 — card=카드 등록(주기색), first=첫 결제(짙은 ₩), renew=갱신(주기색 ₩). */
function MarkerCircle({
	cx,
	cy,
	kind,
	tone,
	sz,
}: {
	cx: number;
	cy: number;
	kind: "card" | "first" | "renew";
	tone: Tone;
	sz: Sizes;
}) {
	const c = toneColor(tone);
	if (kind === "card") {
		return (
			<g>
				<circle cx={cx} cy={cy} r={sz.r} fill={c} />
				<CardGlyph cx={cx} cy={cy} k={sz.r / 11.2} />
			</g>
		);
	}
	return (
		<g>
			<circle
				cx={cx}
				cy={cy}
				r={sz.r}
				fill={kind === "first" ? "var(--ink)" : c}
			/>
			<text
				x={cx}
				y={cy + sz.won * 0.36}
				textAnchor="middle"
				fontSize={sz.won}
				fontWeight={700}
				fill={kind === "first" ? "var(--surface)" : "#fff"}
			>
				₩
			</text>
		</g>
	);
}

/** 점선 구간의 반복 결제 마커(₩ 아웃라인). */
function GhostWon({
	cx,
	cy,
	tone,
	sz,
}: {
	cx: number;
	cy: number;
	tone: Tone;
	sz: Sizes;
}) {
	return (
		<g>
			<circle
				cx={cx}
				cy={cy}
				r={sz.r}
				fill="var(--surface)"
				stroke={toneColor(tone)}
				strokeWidth={1.6}
			/>
			<text
				x={cx}
				y={cy + sz.won * 0.36}
				textAnchor="middle"
				fontSize={sz.won}
				fontWeight={700}
				fill="var(--ink)"
			>
				₩
			</text>
		</g>
	);
}

/** 주기 알약 + (연간) 추천 라벨. 로컬 좌표 (0,0) 기준. */
function PillGroup({ spec, sz }: { spec: CycleSpec; sz: Sizes }) {
	const { w, h, font } = sz.pill;
	return (
		<g>
			<rect
				x={0}
				y={0}
				width={w}
				height={h}
				rx={h / 2}
				fill={tonePillBg(spec.tone)}
			/>
			<text
				x={w / 2}
				y={h / 2 + font * 0.36}
				textAnchor="middle"
				fontSize={font}
				fontWeight={700}
				fill={toneColor(spec.tone)}
			>
				{spec.pill}
			</text>
			{spec.recommended ? (
				<text
					x={w + 8}
					y={h / 2 + sz.badge * 0.36}
					fontSize={sz.badge}
					fontWeight={700}
					fill="var(--danger)"
				>
					추천
				</text>
			) : null}
		</g>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 가로 타임라인 (sm 이상) — 알약은 표 위, 타임라인이 전체 폭을 쓴다
// ─────────────────────────────────────────────────────────────────────

// 가로 좌표(viewBox 폭 720). 마커 x, 라벨 x, 화살표/₩ 반복 위치.
const HX = {
	n1: 14,
	n2: 182,
	n3: 540,
	arrow: 704,
	ghosts: [305, 364, 423],
	nodeY: 50,
	lineY: 98,
	labelGap: 24,
	rowGap: 150,
	height: 266,
};

function HRow({ spec }: { spec: CycleSpec }) {
	const sz = H_SIZES;
	const c = toneColor(spec.tone);
	const { n1, n2, n3, arrow, nodeY, lineY } = HX;
	const l1 = n1 + HX.labelGap;
	const l2 = n2 + HX.labelGap;
	const l3 = n3 + HX.labelGap;
	const tickTop = nodeY + sz.r + 1;
	const dashStart = spec.midSegLabel ? n3 : HX.ghosts[0];

	return (
		<g>
			<PillGroup spec={spec} sz={sz} />

			{/* 실선 구간 */}
			<line
				x1={n1}
				y1={lineY}
				x2={n2}
				y2={lineY}
				stroke={c}
				strokeWidth={sz.stroke}
			/>
			{spec.midSegLabel ? (
				<line
					x1={n2}
					y1={lineY}
					x2={n3}
					y2={lineY}
					stroke={c}
					strokeWidth={sz.stroke}
				/>
			) : (
				<line
					x1={n2}
					y1={lineY}
					x2={HX.ghosts[0]}
					y2={lineY}
					stroke="var(--ink)"
					strokeWidth={sz.stroke}
				/>
			)}

			{/* 점선 + 화살표 */}
			<line
				x1={dashStart}
				y1={lineY}
				x2={arrow}
				y2={lineY}
				stroke="var(--muted-fg)"
				strokeWidth={sz.stroke}
				strokeDasharray="4.5 4.5"
			/>
			<polygon
				points={`${arrow},${lineY - 4.5} ${arrow + 10},${lineY} ${arrow},${lineY + 4.5}`}
				fill="var(--muted-fg)"
			/>

			{/* 반복 결제 ₩ 아웃라인(월간) */}
			{spec.midSegLabel
				? null
				: HX.ghosts.map((x) => (
						<GhostWon key={x} cx={x} cy={lineY} tone={spec.tone} sz={sz} />
					))}

			{/* 세로 연결선 + 선 위의 점 */}
			{[n1, n2, n3].map((x) => (
				<line
					key={x}
					x1={x}
					y1={tickTop}
					x2={x}
					y2={lineY}
					stroke="var(--line)"
					strokeWidth={1}
				/>
			))}
			<circle cx={n1} cy={lineY} r={sz.dot} fill={c} />
			<circle
				cx={n2}
				cy={lineY}
				r={sz.dot}
				fill={spec.tone === "brand" ? c : "var(--ink)"}
			/>
			<circle cx={n3} cy={lineY} r={sz.dot} fill={c} />

			{/* 마커 */}
			<MarkerCircle cx={n1} cy={nodeY} kind="card" tone={spec.tone} sz={sz} />
			<MarkerCircle cx={n2} cy={nodeY} kind="first" tone={spec.tone} sz={sz} />
			<MarkerCircle cx={n3} cy={nodeY} kind="renew" tone={spec.tone} sz={sz} />

			{/* 마커 라벨 */}
			<text x={l1} y={nodeY + 2.2} {...titleProps(sz)}>
				오늘 카드 등록
			</text>
			<text x={l1} y={nodeY + 23} {...subProps(sz)}>
				무료 이용 시작
			</text>
			<text x={l2} y={nodeY + 2.2} {...titleProps(sz)}>
				1개월 후 첫 결제
			</text>
			<text x={l2} y={nodeY + 23} {...subProps(sz)}>
				{spec.firstText}
			</text>
			<text x={l3} y={nodeY + 2.2} {...titleProps(sz)}>
				1년 1개월 후
			</text>
			<text x={l3} y={nodeY + 23} {...subProps(sz)}>
				{spec.renewText}
			</text>

			{/* 구간 라벨(선 바로 위, 검정) */}
			<text x={l1} y={lineY - 6} {...segProps(sz)}>
				무료이용 1개월
			</text>
			{spec.midSegLabel ? (
				<text
					x={(n2 + n3) / 2}
					y={lineY - 6.5}
					textAnchor="middle"
					{...segProps(sz)}
				>
					{spec.midSegLabel}
				</text>
			) : null}
		</g>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 세로 타임라인 (sm 미만) — 가로 시안을 90° 돌린 구성. 모든 요소 동일 포함.
// ─────────────────────────────────────────────────────────────────────

// 세로 좌표(viewBox 폭 340). rail=세로 선 x, marker=마커 x, label=라벨 x.
const VX = {
	rail: 12,
	tickEnd: 44,
	marker: 55,
	label: 75,
	segLabel: 44,
	s1: 52,
	s2: 116,
	s3solid: 180,
	s3dash: 222,
	ghosts: [140, 168, 196],
};

/** 세로 타임라인 한 줄의 높이(다음 줄 translate 계산용). */
const vRowHeight = (spec: CycleSpec) =>
	(spec.midSegLabel ? VX.s3solid : VX.s3dash) + 37;

function VStation({
	sy,
	kind,
	tone,
	dotFill,
	title,
	sub,
}: {
	sy: number;
	kind: "card" | "first" | "renew";
	tone: Tone;
	dotFill: string;
	title: string;
	sub: string;
}) {
	const sz = V_SIZES;
	return (
		<g>
			{/* 가로 연결선 + 선 위의 점 */}
			<line
				x1={VX.rail}
				y1={sy}
				x2={VX.tickEnd}
				y2={sy}
				stroke="var(--line)"
				strokeWidth={1}
			/>
			<circle cx={VX.rail} cy={sy} r={sz.dot} fill={dotFill} />
			<MarkerCircle cx={VX.marker} cy={sy} kind={kind} tone={tone} sz={sz} />
			<text x={VX.label} y={sy - 2.5} {...titleProps(sz)}>
				{title}
			</text>
			<text x={VX.label} y={sy + 15.5} {...subProps(sz)}>
				{sub}
			</text>
		</g>
	);
}

function VRow({ spec }: { spec: CycleSpec }) {
	const sz = V_SIZES;
	const c = toneColor(spec.tone);
	const { rail, s1, s2 } = VX;
	const s3 = spec.midSegLabel ? VX.s3solid : VX.s3dash;
	const arrowY = s3 + 28;

	return (
		<g>
			<PillGroup spec={spec} sz={sz} />

			{/* 실선 구간 */}
			<line
				x1={rail}
				y1={s1}
				x2={rail}
				y2={s2}
				stroke={c}
				strokeWidth={sz.stroke}
			/>
			{spec.midSegLabel ? (
				<line
					x1={rail}
					y1={s2}
					x2={rail}
					y2={s3}
					stroke={c}
					strokeWidth={sz.stroke}
				/>
			) : (
				<line
					x1={rail}
					y1={s2}
					x2={rail}
					y2={VX.ghosts[0]}
					stroke="var(--ink)"
					strokeWidth={sz.stroke}
				/>
			)}

			{/* 점선(월간 반복 구간 + 마지막 이후) + 화살표 */}
			{spec.midSegLabel ? null : (
				<line
					x1={rail}
					y1={VX.ghosts[0]}
					x2={rail}
					y2={s3}
					stroke="var(--muted-fg)"
					strokeWidth={sz.stroke}
					strokeDasharray="4 4"
				/>
			)}
			<line
				x1={rail}
				y1={s3}
				x2={rail}
				y2={arrowY}
				stroke="var(--muted-fg)"
				strokeWidth={sz.stroke}
				strokeDasharray="4 4"
			/>
			<polygon
				points={`${rail - 4},${arrowY} ${rail + 4},${arrowY} ${rail},${arrowY + 9}`}
				fill="var(--muted-fg)"
			/>

			{/* 반복 결제 ₩ 아웃라인(월간) */}
			{spec.midSegLabel
				? null
				: VX.ghosts.map((y) => (
						<GhostWon key={y} cx={rail} cy={y} tone={spec.tone} sz={sz} />
					))}

			{/* 정거장 3개 */}
			<VStation
				sy={s1}
				kind="card"
				tone={spec.tone}
				dotFill={c}
				title="오늘 카드 등록"
				sub="무료 이용 시작"
			/>
			<VStation
				sy={s2}
				kind="first"
				tone={spec.tone}
				dotFill={spec.tone === "brand" ? c : "var(--ink)"}
				title="1개월 후 첫 결제"
				sub={spec.firstText}
			/>
			<VStation
				sy={s3}
				kind="renew"
				tone={spec.tone}
				dotFill={c}
				title="1년 1개월 후"
				sub={spec.renewText}
			/>

			{/* 구간 라벨(검정) */}
			<text x={VX.segLabel} y={(s1 + s2) / 2 + 4} {...segProps(sz)}>
				무료이용 1개월
			</text>
			{spec.midSegLabel ? (
				<text x={VX.segLabel} y={(s2 + s3) / 2 + 4} {...segProps(sz)}>
					{spec.midSegLabel}
				</text>
			) : null}
		</g>
	);
}

/** 결제 일정 안내 카드 — 연간(파랑·추천)/월간(초록) 타임라인(시안 SVG 재작성본). */
export function PaymentSchedule({ className }: { className?: string }) {
	const annual: CycleSpec = {
		tone: "brand",
		pill: "연간 구독",
		recommended: true,
		firstText: `연 ${won(firstAmountForCycle("annual"))}`,
		renewText: `연 ${won(amountForCycle("annual"))} 자동 결제`,
		midSegLabel: "12개월 이용",
	};
	const monthly: CycleSpec = {
		tone: "success",
		pill: "월간 구독",
		firstText: `최초 1년간 월 ${won(firstAmountForCycle("monthly"))}`,
		renewText: `월 ${won(amountForCycle("monthly"))} 자동 결제`,
	};

	const label =
		`결제 일정. 연간 구독(추천): 오늘 카드 등록 후 무료 이용 1개월, 1개월 후 첫 결제 ${annual.firstText}, ` +
		`12개월 이용 뒤 1년 1개월 후부터 ${annual.renewText}. ` +
		`월간 구독: 오늘 카드 등록 후 무료 이용 1개월, 1개월 후 첫 결제 ${monthly.firstText}, ` +
		`1년 1개월 후부터 ${monthly.renewText}.`;

	const vMonthlyOffset = vRowHeight(annual) + 26;
	const vHeight = vMonthlyOffset + vRowHeight(monthly);

	return (
		<section
			className={cn(
				"overflow-hidden rounded-2xl border border-line-soft bg-surface p-5 sm:p-6",
				className,
			)}
		>
			<h3 className="text-[16px] font-semibold text-ink sm:text-[17px]">
				결제 일정 안내
			</h3>
			{/* sm 이상: 가로 타임라인(알약은 표 위) */}
			<svg
				viewBox={`0 0 720 ${HX.height}`}
				className="mt-4 hidden h-auto w-full sm:block"
				role="img"
				aria-label={label}
			>
				<HRow spec={annual} />
				<g transform={`translate(0 ${HX.rowGap})`}>
					<HRow spec={monthly} />
				</g>
			</svg>
			{/* sm 미만: 세로 타임라인 — 같은 요소 구성 그대로 */}
			<svg
				viewBox={`0 0 340 ${vHeight}`}
				className="mt-4 h-auto w-full max-w-90 sm:hidden"
				role="img"
				aria-label={label}
			>
				<VRow spec={annual} />
				<g transform={`translate(0 ${vMonthlyOffset})`}>
					<VRow spec={monthly} />
				</g>
			</svg>
		</section>
	);
}
