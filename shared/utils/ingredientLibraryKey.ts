import { splitImportedIngredientName } from './importIngredientName'

export function ingredientLibraryKey(name: string) {
  return splitImportedIngredientName(name).name.normalize('NFD').replaceAll(/[\u0300-\u036F]/g, '').toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, ' ').trim().split(' ').map((word) => {
    if (word.endsWith('ies')) {
      return `${word.slice(0, -3)}y`
    }
    if (word.endsWith('oes')) {
      return `${word.slice(0, -2)}`
    }
    if (/(?:ches|shes|sses|xes|zes)$/.test(word)) {
      return word.slice(0, -2)
    }
    if (word.endsWith('s') && !/(?:ss|us|is)$/.test(word)) {
      return word.slice(0, -1)
    }

    return word
  }).join(' ')
}
