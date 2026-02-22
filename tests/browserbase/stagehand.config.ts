import { V3Options } from '@browserbasehq/stagehand';
import dotenv from 'dotenv';

dotenv.config();

const StagehandConfig: V3Options = {
  verbose: 1 /* Verbosity level for logging: 0 = silent, 1 = info, 2 = all */,
  model: {
    modelName: 'google/gemini-2.5-flash',
    apiKey: process.env.GOOGLE_API_KEY,
  },
  env: 'BROWSERBASE',
  browserbaseOptions: {
    apiKey: process.env.BROWSERBASE_API_KEY,
    // projectId is optional - Browserbase will use default project if not specified
    ...(process.env.BROWSERBASE_PROJECT_ID && { projectId: process.env.BROWSERBASE_PROJECT_ID }),
  },
  localBrowserLaunchOptions: {
    viewport: {
      width: 1024,
      height: 768,
    },
  },
};

export default StagehandConfig;
