import { parseArgs } from 'node:util'

export function parse(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      model:     { type: 'string' },
      out:       { type: 'string' },
      ratio:     { type: 'string', default: '16:9' },
      seconds:   { type: 'string', default: '8' },
      fps:       { type: 'string', default: '30' },
      frames:    { type: 'boolean', default: false },
      cutout:    { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      version:   { type: 'boolean', default: false },
    },
  })
  const [command, prompt] = positionals
  return {
    command,
    prompt,
    model: values.model,
    out: values.out,
    ratio: values.ratio,
    seconds: Number(values.seconds),
    fps: Number(values.fps),
    frames: values.frames,
    cutout: values.cutout,
    dryRun: values['dry-run'],
    version: values.version,
  }
}
