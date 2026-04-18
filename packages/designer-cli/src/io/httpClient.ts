/**
 * httpClient.ts — HTTP 클라이언트 인터페이스 + fetch 기본 구현
 *
 * 단위 테스트 시 MockHttpClient를 주입한다.
 * 헤더 키는 소문자로 정규화 (Node20 fetch 호환).
 */

export interface HttpResponse {
  status: number;
  /** 소문자 정규화된 응답 헤더 */
  headers: Record<string, string>;
  bodyText: string;
}

export interface HttpClient {
  /**
   * HTTP PUT 요청을 보내고 응답을 반환한다.
   *
   * @param url - 전체 URL
   * @param body - JSON 직렬화된 body 문자열
   * @param headers - 요청 헤더 (소문자 키)
   */
  put(url: string, body: string, headers: Record<string, string>): Promise<HttpResponse>;
}

/**
 * globalThis.fetch 기반 기본 HttpClient 구현.
 */
export class FetchHttpClient implements HttpClient {
  async put(url: string, body: string, headers: Record<string, string>): Promise<HttpResponse> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    });

    // 응답 헤더 소문자 정규화
    const normalizedHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      normalizedHeaders[key.toLowerCase()] = value;
    });

    const bodyText = await response.text();
    return { status: response.status, headers: normalizedHeaders, bodyText };
  }
}

/** 기본 fetch 기반 HttpClient 인스턴스 */
export const defaultHttpClient: HttpClient = new FetchHttpClient();
