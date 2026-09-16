/** Split explicit list markers and paragraphs, never sentences or cooking clauses. */
export function splitInstructionBlocks(instruction: string): string[] {
  return instruction
    .replace(/\r\n?/g, '\n')
    .replace(/&bull;|&#8226;|&#x2022;/gi, '•')
    .replace(/[•●▪◦]/g, '\n\n')
    .replace(/^[\t ]*(?:[-*]|\d+[.)])[\t ]+/gm, '\n\n')
    .split(/\n[\t ]*\n/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export function formatRecipeInstruction(instruction: string): string {
  return splitInstructionBlocks(instruction).join('\n\n')
}

interface ImportStep {
  durationSeconds: number | null
  instruction: string
  type: 'normal' | 'timer'
}

function mentionsDuration(instruction: string, seconds: number) {
  return [
    ...instruction.matchAll(/\b(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi),
  ]
    .some((match) => {
      const unit = match[2]!.toLowerCase()
      const multipliers: Record<string, number> = {
        h: 3600,
        m: 60,
        s: 1,
      }
      const multiplier = multipliers[unit[0]!] || 1

      return Number(match[1]) * multiplier === seconds
    })
}

function endsWithContinuation(instruction: string) {
  return /(?:[,;:]|\b(?:with|and|or|to|the|a|an))\s*$/i.test(instruction)
}

function isStandaloneMeasurement(instruction: string) {
  return /^\s*[\d½¼¾]/.test(instruction)
}

/** Rejoin OCR-wrapped instruction fragments without rewriting their wording. */
function mergeInstructionFragments(steps: ImportStep[]): ImportStep[] {
  return steps.reduce<ImportStep[]>((merged, step) => {
    const previous = merged.at(-1)
    const continuesPrevious = previous && (endsWithContinuation(previous.instruction)
      || (step.type === 'timer' && isStandaloneMeasurement(step.instruction)))

    if (!continuesPrevious) {
      merged.push(step)

      return merged
    }

    previous.instruction = `${previous.instruction.trim()} ${step.instruction.trim()}`

    if (step.type === 'timer' && step.durationSeconds !== null) {
      previous.type = 'timer'
      previous.durationSeconds = step.durationSeconds
    }

    return merged
  }, [])
}

export function splitImportedRecipeSteps(steps: readonly ImportStep[]): ImportStep[] {
  const splitSteps = steps.flatMap((step) => {
    const blocks = splitInstructionBlocks(step.instruction)

    if (blocks.length < 2) {
      return [
        {
          ...step,
          instruction: blocks[0] || step.instruction,
        },
      ]
    }
    let timerIndex = -1

    if (step.type === 'timer' && step.durationSeconds !== null) {
      const candidates = blocks.flatMap((block, index) => mentionsDuration(block, step.durationSeconds!)
        ? [
            index,
          ]
        : [])

      // Preserve a timer whose exact target cannot be determined, without duplicating it.
      if (candidates.length !== 1) {
        return [
          {
            ...step,
            instruction: blocks.join('\n\n'),
          },
        ]
      }

      timerIndex = candidates[0]!
    }

    return blocks.map((instruction, index) => ({
      durationSeconds: index === timerIndex ? step.durationSeconds : null,
      instruction,
      type: index === timerIndex ? 'timer' as const : 'normal' as const,
    }))
  })

  return mergeInstructionFragments(splitSteps)
}
