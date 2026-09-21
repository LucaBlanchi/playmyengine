import { useEffect, useState } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import { chooseMove } from "./engine"

function randomColor() {
  return Math.random() < 0.5 ? "w" : "b"
}

export default function App() {
  const [playerColor, setPlayerColor] = useState(randomColor)
  const [positions, setPositions] = useState(() => [new Chess().fen()])
  const [viewIndex, setViewIndex] = useState(0)
  const [selectedSquare, setSelectedSquare] = useState(null)

  const liveIndex = positions.length - 1
  const liveFen = positions[liveIndex]
  const visibleFen = positions[viewIndex]
  const isViewingLivePosition = viewIndex === liveIndex

  const liveGame = new Chess(liveFen)

  function makePlayerMove(sourceSquare, targetSquare) {
    if (!isViewingLivePosition) {
      return false
    }

    const game = new Chess(liveFen)

    if (game.isGameOver()) {
      return false
    }

    if (game.turn() !== playerColor) {
      return false
    }

    const piece = game.get(sourceSquare)

    if (!piece || piece.color !== playerColor) {
      return false
    }

    try {
      game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q"
      })

      const nextFen = game.fen()

      setPositions((current) => [...current, nextFen])
      setViewIndex(liveIndex + 1)
      setSelectedSquare(null)

      return true
    } catch {
      return false
    }
  }

  function handleSquareClick(square) {
    if (!isViewingLivePosition) {
      return
    }

    const game = new Chess(liveFen)

    if (game.isGameOver()) {
      return
    }

    if (game.turn() !== playerColor) {
      return
    }

    if (selectedSquare === square) {
      setSelectedSquare(null)
      return
    }

    const clickedPiece = game.get(square)

    if (selectedSquare) {
      const moved = makePlayerMove(selectedSquare, square)

      if (moved) {
        return
      }
    }

    if (clickedPiece?.color === playerColor) {
      setSelectedSquare(square)
    }
  }

  function newGame() {
    setPlayerColor(randomColor())
    setPositions([new Chess().fen()])
    setViewIndex(0)
    setSelectedSquare(null)
  }

  function previousPosition() {
    setViewIndex((current) => Math.max(0, current - 1))
    setSelectedSquare(null)
  }

  function nextPosition() {
    setViewIndex((current) => Math.min(liveIndex, current + 1))
    setSelectedSquare(null)
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setViewIndex((current) => Math.max(0, current - 1))
        setSelectedSquare(null)
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        setViewIndex((current) => Math.min(liveIndex, current + 1))
        setSelectedSquare(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [liveIndex])

  useEffect(() => {
    if (!isViewingLivePosition) {
      return
    }

    const game = new Chess(liveFen)

    if (game.isGameOver()) {
      return
    }

    if (game.turn() === playerColor) {
      return
    }

    const timer = setTimeout(() => {
      const engineGame = new Chess(liveFen)
      const selectedMove = chooseMove(liveFen)

      if (!selectedMove) {
        return
      }

      engineGame.move(selectedMove)

      const nextFen = engineGame.fen()

      setPositions((current) => [...current, nextFen])
      setViewIndex(liveIndex + 1)
      setSelectedSquare(null)
    }, 300)

    return () => clearTimeout(timer)
  }, [
    liveFen,
    liveIndex,
    playerColor,
    isViewingLivePosition
  ])

  function getSquareStyles() {
    if (!selectedSquare) {
      return {}
    }

    if (!isViewingLivePosition) {
      return {}
    }

    const game = new Chess(liveFen)

    const legalMoves = game.moves({
      square: selectedSquare,
      verbose: true
    })

    const styles = {
      [selectedSquare]: {
        background: "rgba(255, 215, 0, 0.45)"
      }
    }

    for (const move of legalMoves) {
      const targetPiece = game.get(move.to)

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
    boardOrientation: playerColor === "w" ? "white" : "black",
    onPieceDrop: ({ sourceSquare, targetSquare }) =>
      makePlayerMove(sourceSquare, targetSquare),
    onSquareClick: ({ square }) => handleSquareClick(square),
    squareStyles: getSquareStyles(),
    allowDragging:
      isViewingLivePosition &&
      !liveGame.isGameOver() &&
      liveGame.turn() === playerColor,
    animationDurationInMs: 200
  }

  return (
    <main className="app">
      <div className="game">
        <div className="board">
          <Chessboard options={boardOptions} />
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
            disabled={viewIndex === liveIndex}
            aria-label="Next position"
          >
            →
          </button>
        </div>
      </div>
    </main>
  )
}