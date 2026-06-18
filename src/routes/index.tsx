import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import TiptapEditor from "#/components/editor/tiptap-editor";

export const Route = createFileRoute("/")({ component: Home });

const INITIAL_HTML = `
<h2>에디터 테스트</h2>
<p>여기에 자유롭게 입력해 보세요. <strong>굵게</strong>, <em>기울임</em>, <u>밑줄</u>, 정렬, 목록, 표, 링크, 유튜브 등을 시험할 수 있습니다.</p>
<ul>
  <li>툴바 버튼으로 서식 적용</li>
  <li>이미지 버튼은 백엔드 업로드 설정이 필요합니다</li>
</ul>
`.trim();

function Home() {
	const [value, setValue] = useState(INITIAL_HTML);

	return (
		<div className="mx-auto max-w-4xl p-6 md:p-8">
			<header className="mb-6">
				<h1 className="text-3xl font-bold">텍스트 에디터 테스트</h1>
				<p className="mt-2 text-muted-foreground">
					Tiptap 기반 에디터입니다. 아래에서 입력하면 결과 HTML이 실시간으로
					갱신됩니다.
				</p>
			</header>

			<TiptapEditor
				value={value}
				setValue={setValue}
				height={420}
				placeholder="내용을 입력하세요…"
			/>

			<section className="mt-8 grid gap-6 lg:grid-cols-2">
				<div>
					<h2 className="mb-2 text-sm font-semibold text-muted-foreground">
						결과 HTML
					</h2>
					<pre className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap break-all">
						{value}
					</pre>
				</div>
				<div>
					<h2 className="mb-2 text-sm font-semibold text-muted-foreground">
						렌더링 미리보기
					</h2>
					<div
						className="prose prose-sm max-w-none rounded-md border p-3"
						// 테스트 전용: 자기 입력을 그대로 렌더. 운영에서는 서버/렌더 시 sanitize 필요.
						// biome-ignore lint/security/noDangerouslySetInnerHtml: 테스트 미리보기 전용
						dangerouslySetInnerHTML={{ __html: value }}
					/>
				</div>
			</section>
		</div>
	);
}
