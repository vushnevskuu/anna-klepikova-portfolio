export function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0
  }
  return ((index % length) + length) % length
}

export function stepIndex(
  current: number,
  direction: 1 | -1,
  length: number,
): number {
  return wrapIndex(current + direction, length)
}
