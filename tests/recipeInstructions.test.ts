import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  htmlToText,
  recipeSchemaToText,
} from '../server/features/recipes/recipeUrlImport.service'
import {
  formatRecipeInstruction,
  splitImportedRecipeSteps,
  splitInstructionBlocks,
} from '../shared/utils/recipeInstructions'

const tofu = 'Prepare the tofu • Cut the tofu into 2cm cubes • Put the soy sauce and 1 tablespoon of the oil in a bowl and mix • Tip the cornflour into a separate bowl and season with salt and pepper • Add the tofu chunks to the soy mixture and toss, then dip and roll in the cornflour to coat the pieces • Spread out on the lined baking tray • Bake in the oven for 15 minutes • Chop all but one of the spring onions into 3cm lengths • When the tofu has been cooking for 5 minutes, take the tray out of the oven and arrange the spring onions around the tofu • Drizzle with 1 tablespoon of the oil • Return to the oven to cook for the remaining 10 minutes, until the tofu is crisp and the spring onions are softened'

describe('recipe instruction formatting', () => {
  it('separates the supplied tofu bullets without losing or rewriting instructions', () => {
    const blocks = splitInstructionBlocks(tofu)

    expect(blocks).toHaveLength(11)
    expect(blocks[0]).toBe('Prepare the tofu')
    expect(blocks[1]).toBe('Cut the tofu into 2cm cubes')
    expect(blocks[4]).toBe('Add the tofu chunks to the soy mixture and toss, then dip and roll in the cornflour to coat the pieces')
    expect(blocks.join(' • ')).toBe(tofu)
  })

  it('splits numbered and dashed list lines but not decimals or ordinary sentences', () => {
    expect(splitInstructionBlocks('1. Add 1.5 tbsp oil. Stir well.\n2. Bake for 10–15 minutes.')).toEqual([
      'Add 1.5 tbsp oil. Stir well.',
      'Bake for 10–15 minutes.',
    ])
    expect(splitInstructionBlocks('- Chop the onions.\n- Fry them.')).toEqual([
      'Chop the onions.',
      'Fry them.',
    ])
    expect(splitInstructionBlocks('Add oil and stir, then fry. Serve hot.')).toEqual([
      'Add oil and stir, then fry. Serve hot.',
    ])
  })

  it('handles missing spaces around bullets and HTML bullet entities', () => {
    expect(splitInstructionBlocks('Chop•Fry &bull;Serve')).toEqual([
      'Chop',
      'Fry',
      'Serve',
    ])
  })

  it('makes existing steps readable without changing their number or timers', () => {
    const formatted = formatRecipeInstruction(tofu)

    expect(formatted).toContain('Prepare the tofu\n\nCut the tofu')
    expect(formatRecipeInstruction(formatted)).toBe(formatted)
  })

  it('splits imported steps and keeps the original timer on its matching instruction', () => {
    const steps = splitImportedRecipeSteps([
      {
        durationSeconds: 900,
        instruction: tofu,
        type: 'timer',
      },
    ])

    expect(steps).toHaveLength(11)
    expect(steps.filter((step) => step.type === 'timer')).toEqual([
      {
        durationSeconds: 900,
        instruction: 'Bake in the oven for 15 minutes',
        type: 'timer',
      },
    ])
    expect(splitImportedRecipeSteps(steps)).toEqual(steps)
  })

  it('preserves ambiguous timers as a single step with readable paragraphs', () => {
    const steps = splitImportedRecipeSteps([
      {
        durationSeconds: 600,
        instruction: 'Bake for 10 minutes • Rest for 10 minutes',
        type: 'timer',
      },
    ])

    expect(steps).toEqual([
      {
        durationSeconds: 600,
        instruction: 'Bake for 10 minutes\n\nRest for 10 minutes',
        type: 'timer',
      },
    ])
  })

  it('rejoins OCR-wrapped continuations and timer-only fragments', () => {
    expect(splitImportedRecipeSteps([
      {
        durationSeconds: null,
        instruction: 'Crush garlic and add to yoghurt with',
        type: 'normal',
      },
      {
        durationSeconds: null,
        instruction: 'spice mix and salt',
        type: 'normal',
      },
      {
        durationSeconds: null,
        instruction: 'Cook mushrooms with white onion,',
        type: 'normal',
      },
      {
        durationSeconds: 480,
        instruction: '1 tbsp balsamic for 6–8 mins',
        type: 'timer',
      },
    ])).toEqual([
      {
        durationSeconds: null,
        instruction: 'Crush garlic and add to yoghurt with spice mix and salt',
        type: 'normal',
      },
      {
        durationSeconds: 480,
        instruction: 'Cook mushrooms with white onion, 1 tbsp balsamic for 6–8 mins',
        type: 'timer',
      },
    ])
  })
})

describe('recipe source structure', () => {
  it('preserves HTML paragraphs and list boundaries while removing scripts', () => {
    const text = htmlToText('<p>Prepare the tofu</p><ul><li>Cut into cubes.</li><li>Bake.</li></ul><script>ignore()</script>')

    expect(splitInstructionBlocks(text)).toEqual([
      'Prepare the tofu',
      'Cut into cubes.',
      'Bake.',
    ])
    expect(text).not.toContain('ignore()')
  })

  it('retains the instructions inside named structured recipe sections', () => {
    const data = {
      'name': 'Tofu',
      '@type': 'Recipe',
      'recipeInstructions': {
        'name': 'Prepare the tofu',
        '@type': 'HowToSection',
        'itemListElement': [
          {
            '@type': 'HowToStep',
            'text': 'Cut the tofu.',
          },
          {
            '@type': 'HowToStep',
            'text': 'Bake the tofu.',
          },
        ],
      },
    }
    const text = recipeSchemaToText(`<script type="application/ld+json">${JSON.stringify(data)}</script>`)

    expect(text).toContain('Prepare the tofu')
    expect(text).toContain('Cut the tofu.')
    expect(text).toContain('Bake the tofu.')
  })
})
