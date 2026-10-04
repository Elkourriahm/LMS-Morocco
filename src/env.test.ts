import { describe, expect, it } from 'vitest';
import { envSchema } from './env';

describe('envSchema', () => {
  it('rejects a missing required APP_ENV', () => {
    expect(() => envSchema.parse({})).toThrow();
  });

  it('accepts a valid environment and supplies the app name default', () => {
    expect(envSchema.parse({ APP_ENV: 'test' })).toEqual({
      APP_ENV: 'test',
      NEXT_PUBLIC_APP_NAME: 'LMS Maroc',
    });
  });
});
