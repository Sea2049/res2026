import crypto from "crypto";

/**
 * 消息接口定义
 */
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 聊天完成请求接口
 */
export interface ChatCompletionRequest {
  apiKey: string;
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * 聊天完成响应接口
 */
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: Message;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 生成JWT Token
 * @param apiKey 智谱AI API密钥
 * @returns JWT Token字符串
 */
function generateJWT(apiKey: string): string {
  const [id, secret] = apiKey.split(".");

  const now = Date.now();
  const exp = now + 3600 * 1000;

  const header = {
    alg: "HS256",
    sign_type: "SIGN"
  };

  const payload = {
    api_key: id,
    exp: exp,
    timestamp: now
  };

  const encodeBase64 = (obj: any) => {
    return Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  };

  const headerEncoded = encodeBase64(header);
  const payloadEncoded = encodeBase64(payload);

  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * 智谱AI客户端类
 * 封装GLM-4 API调用逻辑
 */
export const zhipuAI = {
  /**
   * 聊天完成接口
   * @param request 聊天完成请求参数
   * @returns 聊天完成响应
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<string> {
    const {
      apiKey,
      messages,
      model = "glm-4",
      temperature = 0.7,
      maxTokens = 2000,
      topP = 0.9
    } = request;

    const apiUrl = process.env.ZHIPU_API_URL || "https://open.bigmodel.cn/api/paas/v4/chat/completions";
    const token = generateJWT(apiKey);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`智谱AI API请求失败: ${response.status} - ${errorText}`);
    }

    const data: ChatCompletionResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("智谱AI API返回数据格式异常");
    }

    return data.choices[0].message.content;
  }
};