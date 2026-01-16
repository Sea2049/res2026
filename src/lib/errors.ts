/**
 * 错误类型定义和错误处理工具
 * 提供细化的错误分类和恢复建议
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // API 相关错误
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_AUTH_ERROR = 'API_AUTH_ERROR',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  API_INVALID_REQUEST = 'API_INVALID_REQUEST',

  // 解析相关错误
  PARSE_ERROR = 'PARSE_ERROR',
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',

  // Worker 相关错误
  WORKER_ERROR = 'WORKER_ERROR',
  WORKER_TIMEOUT = 'WORKER_TIMEOUT',
  WORKER_INIT_ERROR = 'WORKER_INIT_ERROR',

  // 业务逻辑错误
  INVALID_INPUT = 'INVALID_INPUT',
  NO_DATA_AVAILABLE = 'NO_DATA_AVAILABLE',

  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'low',      // 不影响核心功能，用户可以选择忽略
  MEDIUM = 'medium', // 影响部分功能，需要用户干预
  HIGH = 'high',    // 严重影响功能，需要立即处理
}

/**
 * 错误恢复建议
 */
export interface RecoveryAction {
  /**
   * 建议操作的标签
   */
  label: string;
  /**
   * 建议操作的描述
   */
  description: string;
  /**
   * 是否可以自动恢复
   */
  autoRecoverable: boolean;
  /**
   * 自动恢复的延迟时间（毫秒）
   */
  autoRecoverDelay?: number;
}

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  /**
   * 错误类型
   */
  public readonly type: ErrorType;

  /**
   * 错误严重程度
   */
  public readonly severity: ErrorSeverity;

  /**
   * 错误代码
   */
  public readonly code: string;

  /**
   * 用户友好的错误消息
   */
  public readonly userMessage: string;

  /**
   * 恢复建议
   */
  public readonly recoveryActions: RecoveryAction[];

  /**
   * 原始错误对象
   */
  public readonly originalError?: Error;

  /**
   * 额外的上下文信息
   */
  public readonly context?: Record<string, any>;

  constructor(options: {
    type: ErrorType;
    code: string;
    message: string;
    userMessage: string;
    severity?: ErrorSeverity;
    recoveryActions?: RecoveryAction[];
    originalError?: Error;
    context?: Record<string, any>;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.type = options.type;
    this.code = options.code;
    this.message = options.message;
    this.userMessage = options.userMessage;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.recoveryActions = options.recoveryActions || [];
    this.originalError = options.originalError;
    this.context = options.context;

    // 维护正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      severity: this.severity,
      recoveryActions: this.recoveryActions,
      context: this.context,
      originalError: this.originalError?.message,
    };
  }
}

/**
 * 创建网络错误
 */
export function createNetworkError(
  originalError?: Error,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.NETWORK_ERROR,
    code: 'NET_001',
    message: '网络连接失败',
    userMessage: '无法连接到服务器，请检查您的网络连接',
    severity: ErrorSeverity.HIGH,
    recoveryActions: [
      {
        label: '检查网络连接',
        description: '请确认您的设备已连接到互联网',
        autoRecoverable: false,
      },
      {
        label: '重试',
        description: '网络问题通常是暂时的，请稍后重试',
        autoRecoverable: true,
        autoRecoverDelay: 3000,
      },
    ],
    originalError,
    context,
  });
}

/**
 * 创建超时错误
 */
export function createTimeoutError(
  originalError?: Error,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.TIMEOUT_ERROR,
    code: 'TIMEOUT_001',
    message: '请求超时',
    userMessage: '服务器响应超时，请稍后重试',
    severity: ErrorSeverity.MEDIUM,
    recoveryActions: [
      {
        label: '稍后重试',
        description: '服务器可能繁忙，请等待片刻后重试',
        autoRecoverable: true,
        autoRecoverDelay: 5000,
      },
      {
        label: '减少数据量',
        description: '如果数据量较大，可以尝试减少分析数量',
        autoRecoverable: false,
      },
    ],
    originalError,
    context,
  });
}

/**
 * 创建 API 限流错误
 */
export function createRateLimitError(
  retryAfter?: number,
  context?: Record<string, any>
): AppError {
  const retryMessage = retryAfter
    ? `请在 ${Math.ceil(retryAfter / 60)} 分钟后重试`
    : '请稍后重试';

  return new AppError({
    type: ErrorType.API_RATE_LIMIT,
    code: 'API_429',
    message: 'API 请求频率超限',
    userMessage: `请求过于频繁，${retryMessage}`,
    severity: ErrorSeverity.MEDIUM,
    recoveryActions: [
      {
        label: '等待后重试',
        description: retryMessage,
        autoRecoverable: true,
        autoRecoverDelay: retryAfter ? retryAfter * 1000 : 60000,
      },
      {
        label: '减少请求频率',
        description: '请减少同时分析的主题数量',
        autoRecoverable: false,
      },
    ],
    context: {
      ...context,
      retryAfter,
    },
  });
}

/**
 * 创建 API 认证错误
 */
export function createAuthError(
  originalError?: Error,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.API_AUTH_ERROR,
    code: 'API_401',
    message: 'API 认证失败',
    userMessage: '无法访问数据，请联系管理员',
    severity: ErrorSeverity.HIGH,
    recoveryActions: [
      {
        label: '联系管理员',
        description: 'API 配置可能存在问题，请联系技术支持',
        autoRecoverable: false,
      },
    ],
    originalError,
    context,
  });
}

/**
 * 创建 API 未找到错误
 */
export function createNotFoundError(
  resource: string,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.API_NOT_FOUND,
    code: 'API_404',
    message: '资源未找到',
    userMessage: `无法找到 ${resource}，请检查输入是否正确`,
    severity: ErrorSeverity.MEDIUM,
    recoveryActions: [
      {
        label: '检查输入',
        description: '请确认您选择的主题或社区名称是否正确',
        autoRecoverable: false,
      },
      {
        label: '尝试其他主题',
        description: '该主题可能不存在或已被删除',
        autoRecoverable: false,
      },
    ],
    context: {
      ...context,
      resource,
    },
  });
}

/**
 * 创建 API 服务器错误
 */
export function createServerError(
  statusCode: number,
  originalError?: Error,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.API_SERVER_ERROR,
    code: `API_${statusCode}`,
    message: `服务器错误 (${statusCode})`,
    userMessage: '服务器遇到问题，请稍后重试',
    severity: ErrorSeverity.HIGH,
    recoveryActions: [
      {
        label: '稍后重试',
        description: '服务器可能暂时不可用，请等待片刻',
        autoRecoverable: true,
        autoRecoverDelay: 5000,
      },
      {
        label: '联系管理员',
        description: '如果问题持续存在，请联系技术支持',
        autoRecoverable: false,
      },
    ],
    originalError,
    context: {
      ...context,
      statusCode,
    },
  });
}

/**
 * 创建 API 无效请求错误
 */
export function createInvalidRequestError(
  message: string,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.API_INVALID_REQUEST,
    code: 'API_400',
    message: '无效请求',
    userMessage: message || '请求参数无效',
    severity: ErrorSeverity.MEDIUM,
    recoveryActions: [
      {
        label: '检查输入',
        description: '请确认您的输入符合要求',
        autoRecoverable: false,
      },
      {
        label: '重新选择',
        description: '请选择有效的主题进行分析',
        autoRecoverable: false,
      },
    ],
    context,
  });
}

/**
 * 创建解析错误
 */
export function createParseError(
  originalError?: Error,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.PARSE_ERROR,
    code: 'PARSE_001',
    message: '数据解析失败',
    userMessage: '无法处理返回的数据，请稍后重试',
    severity: ErrorSeverity.MEDIUM,
    recoveryActions: [
      {
        label: '稍后重试',
        description: '数据格式可能暂时不兼容',
        autoRecoverable: true,
        autoRecoverDelay: 3000,
      },
      {
        label: '联系管理员',
        description: '如果问题持续存在，请联系技术支持',
        autoRecoverable: false,
      },
    ],
    originalError,
    context,
  });
}

/**
 * 创建 Worker 错误
 */
export function createWorkerError(
  originalError?: Error,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.WORKER_ERROR,
    code: 'WORKER_001',
    message: '分析任务执行失败',
    userMessage: '分析过程中遇到问题，正在自动重试',
    severity: ErrorSeverity.MEDIUM,
    recoveryActions: [
      {
        label: '自动重试',
        description: '系统将自动重试分析任务',
        autoRecoverable: true,
        autoRecoverDelay: 1000,
      },
      {
        label: '减少数据量',
        description: '如果持续失败，请减少分析数量',
        autoRecoverable: false,
      },
    ],
    originalError,
    context,
  });
}

/**
 * 创建 Worker 超时错误
 */
export function createWorkerTimeoutError(
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.WORKER_TIMEOUT,
    code: 'WORKER_002',
    message: '分析任务超时',
    userMessage: '分析时间过长，已自动取消',
    severity: ErrorSeverity.MEDIUM,
    recoveryActions: [
      {
        label: '减少数据量',
        description: '数据量较大可能导致分析时间过长',
        autoRecoverable: false,
      },
      {
        label: '重新分析',
        description: '可以尝试减少分析数量后重新开始',
        autoRecoverable: false,
      },
    ],
    context,
  });
}

/**
 * 创建 Worker 初始化错误
 */
export function createWorkerInitError(
  originalError?: Error,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.WORKER_INIT_ERROR,
    code: 'WORKER_003',
    message: '无法初始化分析模块',
    userMessage: '分析模块启动失败，请刷新页面重试',
    severity: ErrorSeverity.HIGH,
    recoveryActions: [
      {
        label: '刷新页面',
        description: '页面可能存在问题，请刷新后重试',
        autoRecoverable: false,
      },
      {
        label: '检查浏览器兼容性',
        description: '请确保您的浏览器支持 Web Workers',
        autoRecoverable: false,
      },
    ],
    originalError,
    context,
  });
}

/**
 * 创建无效输入错误
 */
export function createInvalidInputError(
  message: string,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.INVALID_INPUT,
    code: 'INPUT_001',
    message: '输入无效',
    userMessage: message || '您的输入不符合要求',
    severity: ErrorSeverity.LOW,
    recoveryActions: [
      {
        label: '检查输入',
        description: '请确认您的输入符合要求',
        autoRecoverable: false,
      },
    ],
    context,
  });
}

/**
 * 创建无数据错误
 */
export function createNoDataError(
  message: string = '未找到可分析的数据',
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.NO_DATA_AVAILABLE,
    code: 'DATA_001',
    message: '无可用数据',
    userMessage: message,
    severity: ErrorSeverity.LOW,
    recoveryActions: [
      {
        label: '尝试其他主题',
        description: '当前主题可能没有足够的评论数据',
        autoRecoverable: false,
      },
      {
        label: '扩大搜索范围',
        description: '尝试选择更热门的社区或帖子',
        autoRecoverable: false,
      },
    ],
    context,
  });
}

/**
 * 创建未知错误
 */
export function createUnknownError(
  originalError?: Error,
  context?: Record<string, any>
): AppError {
  return new AppError({
    type: ErrorType.UNKNOWN_ERROR,
    code: 'UNKNOWN_001',
    message: '发生未知错误',
    userMessage: '遇到意外问题，请稍后重试',
    severity: ErrorSeverity.HIGH,
    recoveryActions: [
      {
        label: '刷新页面',
        description: '页面状态可能已损坏，请刷新后重试',
        autoRecoverable: false,
      },
      {
        label: '联系管理员',
        description: '如果问题持续存在，请联系技术支持',
        autoRecoverable: false,
      },
    ],
    originalError,
    context,
  });
}

/**
 * 判断错误是否为 AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * 从标准错误创建 AppError
 */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // 根据错误消息判断错误类型
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return createNetworkError(error);
    }
    if (message.includes('timeout')) {
      return createTimeoutError(error);
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return createRateLimitError();
    }
    if (message.includes('auth') || message.includes('401')) {
      return createAuthError(error);
    }
    if (message.includes('not found') || message.includes('404')) {
      return createNotFoundError('资源');
    }
    if (message.includes('parse')) {
      return createParseError(error);
    }

    return createUnknownError(error);
  }

  return createUnknownError(new Error(String(error)));
}
