import { readEnvironment } from '../src/config/environment.js';
import { GeminiProvider } from '../src/modules/ai/providers/gemini.provider.js';
import { ApiError } from '../src/utils/api-error.js';

try {
  const env = readEnvironment();
  // A real, synthetic request: no employee or company data leaves the process.
  const result = await new GeminiProvider({ ...env, NODE_ENV: 'production' })
    .extractStructuredLeave('kal tabiyat kharab hai, ek din sick leave chahiye',
      '2026-10-27', 'Asia/Karachi', ['sick', 'casual', 'annual']);
  if (result.type !== 'sick' || result.start !== '2026-10-28' || result.end !== '2026-10-28') {
    throw new Error('Unexpected structured response');
  }
  console.log('Gemini: real Roman Urdu structured leave response verified.');
} catch (error) {
  console.error('Gemini check failed:', error instanceof ApiError ? error.code : 'CONFIGURATION_OR_RESPONSE_ERROR');
  process.exitCode = 1;
}
