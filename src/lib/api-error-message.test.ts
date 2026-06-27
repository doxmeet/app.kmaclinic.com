import { describe, expect, it } from "vitest";
import { ApiError } from "#/lib/api";
import {
	ADMIN_ERROR_OVERRIDES,
	apiErrorMessage,
} from "#/lib/api-error-message.ts";

const err = (opts: {
	status: number;
	errorCode?: string;
	errorUuid?: string;
}) =>
	new ApiError({
		status: opts.status,
		errorCode: opts.errorCode ?? null,
		errorUuid: opts.errorUuid ?? null,
	});

describe("apiErrorMessage", () => {
	it("정의된 코드는 안내 문구로 매핑한다", () => {
		expect(
			apiErrorMessage(err({ status: 409, errorCode: "ERROR_409_SLUG_TAKEN" })),
		).toBe("이미 사용 중인 주소입니다. 다른 주소를 입력해 주세요.");
	});

	it("error_uuid가 있으면 코드와 무관하게 추적 코드를 함께 안내한다", () => {
		const msg = apiErrorMessage(
			err({
				status: 500,
				errorCode: "ERROR_500_UNDEFINED_ERROR",
				errorUuid: "errx-abc-123",
			}),
		);
		expect(msg).toContain("errx-abc-123");
		expect(msg).toContain("일시적인 오류");
	});

	it("동적 코드(INVALID_FIELD_*)는 정규식 폴백으로 처리한다", () => {
		expect(
			apiErrorMessage(
				err({ status: 400, errorCode: "ERROR_400_INVALID_FIELD_email" }),
			),
		).toBe("입력하신 내용 중 일부가 올바르지 않습니다. 다시 확인해 주세요.");
	});

	it("정의된 OAuth 제공자 코드는 전용 문구를 쓴다", () => {
		expect(
			apiErrorMessage(
				err({ status: 502, errorCode: "ERROR_502_DOXMEET_UNREACHABLE" }),
			),
		).toBe("로그인 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
	});

	it("미정의 제공자의 OAuth 로그인 실패도 정규식 폴백으로 처리한다", () => {
		// 새 제공자(KAKAO 등)가 추가돼 MESSAGES에 없어도 토큰/사용자 조회 실패를 잡는다.
		expect(
			apiErrorMessage(
				err({ status: 400, errorCode: "ERROR_400_KAKAO_TOKEN_NOT_FOUND" }),
			),
		).toBe("로그인에 실패했습니다. 다시 시도해 주세요.");
	});

	it("모르는 코드는 HTTP status 폴백으로 처리한다", () => {
		expect(
			apiErrorMessage(err({ status: 409, errorCode: "ERROR_409_BRAND_NEW" })),
		).toBe("이미 처리되었거나 다른 상태와 충돌했습니다.");
		expect(apiErrorMessage(err({ status: 404 }))).toBe(
			"요청하신 내용을 찾을 수 없습니다.",
		);
	});

	it("overrides가 기본 메시지보다 우선한다(운영자 콘솔)", () => {
		const e = err({ status: 404, errorCode: "ERROR_404_USER_NOT_FOUND" });
		expect(apiErrorMessage(e)).toBe(
			"사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.",
		);
		expect(apiErrorMessage(e, ADMIN_ERROR_OVERRIDES)).toBe(
			"대상 사용자를 찾을 수 없습니다.",
		);
	});

	it("ApiError가 아니면 네트워크 안내를 반환한다", () => {
		expect(apiErrorMessage(new Error("boom"))).toBe(
			"네트워크 상태가 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
		);
	});
});
