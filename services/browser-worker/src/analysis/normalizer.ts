import type { NormalizedComment } from "../storage/comment-repo";

export interface RawCommentData {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  parent_id: string;
  subreddit: string;
  post_id: string;
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&nbsp;": " ",
};

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 简单启发式语言检测：若非 ASCII 字符占比超过 50%，视为非英语。
 */
function isNonEnglish(text: string): boolean {
  if (text.length === 0) return false;
  const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) ?? []).length;
  return nonAsciiCount / text.length > 0.5;
}

/**
 * 将 RawCommentData 规范化为 NormalizedComment。
 * 返回 null 表示该评论应被过滤掉。
 */
export function normalizeComment(
  raw: RawCommentData,
  jobId: string
): NormalizedComment | null {
  const rawBody = (raw.body ?? "").trim();

  // 过滤空内容、已删除、已移除的评论
  if (!rawBody || rawBody === "[deleted]" || rawBody === "[removed]") {
    return null;
  }

  // 去除 HTML 标签
  const cleanBody = stripHtml(rawBody);

  // 过滤清洗后为空的评论
  if (!cleanBody) {
    return null;
  }

  // 语言检测：非英语跳过
  if (isNonEnglish(cleanBody)) {
    return null;
  }

  // 截断超长评论（超过 10000 字符）
  const body = cleanBody.length > 10_000 ? cleanBody.slice(0, 10_000) : cleanBody;

  return {
    comment_id: raw.id,
    job_id: jobId,
    post_id: raw.post_id,
    subreddit: raw.subreddit,
    author: raw.author,
    body,
    created_utc: raw.created_utc,
    normalized_at: new Date().toISOString(),
  };
}
