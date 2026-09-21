function toMove(move) {
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion
  }
}

function findForcedMove(moves) {
  if (moves.length !== 1) {
    return null
  }

  return toMove(moves[0])
}

function findMateInOne(game, moves) {
  for (const move of moves) {
    game.move(move)
    const isMate = game.isCheckmate()
    game.undo()

    if (isMate) {
      return toMove(move)
    }
  }

  return null
}

function findBestCapture(moves) {
  const pieceCapturePriority = {
    q: 5,
    r: 4,
    b: 3,
    n: 2,
    p: 1
  }

  const captures = moves.filter((move) => move.captured)

  if (captures.length === 0) {
    return null
  }

  const bestValue = Math.max(
    ...captures.map(
      (move) => pieceCapturePriority[move.captured]
    )
  )

  const bestCaptures = captures.filter(
    (move) =>
      pieceCapturePriority[move.captured] === bestValue
  )

  const move =
    bestCaptures[
      Math.floor(Math.random() * bestCaptures.length)
    ]

  return toMove(move)
}

function findRandomMove(moves) {
  if (moves.length === 0) {
    return null
  }

  const move =
    moves[Math.floor(Math.random() * moves.length)]

  return toMove(move)
}

export function createEngineStrategy() {
  const state = {}

  function chooseMove(game) {
    const moves = game.moves({ verbose: true })

    // Play forced moves
    const forcedMove = findForcedMove(moves)
    if (forcedMove) return forcedMove

    // Play mate in 1
    const mateMove = findMateInOne(game, moves)
    if (mateMove) return mateMove

    // Play capture if available
    const captureMove = findBestCapture(moves)
    if (captureMove) return captureMove

    // Just play a move
    return findRandomMove(moves)
  }

  return {
    chooseMove
  }
}