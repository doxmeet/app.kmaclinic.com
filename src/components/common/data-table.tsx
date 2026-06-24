import type * as React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import { cn } from "#/lib/utils.ts";

export type DataTableColumn<T> = {
	/** 컬럼 식별 키 (React key 및 컬럼 구분용) */
	key: string;
	/** 헤더 라벨 */
	header: React.ReactNode;
	/** 셀 렌더러 */
	render: (row: T, index: number) => React.ReactNode;
	/** 모바일(<sm)에서 컬럼 숨김 — 숨긴 정보는 다른 컬럼 render에서 보조로 노출 */
	hideOnMobile?: boolean;
	/** 헤더 셀 추가 클래스 */
	headClassName?: string;
	/** 본문 셀 추가 클래스 */
	cellClassName?: string;
};

const DIVIDER_BASE =
	"relative before:absolute before:top-1/2 before:left-0 before:h-[26px] before:w-px before:-translate-y-1/2";

/**
 * DataTable — 결제 내역 등에 쓰는 공용 표 (Figma "병의원").
 * 옅은 헤더 배경 + 56px 행 높이 + 컬럼 간 세로 구분선, 가로 스크롤 지원.
 * columns/data 선언형 API. (관리자 화면의 표는 별도 스타일을 쓰므로 이 컴포넌트를 강제하지 않는다.)
 */
function DataTable<T>({
	columns,
	data,
	getRowKey,
	emptyText = "데이터가 없습니다.",
	minWidth,
}: {
	columns: Array<DataTableColumn<T>>;
	data: T[];
	getRowKey: (row: T, index: number) => string | number;
	emptyText?: React.ReactNode;
	/** 좁은 화면 가로 스크롤용 최소 너비 (예: "min-w-[820px]") */
	minWidth?: string;
}) {
	if (data.length === 0) {
		return <p className="text-sm text-body-soft">{emptyText}</p>;
	}

	return (
		<div className="overflow-hidden rounded-xl border border-line">
			<Table className={minWidth}>
				<TableHeader>
					<TableRow className="bg-[#f9fafb] hover:bg-[#f9fafb]">
						{columns.map((col, i) => (
							<TableHead
								key={col.key}
								className={cn(
									"h-14 px-4 text-[17px] font-normal text-body-soft sm:px-6",
									i > 0 && `${DIVIDER_BASE} before:bg-line`,
									col.hideOnMobile && "hidden sm:table-cell",
									col.headClassName,
								)}
							>
								{col.header}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.map((row, rowIndex) => (
						<TableRow
							key={getRowKey(row, rowIndex)}
							className="border-[#f1f5f9]"
						>
							{columns.map((col, i) => (
								<TableCell
									key={col.key}
									className={cn(
										"h-14 px-4 text-[16px] text-ink sm:px-6",
										i > 0 && `${DIVIDER_BASE} before:bg-[#f1f5f9]`,
										col.hideOnMobile && "hidden sm:table-cell",
										col.cellClassName,
									)}
								>
									{col.render(row, rowIndex)}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

export { DataTable };
