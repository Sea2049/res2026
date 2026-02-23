import '@testing-library/jest-dom';

// Node/Jest 环境下 undici 依赖 TextDecoder（fetch-helper 等）
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = require('node:stream/web').ReadableStream;
}
if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = require('node:stream/web').WritableStream;
}
if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = require('node:stream/web').TransformStream;
}
if (typeof global.MessageChannel === 'undefined' || typeof global.MessagePort === 'undefined') {
  const { MessageChannel, MessagePort } = require('node:worker_threads');
  if (typeof global.MessageChannel === 'undefined') {
    global.MessageChannel = MessageChannel;
  }
  if (typeof global.MessagePort === 'undefined') {
    global.MessagePort = MessagePort;
  }
}

const { Request, Response, Headers, FormData } = require('undici');

// 为 Next.js route handler 测试补齐 Web API 构造器
if (typeof global.Request === 'undefined') {
  global.Request = Request;
}
if (typeof global.Response === 'undefined') {
  global.Response = Response;
}
if (typeof global.Headers === 'undefined') {
  global.Headers = Headers;
}
if (typeof global.FormData === 'undefined') {
  global.FormData = FormData;
}

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
}

