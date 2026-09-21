function toMove(move) {
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion
  }
}

const pieceValue = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9
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

function findBestCapture(game, moves) {
  const captures = moves.filter((move) => move.captured)

  const evaluatedCaptures = captures
    .map((move) => {
      const capturedValue = pieceValue[move.captured]
      const capturingValue =
        pieceValue[move.promotion ?? move.piece]

      game.move(move)

      const canBeRecaptured = game
        .moves({ verbose: true })
        .some(
          (reply) =>
            reply.captured &&
            reply.to === move.to
        )

      game.undo()

      const materialGain = canBeRecaptured
        ? capturedValue - capturingValue
        : capturedValue

      return {
        move,
        materialGain
      }
    })
    .filter(({ materialGain }) => materialGain >= 0)

  if (evaluatedCaptures.length === 0) {
    return null
  }

  const bestGain = Math.max(
    ...evaluatedCaptures.map(
      ({ materialGain }) => materialGain
    )
  )

  const bestCaptures = evaluatedCaptures.filter(
    ({ materialGain }) => materialGain === bestGain
  )

  const selected =
    bestCaptures[
      Math.floor(Math.random() * bestCaptures.length)
    ]

  return toMove(selected.move)
}

function filterMovesAvoidingMateInOne(game, moves) {
  return moves.filter((move) => {
    game.move(move)

    const opponentMoves = game.moves({ verbose: true })

    const allowsMateInOne = opponentMoves.some((opponentMove) => {
      game.move(opponentMove)

      const isMate = game.isCheckmate()

      game.undo()

      return isMate
    })

    game.undo()

    return !allowsMateInOne
  })
}

function findMovesThatDontHangMaterial(game, moves) {
  function getCaptureLoss(game, capture) {
    const capturedValue = pieceValue[capture.captured]
    const attackerValue =
      pieceValue[capture.promotion ?? capture.piece]

    game.move(capture)

    const canRecapture = game
      .moves({ verbose: true })
      .some(
        (move) =>
          move.to === capture.to &&
          move.captured
      )

    game.undo()

    if (!canRecapture) {
      return capturedValue
    }

    return Math.max(
      0,
      capturedValue - attackerValue
    )
  }

  function getWorstMaterialLoss(game, move) {
    game.move(move)

    const opponentCaptures = game
      .moves({ verbose: true })
      .filter((move) => move.captured)

    let worstLoss = 0

    for (const capture of opponentCaptures) {
      worstLoss = Math.max(
        worstLoss,
        getCaptureLoss(game, capture)
      )
    }

    game.undo()

    return worstLoss
  }

  if (moves.length === 0) {
    return null
  }

  const evaluatedMoves = moves.map((move) => ({
    move,
    loss: getWorstMaterialLoss(game, move)
  }))

  const minimumLoss = Math.min(
    ...evaluatedMoves.map(({ loss }) => loss)
  )

  const bestMoves = evaluatedMoves.filter(
    ({ loss }) => loss === minimumLoss
  )

  const selected =
    bestMoves[
      Math.floor(Math.random() * bestMoves.length)
    ]

  return toMove(selected.move)
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
    let moves = game.moves({ verbose: true })

    // Play forced moves
    const forcedMove = findForcedMove(moves)
    if (forcedMove) return forcedMove

    // Play mate in 1
    const mateMove = findMateInOne(game, moves)
    if (mateMove) return mateMove

    // Avoid moves that hang mate in 1
    const safeMoves = filterMovesAvoidingMateInOne(game, moves)
    if (safeMoves.length === 0) {
      return findRandomMove(moves)
    }
    moves = safeMoves

    // Capture if the material trade is not bad
    const captureMove = findBestCapture(game, moves)
    if (captureMove) return captureMove

    // Play a move that avoids losing material from having a piece captured
    const safeMove = findMovesThatDontHangMaterial(game, moves)
    if (safeMove) return safeMove

    // Just play a move
    return findRandomMove(moves)
  }

  return {
    chooseMove
  }
}