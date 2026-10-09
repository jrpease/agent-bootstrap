// Dated champion table (July 2026). This object is the swap point when refreshing
// against the live leaderboards (artificialanalysis.ai/video, /image, llm-stats.com).
// Capability axes → champion:
//   text-in-image / char-consistency → gpt-image ; photoreal-hero → nano-banana
//   image-to-video / top-fidelity → seedance ; dialogue/human → veo ; budget-draft → kling
// Note: the native-audio axis (Omni Flash) is not wired — it is not a long-running
// generateVideos model, so the current geminiVideo adapter can't drive it. Follow-up.
// `magnific` is the same model via the Magnific API: an account with a magnific
// key uses it instead of fal (see video.mjs).
// Video routes also carry what the model accepts, checked before a key is read (#88, #98):
// `seconds` the allowed lengths, `ratios` the allowed --ratio values, and `imageModelId`
// the fal endpoint that takes a start frame (and an end frame). Lengths and ratios are the
// same on fal and Magnific for each model. A Magnific entry without `images` can't take
// --from, so pickProvider uses fal for it (Magnific's Kling only documents image URLs).
// Verified against each provider's API docs, 2026-10-09.
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

export const ROUTES = {
  'nano-banana': { provider: 'gemini', kind: 'image', modelId: 'gemini-3-pro-image' },
  'gpt-image':   { provider: 'openai', kind: 'image', modelId: 'gpt-image-2' },
  'seedance':    { provider: 'fal',    kind: 'video', modelId: 'bytedance/seedance-2.0/text-to-video',
                 imageModelId: 'bytedance/seedance-2.0/image-to-video',
                 seconds: range(4, 15), ratios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
                 magnific: { create: 'video/seedance-2-pro-1080p', poll: 'video/seedance-2-pro', durationAs: 'number', images: true,
                   ratios: { '21:9': 'film_horizontal_21_9', '16:9': 'widescreen_16_9', '4:3': 'classic_4_3',
                             '1:1': 'square_1_1', '3:4': 'traditional_3_4', '9:16': 'social_story_9_16' } } },
  'kling':       { provider: 'fal',    kind: 'video', modelId: 'fal-ai/kling-video/v3/standard/text-to-video',
                 imageModelId: 'fal-ai/kling-video/v3/standard/image-to-video',
                 seconds: range(3, 15), ratios: ['16:9', '9:16', '1:1'],
                 magnific: { create: 'video/kling-v3-std', poll: 'video/kling-v3', durationAs: 'string' } },
  'veo':         { provider: 'gemini', kind: 'video', modelId: 'veo-3.1-generate-preview',
                 seconds: [4, 6, 8], ratios: ['16:9', '9:16'] },
}

export function route(model) {
  const r = ROUTES[model]
  if (!r) {
    throw new Error(`Unknown --model "${model}". Known: ${Object.keys(ROUTES).join(', ')}`)
  }
  return r
}
