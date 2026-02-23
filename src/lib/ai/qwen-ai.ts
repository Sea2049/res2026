/**
 * 通义千问 (QWEN) AI客户端
 * 使用阿里云DashScope API的兼容模式（OpenAI格式）
 */

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
 * 聊天完成响应接口（OpenAI兼容格式）
 */
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: Message;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 通义千问AI客户端类
 * 封装QWEN API调用逻辑（使用OpenAI兼容模式）
 */
export const qwenAI = {
  /**
   * 聊天完成接口
   * @param request 聊天完成请求参数
   * @returns 聊天完成响应内容
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<string> {
    const {
      apiKey,
      messages,
      model = "qwen3.5-plus",
      temperature = 0.7,
      maxTokens = 8000,
      topP = 0.9
    } = request;

    // 使用DashScope的OpenAI兼容模式端点
    const apiUrl = process.env.QWEN_API_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
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
        let errorMessage = `通义千问API请求失败: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage += ` - ${errorData.error?.message || errorData.message || errorText}`;
        } catch {
          errorMessage += ` - ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data: ChatCompletionResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error("通义千问API返回数据格式异常：没有返回选项");
      }

      const content = data.choices[0].message.content;
      
      if (!content) {
        throw new Error("通义千问API返回内容为空");
      }

      return content;
    } catch (error) {
      // 增强错误信息
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`通义千问API调用失败: ${String(error)}`);
    }
  }
};
