import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const maxPageCharacters = 60_000

async function assertPublicUrl(value: string) {
  const url = new URL(value)

  if (![
    'http:',
    'https:',
  ].includes(url.protocol) || url.username || url.password) {
    throw new Error('Enter a public http(s) recipe URL.')
  }

  const host = url.hostname.toLocaleLowerCase()

  if (host === 'localhost' || host.endsWith('.local') || isPrivateAddress(host)) {
    throw new Error('The recipe URL must point to a public website.')
  }

  const addresses = await lookup(host, {
    all: true,
    verbatim: true,
  })

  if (addresses.length === 0 || addresses.some((address) => isPrivateAddress(address.address))) {
    throw new Error('The recipe URL must point to a public website.')
  }

  return url
}

function isPrivateAddress(host: string) {
  if (isIP(host) === 4) {
    const [
      first,
      second,
    ] = host.split('.').map(Number)

    return first === 10
      || first === 127
      || first === 0
      || (first === 169 && second === 254)
      || (first === 172 && Boolean(second && second >= 16 && second <= 31))
      || (first === 192 && second === 168)
  }

  return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')
}

export function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|section)>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&bull;|&#8226;|&#x2022;/gi, '•')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxPageCharacters)
}

function schemaValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function schemaList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(schemaList)
  }
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>
    const text = schemaValue(node.text) || schemaValue(node.name)

    return [
      ...(text
        ? [
            text,
          ]
        : []),
      ...schemaList(node.itemListElement),
    ]
  }
  const text = schemaValue(value)

  return text
    ? [
        text,
      ]
    : []
}

export function recipeSchemaToText(html: string) {
  const recipes: Array<Record<string, unknown>> = []
  const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)

  for (const script of scripts) {
    const attributes = script[1] || ''
    const contents = (script[2] || '').trim()

    if (!/ld\+json/i.test(attributes)) {
      continue
    }

    try {
      const parsed = JSON.parse(contents) as Array<Record<string, unknown>> | Record<string, unknown>
      let nodes: Array<Record<string, unknown>>

      if (Array.isArray(parsed)) {
        nodes = parsed
      }
      else if (Array.isArray(parsed['@graph'])) {
        nodes = parsed['@graph'] as Array<Record<string, unknown>>
      }
      else {
        nodes = [
          parsed,
        ]
      }

      recipes.push(...nodes.filter((node) => {
        const type = node['@type']

        return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
      }))
    }
    catch {
      // Some publishers include malformed JSON-LD alongside their valid recipe data.
    }
  }

  const text = recipes.map((recipe) => [
    `Recipe title: ${schemaValue(recipe.name)}`,
    `Description: ${schemaValue(recipe.description)}`,
    `Servings: ${schemaValue(recipe.recipeYield)}`,
    `Prep time: ${schemaValue(recipe.prepTime)}`,
    `Cook time: ${schemaValue(recipe.cookTime)}`,
    'Ingredients:',
    ...schemaList(recipe.recipeIngredient).map((item) => `- ${item}`),
    'Instructions:',
    ...schemaList(recipe.recipeInstructions).map((item, index) => `${index + 1}. ${htmlToText(item)}`),
  ].filter(Boolean).join('\n')).join('\n\n').trim()

  return text || null
}

export async function fetchRecipePageText(value: string) {
  let url = await assertPublicUrl(value)

  for (let redirects = 0; redirects < 4; redirects += 1) {
    const response = await fetch(url, {
      headers: {
        'accept': 'text/html,application/xhtml+xml',
        'user-agent': 'Recipe Organiser recipe importer',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual',
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')

      if (!location) {
        throw new Error('The recipe website redirected without a destination.')
      }

      url = await assertPublicUrl(new URL(location, url).toString())

      continue
    }

    if (!response.ok) {
      throw new Error(`The recipe website returned ${response.status}.`)
    }
    if (!response.headers.get('content-type')?.includes('text/html')) {
      throw new Error('That URL did not return a recipe webpage.')
    }

    const html = await response.text()
    const structuredRecipe = recipeSchemaToText(html)
    const pageText = htmlToText(html)
    const text = [
      structuredRecipe ? `Structured recipe data (use this for the ingredients and instructions when present):\n${structuredRecipe}` : '',
      `Full recipe webpage text:\n${pageText}`,
    ].filter(Boolean).join('\n\n').slice(0, maxPageCharacters)

    if (text.length < 80) {
      throw new Error('We could not find enough recipe content on that page.')
    }

    return {
      sourceName: url.hostname.replace(/^www\./, ''),
      sourceUrl: url.toString(),
      text,
    }
  }

  throw new Error('The recipe website redirected too many times.')
}
