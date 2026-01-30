/**
 * Validators 单元测试
 */

import {
  validateSubreddit,
  validatePostId,
  validateLimit,
  validateSortType,
  validateInviteCode,
  validateUUID,
  validateCUID,
  validateFilename,
  validateExportFormat,
  validatePositiveInteger,
  validateBoolean,
  validateNonEmptyString,
  validResult,
  invalidResult,
  VALID_SEARCH_SORT_TYPES,
  VALID_TIME_RANGES,
  VALID_EXPORT_FORMATS,
} from '../validators';

describe('validateSubreddit', () => {
  it('should accept valid subreddit names', () => {
    expect(validateSubreddit('programming')).toBe(true);
    expect(validateSubreddit('AskReddit')).toBe(true);
    expect(validateSubreddit('test_123')).toBe(true);
    expect(validateSubreddit('a')).toBe(true);
  });

  it('should reject invalid subreddit names', () => {
    expect(validateSubreddit(null)).toBe(false);
    expect(validateSubreddit(undefined)).toBe(false);
    expect(validateSubreddit('')).toBe(false);
    expect(validateSubreddit('a'.repeat(51))).toBe(false); // Too long
    expect(validateSubreddit('invalid-name')).toBe(false); // Hyphen not allowed
    expect(validateSubreddit('invalid name')).toBe(false); // Space not allowed
    expect(validateSubreddit('invalid!name')).toBe(false); // Special char not allowed
  });

  it('should trim whitespace', () => {
    expect(validateSubreddit('  programming  ')).toBe(true);
  });
});

describe('validatePostId', () => {
  it('should accept valid post IDs', () => {
    expect(validatePostId('abc123')).toBe(true);
    expect(validatePostId('1a2b3c')).toBe(true);
    expect(validatePostId('a')).toBe(true);
  });

  it('should reject invalid post IDs', () => {
    expect(validatePostId(null)).toBe(false);
    expect(validatePostId(undefined)).toBe(false);
    expect(validatePostId('')).toBe(false);
    expect(validatePostId('a'.repeat(11))).toBe(false); // Too long
    expect(validatePostId('invalid-id')).toBe(false); // Hyphen not allowed
    expect(validatePostId('invalid_id')).toBe(false); // Underscore not allowed
  });
});

describe('validateLimit', () => {
  it('should return default value when limit is empty', () => {
    expect(validateLimit(null)).toBe(10);
    expect(validateLimit(undefined)).toBe(10);
    expect(validateLimit('')).toBe(10);
  });

  it('should parse valid limit values', () => {
    expect(validateLimit('5')).toBe(5);
    expect(validateLimit('100')).toBe(100);
    expect(validateLimit('1')).toBe(1);
  });

  it('should return null for invalid values', () => {
    expect(validateLimit('abc')).toBe(null);
    expect(validateLimit('0')).toBe(null); // Below min
    expect(validateLimit('101')).toBe(null); // Above max
    expect(validateLimit('-5')).toBe(null);
  });

  it('should use custom min/max/default', () => {
    expect(validateLimit(null, 5, 50, 25)).toBe(25); // Custom default
    expect(validateLimit('3', 5, 50)).toBe(null); // Below custom min
    expect(validateLimit('60', 5, 50)).toBe(null); // Above custom max
    expect(validateLimit('30', 5, 50)).toBe(30); // Within custom range
  });
});

describe('validateSortType', () => {
  it('should accept valid sort types', () => {
    expect(validateSortType('relevance', VALID_SEARCH_SORT_TYPES)).toBe(true);
    expect(validateSortType('hot', VALID_SEARCH_SORT_TYPES)).toBe(true);
    expect(validateSortType('top', VALID_SEARCH_SORT_TYPES)).toBe(true);
    expect(validateSortType('new', VALID_SEARCH_SORT_TYPES)).toBe(true);
  });

  it('should accept empty value (uses default)', () => {
    expect(validateSortType(null, VALID_SEARCH_SORT_TYPES)).toBe(true);
    expect(validateSortType(undefined, VALID_SEARCH_SORT_TYPES)).toBe(true);
    expect(validateSortType('', VALID_SEARCH_SORT_TYPES)).toBe(true);
  });

  it('should reject invalid sort types', () => {
    expect(validateSortType('invalid', VALID_SEARCH_SORT_TYPES)).toBe(false);
    expect(validateSortType('random', VALID_SEARCH_SORT_TYPES)).toBe(false);
  });
});

describe('validateInviteCode', () => {
  it('should accept valid invite codes', () => {
    expect(validateInviteCode('ABCD1234')).toBe(true);
    expect(validateInviteCode('12345678')).toBe(true);
    expect(validateInviteCode('AAAAAAAA')).toBe(true);
  });

  it('should normalize to uppercase', () => {
    expect(validateInviteCode('abcd1234')).toBe(true);
    expect(validateInviteCode('AbCd1234')).toBe(true);
  });

  it('should reject invalid invite codes', () => {
    expect(validateInviteCode(null)).toBe(false);
    expect(validateInviteCode('')).toBe(false);
    expect(validateInviteCode('ABC123')).toBe(false); // Too short
    expect(validateInviteCode('ABCD12345')).toBe(false); // Too long
    expect(validateInviteCode('ABCD-123')).toBe(false); // Invalid character
  });
});

describe('validateUUID', () => {
  it('should accept valid UUIDs', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(validateUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    expect(validateUUID(null)).toBe(false);
    expect(validateUUID('')).toBe(false);
    expect(validateUUID('not-a-uuid')).toBe(false);
    expect(validateUUID('550e8400-e29b-31d4-a716-446655440000')).toBe(false); // v3 not v4
  });
});

describe('validateCUID', () => {
  it('should accept valid CUIDs', () => {
    expect(validateCUID('cjld2cjxh0000qzrmn831i7rn')).toBe(true);
    expect(validateCUID('cm2o3hf7g00003b6kxwchb3ki')).toBe(true);
  });

  it('should reject invalid CUIDs', () => {
    expect(validateCUID(null)).toBe(false);
    expect(validateCUID('')).toBe(false);
    expect(validateCUID('not-a-cuid')).toBe(false);
    expect(validateCUID('ajld2cjxh0000qzrmn831i7rn')).toBe(false); // Doesn't start with 'c'
  });
});

describe('validateFilename', () => {
  it('should accept valid filenames', () => {
    expect(validateFilename('report.pdf')).toBe(true);
    expect(validateFilename('my_report-2024.xlsx')).toBe(true);
    expect(validateFilename('测试文件.txt')).toBe(true);
    expect(validateFilename('file123.json')).toBe(true);
  });

  it('should reject path traversal attempts', () => {
    expect(validateFilename('../etc/passwd')).toBe(false);
    expect(validateFilename('..\\windows\\system32')).toBe(false);
    expect(validateFilename('/etc/passwd')).toBe(false);
    expect(validateFilename('C:\\Windows\\System32')).toBe(false);
  });

  it('should reject invalid filenames', () => {
    expect(validateFilename(null)).toBe(false);
    expect(validateFilename('')).toBe(false);
    expect(validateFilename('file<>name.txt')).toBe(false);
    expect(validateFilename('a'.repeat(201))).toBe(false); // Too long
  });
});

describe('validateExportFormat', () => {
  it('should accept valid export formats', () => {
    expect(validateExportFormat('json')).toBe(true);
    expect(validateExportFormat('csv')).toBe(true);
    expect(validateExportFormat('txt')).toBe(true);
    expect(validateExportFormat('md')).toBe(true);
    expect(validateExportFormat('xlsx')).toBe(true);
  });

  it('should accept empty value (uses default)', () => {
    expect(validateExportFormat(null)).toBe(true);
    expect(validateExportFormat(undefined)).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(validateExportFormat('JSON')).toBe(true);
    expect(validateExportFormat('Csv')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(validateExportFormat('pdf')).toBe(false);
    expect(validateExportFormat('docx')).toBe(false);
    expect(validateExportFormat('invalid')).toBe(false);
  });
});

describe('validatePositiveInteger', () => {
  it('should accept positive integers', () => {
    expect(validatePositiveInteger(1)).toBe(true);
    expect(validatePositiveInteger(100)).toBe(true);
    expect(validatePositiveInteger(999999)).toBe(true);
  });

  it('should reject non-positive integers', () => {
    expect(validatePositiveInteger(0)).toBe(false);
    expect(validatePositiveInteger(-1)).toBe(false);
    expect(validatePositiveInteger(-100)).toBe(false);
  });

  it('should reject non-integers', () => {
    expect(validatePositiveInteger(1.5)).toBe(false);
    expect(validatePositiveInteger('1')).toBe(false);
    expect(validatePositiveInteger(null)).toBe(false);
    expect(validatePositiveInteger(undefined)).toBe(false);
  });

  it('should respect min/max constraints', () => {
    expect(validatePositiveInteger(5, 1, 10)).toBe(true);
    expect(validatePositiveInteger(1, 5, 10)).toBe(false); // Below min
    expect(validatePositiveInteger(15, 1, 10)).toBe(false); // Above max
  });
});

describe('validateBoolean', () => {
  it('should accept boolean values', () => {
    expect(validateBoolean(true)).toBe(true);
    expect(validateBoolean(false)).toBe(true);
  });

  it('should reject non-boolean values', () => {
    expect(validateBoolean(1)).toBe(false);
    expect(validateBoolean(0)).toBe(false);
    expect(validateBoolean('true')).toBe(false);
    expect(validateBoolean('false')).toBe(false);
    expect(validateBoolean(null)).toBe(false);
    expect(validateBoolean(undefined)).toBe(false);
  });
});

describe('validateNonEmptyString', () => {
  it('should accept non-empty strings', () => {
    expect(validateNonEmptyString('hello')).toBe(true);
    expect(validateNonEmptyString('a')).toBe(true);
    expect(validateNonEmptyString('hello world')).toBe(true);
  });

  it('should reject empty or whitespace-only strings', () => {
    expect(validateNonEmptyString('')).toBe(false);
    expect(validateNonEmptyString('   ')).toBe(false);
    expect(validateNonEmptyString('\t\n')).toBe(false);
  });

  it('should reject non-strings', () => {
    expect(validateNonEmptyString(null)).toBe(false);
    expect(validateNonEmptyString(undefined)).toBe(false);
    expect(validateNonEmptyString(123)).toBe(false);
    expect(validateNonEmptyString({})).toBe(false);
  });

  it('should respect maxLength constraint', () => {
    expect(validateNonEmptyString('hello', 10)).toBe(true);
    expect(validateNonEmptyString('hello', 5)).toBe(true);
    expect(validateNonEmptyString('hello', 4)).toBe(false); // Exceeds max
  });
});

describe('ValidationResult helpers', () => {
  it('validResult should return valid result', () => {
    const result = validResult();
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('invalidResult should return invalid result with error', () => {
    const result = invalidResult('Test error');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Test error');
  });
});

describe('Constants', () => {
  it('should export valid search sort types', () => {
    expect(VALID_SEARCH_SORT_TYPES).toContain('relevance');
    expect(VALID_SEARCH_SORT_TYPES).toContain('hot');
    expect(VALID_SEARCH_SORT_TYPES).toContain('top');
    expect(VALID_SEARCH_SORT_TYPES).toContain('new');
  });

  it('should export valid time ranges', () => {
    expect(VALID_TIME_RANGES).toContain('hour');
    expect(VALID_TIME_RANGES).toContain('day');
    expect(VALID_TIME_RANGES).toContain('week');
    expect(VALID_TIME_RANGES).toContain('month');
    expect(VALID_TIME_RANGES).toContain('year');
    expect(VALID_TIME_RANGES).toContain('all');
  });

  it('should export valid export formats', () => {
    expect(VALID_EXPORT_FORMATS).toContain('json');
    expect(VALID_EXPORT_FORMATS).toContain('csv');
    expect(VALID_EXPORT_FORMATS).toContain('txt');
    expect(VALID_EXPORT_FORMATS).toContain('md');
    expect(VALID_EXPORT_FORMATS).toContain('xlsx');
  });
});
