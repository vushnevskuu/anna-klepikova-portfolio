export function createShuffledDeck(length: number, avoidFirst?: number): number[] {
  if (length <= 0) {
    return []
  }

  const deck = Array.from({ length }, (_, index) => index)

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]]
  }

  if (
    avoidFirst !== undefined &&
    deck[0] === avoidFirst &&
    length > 1
  ) {
    const swapIndex = 1 + Math.floor(Math.random() * (length - 1))
    ;[deck[0], deck[swapIndex]] = [deck[swapIndex], deck[0]]
  }

  return deck
}

type DeckSnapshot = {
  deck: number[]
  position: number
}

export type ShuffledGalleryNavigation = {
  getCurrentIndex: () => number
  step: (direction: 1 | -1) => number
  getPreloadIndices: (distance: number) => number[]
}

export function createShuffledGalleryNavigation(
  length: number,
): ShuffledGalleryNavigation {
  if (length <= 0) {
    return {
      getCurrentIndex: () => 0,
      step: () => 0,
      getPreloadIndices: () => [],
    }
  }

  if (length === 1) {
    return {
      getCurrentIndex: () => 0,
      step: () => 0,
      getPreloadIndices: () => [0],
    }
  }

  let deck = createShuffledDeck(length)
  let position = 0

  const pastDecks: DeckSnapshot[] = []

  const getCurrentIndex = () => deck[position]

  const step = (direction: 1 | -1): number => {
    if (direction === 1) {
      if (position < deck.length - 1) {
        position += 1
      } else {
        const lastIndex = deck[position]
        pastDecks.push({ deck, position })
        deck = createShuffledDeck(length, lastIndex)
        position = 0
      }
    } else if (position > 0) {
      position -= 1
    } else if (pastDecks.length > 0) {
      const previous = pastDecks.pop()
      if (previous) {
        deck = previous.deck
        position = previous.position
      }
    } else {
      const firstIndex = deck[0]
      deck = createShuffledDeck(length, firstIndex)
      position = deck.length - 1
    }

    return deck[position]
  }

  const getPreloadIndices = (distance: number): number[] => {
    const indices = new Set<number>()

    for (let offset = -distance; offset <= distance; offset += 1) {
      const targetPosition = position + offset
      if (targetPosition >= 0 && targetPosition < deck.length) {
        indices.add(deck[targetPosition])
      }
    }

    indices.add(deck[position])
    return [...indices]
  }

  return {
    getCurrentIndex,
    step,
    getPreloadIndices,
  }
}
