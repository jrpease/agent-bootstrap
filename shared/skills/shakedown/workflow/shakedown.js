export const meta = {
  name: 'shakedown',
  description: 'QA audit by a team of AI testers: per stage, a tester and a verifier per lane, then a QA lead gap pass and its verifier',
  whenToUse: 'Launched by the /shakedown skill with args from `shakedown.py render`; not for direct use',
  phases: [
    { title: 'Test', detail: 'one tester per lane' },
    { title: 'Verify', detail: 'an independent verifier reproduces every finding from its lane' },
    { title: 'Gaps', detail: 'QA lead tests the biggest gaps, and its findings are verified too' }
  ]
}

// args (from `shakedown.py render`): { product, target, prefix, models: { tester }, stages: [{ name, common, lanes: [{ key, prompt }] }] }
// Never call Date here: Workflow forbids it (it breaks resume). Dates arrive through args.

const SEVERITY = { type: 'string', enum: ['blocker', 'major', 'minor', 'cosmetic'] }

const FINDINGS = {
  type: 'object',
  properties: {
    coverage: { type: 'array', items: { type: 'string' }, description: 'what was exercised (route x profile x scenario), including what worked; the QA lead prefixes gaps it did not get to with UNTESTED:' },
    created: { type: 'array', items: { type: 'string' }, description: 'every entity created, as "type | name | URL"' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: SEVERITY,
          category: { type: 'string', enum: ['bug', 'ux', 'visual', 'responsive', 'perf', 'a11y', 'api', 'ssr-seo', 'code', 'i18n', 'security', 'permissions', 'data'] },
          area: { type: 'string' },
          url: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          profiles: { type: 'array', items: { type: 'string' } },
          steps: { type: 'string' },
          expected: { type: 'string' },
          actual: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
          suspectedCause: { type: 'string', description: 'file:line if known' }
        },
        required: ['title', 'severity', 'category', 'area', 'steps', 'expected', 'actual']
      }
    }
  },
  required: ['coverage', 'findings']
}

const VERDICTS = {
  type: 'object',
  properties: {
    created: { type: 'array', items: { type: 'string' }, description: 'every entity you created while reproducing, as "type | name | URL"' },
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          verdict: { type: 'string', enum: ['confirmed', 'not-reproduced', 'intended-behavior', 'duplicate'] },
          severity: SEVERITY,
          notes: { type: 'string', description: 'what you ran and saw; corrected details; root cause file:line' }
        },
        required: ['index', 'verdict', 'notes']
      }
    }
  },
  required: ['results']
}

const tester = args.models && args.models.tester ? { model: args.models.tester } : {}

function listFindings(findings) {
  return findings.map((f, i) => `#${i} [${f.severity}/${f.category}] ${f.title}\n  url: ${f.url || ''}\n  roles: ${(f.roles || []).join(', ')}  profiles: ${(f.profiles || []).join(', ')}\n  steps: ${f.steps}\n  expected: ${f.expected}\n  actual: ${f.actual}\n  evidence: ${(f.evidence || []).join(', ')}\n  cause: ${f.suspectedCause || ''}`).join('\n\n')
}

// Returns { findings, created }. Verifiers log their writes under their own lane name, verify-<lane>,
// so created.md can match them; the env line here overrides the one at the end of `common`.
async function verify(common, who, report, phaseName, label, laneName) {
  if (!report.findings.length) return { findings: [], created: [] }
  const verdict = await agent(`${common}\n\nFor this job use SHAKEDOWN_LANE=${laneName} (not the value above), and prefix the name of anything you create with "${args.prefix} ${laneName}".\n\nYou are the VERIFIER for ${who}. The tester reported the findings below and created these entities: ${(report.created || []).join('; ') || 'none'}. Independently try to reproduce EACH finding yourself (write your own script; don't just trust their evidence). Be skeptical: mark not-reproduced if you can't make it happen, intended-behavior if the code or product clearly means it (cite why), duplicate if it restates another finding in this list (name which). For confirmed ones, correct the severity if it was inflated or understated and add the root cause file:line if you can find it.\n\nFINDINGS:\n${listFindings(report.findings)}`, { label, phase: phaseName, schema: VERDICTS })
  const byIndex = new Map(((verdict && verdict.results) || []).map((r) => [r.index, r]))
  return {
    findings: report.findings.map((f, i) => ({ ...f, verification: byIndex.get(i) || { verdict: 'unverified', notes: 'verifier returned nothing' } })),
    created: (verdict && verdict.created) || []
  }
}

const stages = []
for (const stage of args.stages) {
  log(`${stage.name}: ${stage.lanes.length} lane(s)`)
  const results = await pipeline(
    stage.lanes,
    (lane) => agent(lane.prompt, { label: `test:${lane.key}`, phase: 'Test', schema: FINDINGS, ...tester }),
    async (report, lane) => {
      if (!report) return null
      const v = await verify(stage.common, `the "${lane.key}" lane`, report, 'Verify', `verify:${lane.key}`, `verify-${lane.key}`)
      return { lane: lane.key, coverage: report.coverage, created: report.created || [], verifierCreated: v.created, findings: v.findings.map((f) => ({ ...f, lane: lane.key })) }
    }
  )
  const lanes = stage.lanes.map((lane, i) => results[i] || { lane: lane.key, crashed: true })
  const crashed = lanes.filter((l) => l.crashed).map((l) => l.lane)
  if (crashed.length) log(`${stage.name}: lane(s) returned nothing: ${crashed.join(', ')}`)

  const summary = lanes.filter((l) => !l.crashed).map((l) => `${l.lane}: coverage=${l.coverage.length} items; created=${l.created.length}; findings=${l.findings.map((f) => `${f.title} (${f.verification.verdict})`).join(' | ') || 'none'}`).join('\n')
  const gaps = await agent(`${stage.common}\n\nYou are the QA LEAD doing a completeness pass for the ${stage.name} stage. Here is what the team covered and found:\n${summary || '(no lane returned results)'}\n${crashed.length ? `These lanes crashed and covered nothing: ${crashed.join(', ')}.\n` : ''}\nIdentify the most important untested scenarios still reachable under this stage's rules. Then TEST the top 6-10 of them yourself right now and report findings (only new ones, not repeats of the list above). In coverage, list the gaps you tested plus every remaining gap you did not get to, each prefixed 'UNTESTED:'.`, { label: `gaps:${stage.name}`, phase: 'Gaps', schema: FINDINGS })
  let gapResult = { findings: [], created: [] }
  if (gaps) gapResult = await verify(stage.common, `the QA lead's gap findings in the ${stage.name} stage`, gaps, 'Gaps', `verify:gaps-${stage.name}`, `verify-gaps-${stage.name}`)
  stages.push({ name: stage.name, lanes, gaps: gaps ? { coverage: gaps.coverage, created: gaps.created || [], verifierCreated: gapResult.created, findings: gapResult.findings.map((f) => ({ ...f, lane: `gaps-${stage.name}` })) } : null })
}

return { product: args.product, target: args.target, prefix: args.prefix, stages }
