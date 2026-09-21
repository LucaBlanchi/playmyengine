import { useEffect, useState } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import { createEngine } from "./engine"

function randomColor() {
  return Math.random() < 0.5 ? "w" : "b"
}

function oppositeColor(color) {
  return color === "w" ? "b" : "w"
}

function createGame(startingFen = new Chess().fen()) {
  const playerColor = randomColor()
  const engineColor = oppositeColor(playerColor)

  const engine = createEngine({
    startingFen,
    color: engineColor
  })

  return {
    startingFen,
    playerColor,
    engineColor,
    engine,
    positions: [startingFen],
    moves: []
  }
}

function rebuildGame(startingFen, moves) {
  const game = new Chess(startingFen)

  for (const move of moves) {
    game.move(move)
  }

  return game
}

function getGameResult(game) {
  if (!game.isGameOver()) {
    return null
  }

  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "Black" : "White"

    return `${winner} wins by checkmate`
  }

  if (game.isStalemate()) {
    return "Draw by stalemate"
  }

  if (game.isInsufficientMaterial()) {
    return "Draw by insufficient material"
  }

  if (game.isThreefoldRepetition()) {
    return "Draw by threefold repetition"
  }

  if (game.isDrawByFiftyMoves()) {
    return "Draw by fifty-move rule"
  }

  if (game.isDraw()) {
    return "Draw"
  }

  return "Game over"
}

export default function App() {
  const [session, setSession] = useState(createGame)

  const [viewIndex, setViewIndex] = useState(0)

  const [selectedSquare, setSelectedSquare] =
    useState(null)

  const [pendingPromotion, setPendingPromotion] =
    useState(null)

  const [pendingEngineMove, setPendingEngineMove] =
    useState(null)

  const liveIndex = session.positions.length - 1
  const visibleFen = session.positions[viewIndex]
  const isViewingLivePosition =
    viewIndex === liveIndex

  const liveGame = rebuildGame(
    session.startingFen,
    session.moves
  )

  const result = getGameResult(liveGame)

  useEffect(() => {
    if (session.moves.length !== 0) {
      return
    }

    const game = new Chess(session.startingFen)

    if (game.turn() !== session.engineColor) {
      return
    }

    const timer = setTimeout(() => {
      const engineMove = session.engine.start()

      if (engineMove) {
        setPendingEngineMove(engineMove)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [
    session.engine,
    session.engineColor,
    session.moves.length,
    session.startingFen
  ])

  useEffect(() => {
    if (!pendingEngineMove) {
      return
    }

    const timer = setTimeout(() => {
      const game = rebuildGame(
        session.startingFen,
        session.moves
      )

      game.move(pendingEngineMove)

      const nextPositions = [
        ...session.positions,
        game.fen()
      ]

      const nextMoves = [
        ...session.moves,
        pendingEngineMove
      ]

      setSession((current) => ({
        ...current,
        positions: nextPositions,
        moves: nextMoves
      }))

      setViewIndex(nextPositions.length - 1)
      setSelectedSquare(null)
      setPendingEngineMove(null)
    }, 300)

    return () => clearTimeout(timer)
  }, [
    pendingEngineMove,
    session.moves,
    session.positions,
    session.startingFen
  ])

  function commitPlayerMove(
    from,
    to,
    promotion
  ) {
    if (!isViewingLivePosition) {
      return false
    }

    if (pendingEngineMove) {
      return false
    }

    const game = rebuildGame(
      session.startingFen,
      session.moves
    )

    if (game.isGameOver()) {
      return false
    }

    if (game.turn() !== session.playerColor) {
      return false
    }

    const playerMove = {
      from,
      to,
      ...(promotion
        ? { promotion }
        : {})
    }

    try {
      game.move(playerMove)
    } catch {
      return false
    }

    const nextPositions = [
      ...session.positions,
      game.fen()
    ]

    const nextMoves = [
      ...session.moves,
      playerMove
    ]

    setSession((current) => ({
      ...current,
      positions: nextPositions,
      moves: nextMoves
    }))

    setViewIndex(nextPositions.length - 1)
    setSelectedSquare(null)
    setPendingPromotion(null)

    if (!game.isGameOver()) {
      const engineMove =
        session.engine.respondToMove(
          playerMove
        )

      if (engineMove) {
        setPendingEngineMove(engineMove)
      }
    }

    return true
  }

  function requestPlayerMove(from, to) {
    if (!isViewingLivePosition) {
      return "illegal"
    }

    if (pendingEngineMove) {
      return "illegal"
    }

    const game = rebuildGame(
      session.startingFen,
      session.moves
    )

    if (game.isGameOver()) {
      return "illegal"
    }

    if (game.turn() !== session.playerColor) {
      return "illegal"
    }

    const piece = game.get(from)

    if (
      !piece ||
      piece.color !== session.playerColor
    ) {
      return "illegal"
    }

    const matchingMoves = game
      .moves({
        square: from,
        verbose: true
      })
      .filter((move) => move.to === to)

    if (matchingMoves.length === 0) {
      return "illegal"
    }

    const isPromotion =
      matchingMoves.some(
        (move) => move.promotion
      )

    if (isPromotion) {
      setPendingPromotion({
        from,
        to
      })

      return "promotion"
    }

    const moved = commitPlayerMove(
      from,
      to
    )

    return moved
      ? "moved"
      : "illegal"
  }

  function handleSquareClick(square) {
    if (pendingPromotion) {
      return
    }

    if (pendingEngineMove) {
      return
    }

    if (!isViewingLivePosition) {
      return
    }

    const game = rebuildGame(
      session.startingFen,
      session.moves
    )

    if (game.isGameOver()) {
      return
    }

    if (game.turn() !== session.playerColor) {
      return
    }

    if (selectedSquare === square) {
      setSelectedSquare(null)
      return
    }

    const clickedPiece = game.get(square)

    if (selectedSquare) {
      const moveResult =
        requestPlayerMove(
          selectedSquare,
          square
        )

      if (moveResult !== "illegal") {
        return
      }
    }

    if (
      clickedPiece?.color ===
      session.playerColor
    ) {
      setSelectedSquare(square)
    } else {
      setSelectedSquare(null)
    }
  }

  function newGame() {
    const nextSession = createGame()

    setSession(nextSession)
    setViewIndex(0)
    setSelectedSquare(null)
    setPendingPromotion(null)
    setPendingEngineMove(null)
  }

  function previousPosition() {
    setViewIndex((current) =>
      Math.max(0, current - 1)
    )

    setSelectedSquare(null)
    setPendingPromotion(null)
  }

  function nextPosition() {
    setViewIndex((current) =>
      Math.min(
        session.positions.length - 1,
        current + 1
      )
    )

    setSelectedSquare(null)
    setPendingPromotion(null)
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (pendingPromotion) {
        if (event.key === "Escape") {
          setPendingPromotion(null)
        }

        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()

        setViewIndex((current) =>
          Math.max(0, current - 1)
        )

        setSelectedSquare(null)
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()

        setViewIndex((current) =>
          Math.min(
            session.positions.length - 1,
            current + 1
          )
        )

        setSelectedSquare(null)
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    )

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      )
    }
  }, [
    pendingPromotion,
    session.positions.length
  ])

  function getSquareStyles() {
    if (!selectedSquare) {
      return {}
    }

    if (!isViewingLivePosition) {
      return {}
    }

    if (pendingEngineMove) {
      return {}
    }

    const game = rebuildGame(
      session.startingFen,
      session.moves
    )

    const legalMoves = game.moves({
      square: selectedSquare,
      verbose: true
    })

    const styles = {
      [selectedSquare]: {
        background:
          "rgba(255, 215, 0, 0.45)"
      }
    }

    for (const move of legalMoves) {
      const targetPiece =
        game.get(move.to)

      styles[move.to] = targetPiece
        ? {
            background:
              "radial-gradient(circle, transparent 55%, rgba(0, 0, 0, 0.22) 57%, rgba(0, 0, 0, 0.22) 68%, transparent 70%)"
          }
        : {
            background:
              "radial-gradient(circle, rgba(0, 0, 0, 0.22) 18%, transparent 20%)"
          }
    }

    return styles
  }

  const boardOptions = {
    position: visibleFen,

    boardOrientation:
      session.playerColor === "w"
        ? "white"
        : "black",

    onPieceDrop: ({
      sourceSquare,
      targetSquare
    }) => {
      const moveResult =
        requestPlayerMove(
          sourceSquare,
          targetSquare
        )

      return moveResult === "moved"
    },

    onSquareClick: ({ square }) => {
      handleSquareClick(square)
    },

    squareStyles:
      getSquareStyles(),

    allowDragging:
      isViewingLivePosition &&
      !liveGame.isGameOver() &&
      liveGame.turn() ===
        session.playerColor &&
      !pendingPromotion &&
      !pendingEngineMove,

    animationDurationInMs: 300
  }

  const promotionPieces =
    session.playerColor === "w"
      ? {
          q: "♕",
          r: "♖",
          b: "♗",
          n: "♘"
        }
      : {
          q: "♛",
          r: "♜",
          b: "♝",
          n: "♞"
        }

  return (
    <main className="app">
      <div className="game">
        <div className="board">
          <Chessboard
            options={boardOptions}
          />

          {pendingPromotion && (
            <div
              className="promotion-overlay"
              onClick={() =>
                setPendingPromotion(null)
              }
            >
              <div
                className="promotion-picker"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                {[
                  ["q", "Queen"],
                  ["r", "Rook"],
                  ["b", "Bishop"],
                  ["n", "Knight"]
                ].map(
                  ([piece, label]) => (
                    <button
                      key={piece}
                      aria-label={label}
                      onClick={() =>
                        commitPlayerMove(
                          pendingPromotion.from,
                          pendingPromotion.to,
                          piece
                        )
                      }
                    >
                      {
                        promotionPieces[
                          piece
                        ]
                      }
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className="controls">
          <button
            onClick={previousPosition}
            disabled={viewIndex === 0}
            aria-label="Previous position"
          >
            ←
          </button>

          <button
            className="new-game"
            onClick={newGame}
          >
            New game
          </button>

          <button
            onClick={nextPosition}
            disabled={
              viewIndex ===
              session.positions.length - 1
            }
            aria-label="Next position"
          >
            →
          </button>
        </div>

        {result && (
          <div className="result">
            {result}
          </div>
        )}
      </div>
    </main>
  )
}