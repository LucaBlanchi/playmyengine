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

function findBestHangingCapture(game, moves) {
  const capturePriority = ["q", "r", "b", "n", "p"]

  const opponentColor = game.turn() === "w" ? "b" : "w"

  const hangingCaptures = moves.filter((move) => {
    if (!move.captured) {
      return false
    }

    return game.attackers(move.to, opponentColor).length === 0
  })

  if (hangingCaptures.length === 0) {
    return null
  }

  const bestCapturedPiece = capturePriority.find((piece) =>
    hangingCaptures.some((move) => move.captured === piece)
  )

  const bestCaptures = hangingCaptures.filter(
    (move) => move.captured === bestCapturedPiece
  )

  return toMove(
    bestCaptures[
      Math.floor(Math.random() * bestCaptures.length)
    ]
  )
}

function findBestCapture(moves) {

  const captures = moves.filter(
    (move) =>
      move.captured &&
      pieceValue[move.piece] <= pieceValue[move.captured]
  )

  if (captures.length === 0) {
    return null
  }

  const bestDifference = Math.max(
    ...captures.map(
      (move) =>
        pieceValue[move.captured] - pieceValue[move.piece]
    )
  )

  const bestCaptures = captures.filter(
    (move) =>
      pieceValue[move.captured] - pieceValue[move.piece] ===
      bestDifference
  )

  return toMove(
    bestCaptures[
      Math.floor(Math.random() * bestCaptures.length)
    ]
  )
}

function findDontHangMaterialMove(game, moves) {

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
    const moves = game.moves({ verbose: true })

    // Play forced moves
    const forcedMove = findForcedMove(moves)
    if (forcedMove) return forcedMove

    // Play mate in 1
    const mateMove = findMateInOne(game, moves)
    if (mateMove) return mateMove

    // Capture hanging pieces
    const hangingCapture = findBestHangingCapture(game, moves)
    if (hangingCapture) return hangingCapture

    // Capture if the material trade is not bad
    const captureMove = findBestCapture(moves)
    if (captureMove) return captureMove

    // Play a move that avoids losing material from having a piece captured
    const safeMove = findDontHangMaterialMove(game, moves)
    if (safeMove) return safeMove

    // Just play a move
    return findRandomMove(moves)
  }

  return {
    chooseMove
  }
}