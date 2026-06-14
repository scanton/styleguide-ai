export const promptTypes = [
  { label: 'Modern / Detailed', value: 'modern' },
  { label: 'Flux', value: 'flux' },
  { label: 'SDXL / SD1.5', value: 'sdxl' },
  { label: 'Midjourney', value: 'midjourney' },
  { label: 'Tag (Pony / Illustrious)', value: 'tag' },
  { label: 'Dall-3 (substitute copyright)', value: 'censor' },
  { label: 'PGv3 (very descriptive)', value: 'v3' },
  { label: 'Greeting Card', value: 'greeting_card' },
] as const;

export type PromptTypeValue = (typeof promptTypes)[number]['value'];

export const llmModels = [
  { label: 'GPT-OSS-20b', value: 'openai/gpt-oss-20b:free' },
  { label: 'Venice: Uncensored', value: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free' },
  { label: 'DeepSeek', value: 'deepseek/deepseek-chat-v3-0324:free' },
  { label: 'Reka (reasoning)', value: 'rekaai/reka-flash-3:free' },
  { label: 'Qwen (vision)', value: 'qwen/qwen-vl-plus:free' },
  { label: 'Mistral', value: 'mistralai/mistral-small-24b-instruct-2501:free' },
  { label: 'Llama (vision)', value: 'meta-llama/llama-3.2-11b-vision-instruct:free' },
  { label: 'Dolphin', value: 'cognitivecomputations/dolphin3.0-mistral-24b:free' },
  { label: 'Open Chat', value: 'openchat/openchat-7b:free' },
] as const;

export type LLMModelValue = (typeof llmModels)[number]['value'];

export const TRIPLE_COUNT = 3;
