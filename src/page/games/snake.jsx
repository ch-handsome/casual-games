import { useEffect, useRef, useState, useCallback } from 'react'

const CONFIG = {
  gridSize: 20,
  initialSpeed: 150,
  minSpeed: 80,
  speedDecrease: 5,
  foodForSpeedUp: 5,
  obstacleEvery: 5,
}

const COLORS = {
  background: '#1b1b29',
  gridLine: 'rgba(255, 255, 255, 0.05)',
  snakeHead: '#00ff88',
  snakeBody: ['#00dd77', '#00cc6a', '#00aa55', '#008844'],
  food: '#ff4444',
  foodGlow: 'rgba(255, 68, 68, 0.4)',
  obstacle: '#666666',
  obstacleBorder: '#888888',
  directionArrow: 'rgba(0, 255, 255, 0.6)',
}

const STORAGE_KEY = 'snake-best-score'

export default function SnakeGame() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [gameRunning, setGameRunning] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)

  const gameState = useRef({
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    directionLocked: false,
    food: { x: 0, y: 0 },
    obstacles: [],
    gameSpeed: CONFIG.initialSpeed,
    moveTimeout: null,
    animationFrame: null,
    mousePos: { x: 0, y: 0 },
    foodPulse: 0,
    foodPulseDir: 1,
    canvasSize: 600,
    cellSize: 30,
    isPaused: true,
  })

  const loadBestScore = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const best = saved ? parseInt(saved) : 0
    setBestScore(best)
    return best
  }, [])

  const saveBestScore = useCallback((newScore) => {
    setBestScore((prev) => {
      if (newScore > prev) {
        localStorage.setItem(STORAGE_KEY, newScore)
        return newScore
      }
      return prev
    })
  }, [])

  const spawnFood = useCallback(() => {
    const state = gameState.current
    const validPositions = []

    for (let x = 0; x < CONFIG.gridSize; x++) {
      for (let y = 0; y < CONFIG.gridSize; y++) {
        const onSnake = state.snake.some(seg => seg.x === x && seg.y === y)
        const onObstacle = state.obstacles.some(obs => obs.x === x && obs.y === y)

        if (!onSnake && !onObstacle) {
          validPositions.push({ x, y })
        }
      }
    }

    if (validPositions.length > 0) {
      const randomIndex = Math.floor(Math.random() * validPositions.length)
      state.food = validPositions[randomIndex]
    }
  }, [])

  const spawnObstacle = useCallback(() => {
    const state = gameState.current
    const validPositions = []

    for (let x = 0; x < CONFIG.gridSize; x++) {
      for (let y = 0; y < CONFIG.gridSize; y++) {
        const onSnake = state.snake.some(seg => seg.x === x && seg.y === y)
        const onObstacle = state.obstacles.some(obs => obs.x === x && obs.y === y)
        const onFood = state.food.x === x && state.food.y === y

        if (!onSnake && !onObstacle && !onFood) {
          validPositions.push({ x, y })
        }
      }
    }

    if (validPositions.length > 0) {
      const randomIndex = Math.floor(Math.random() * validPositions.length)
      state.obstacles.push(validPositions[randomIndex])
    }
  }, [])

  const resetGame = useCallback(() => {
    const state = gameState.current

    state.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ]

    state.direction = { x: 1, y: 0 }
    state.nextDirection = { x: 1, y: 0 }
    state.directionLocked = false

    state.obstacles = []
    state.gameSpeed = CONFIG.initialSpeed

    setScore(0)
    spawnFood()
    setShowGameOver(false)
  }, [spawnFood])

  const gameOver = useCallback(() => {
    const state = gameState.current
    state.gameRunning = false
    clearTimeout(state.moveTimeout)
    setFinalScore(score)
    setShowGameOver(true)
    saveBestScore(score)
  }, [score, saveBestScore])

  const moveSnake = useCallback(() => {
    const state = gameState.current

    state.direction = { ...state.nextDirection }
    state.directionLocked = false

    const head = state.snake[0]
    const newHead = {
      x: head.x + state.direction.x,
      y: head.y + state.direction.y
    }

    if (newHead.x < 0 || newHead.x >= CONFIG.gridSize ||
        newHead.y < 0 || newHead.y >= CONFIG.gridSize) {
      gameOver()
      return
    }

    if (state.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      gameOver()
      return
    }

    if (state.obstacles.some(obs => obs.x === newHead.x && obs.y === newHead.y)) {
      gameOver()
      return
    }

    state.snake.unshift(newHead)

    if (newHead.x === state.food.x && newHead.y === state.food.y) {
      const newScore = score + 1
      setScore(newScore)
      saveBestScore(newScore)

      if (newScore % CONFIG.foodForSpeedUp === 0) {
        state.gameSpeed = Math.max(CONFIG.minSpeed, state.gameSpeed - CONFIG.speedDecrease)
      }

      if (CONFIG.obstacleEvery > 0 && newScore % CONFIG.obstacleEvery === 0) {
        spawnObstacle()
      }

      spawnFood()
    } else {
      state.snake.pop()
    }
  }, [score, saveBestScore, spawnFood, spawnObstacle, gameOver])

  const scheduleMove = useCallback(() => {
    const state = gameState.current
    if (state.gameRunning && !state.isPaused) {
      state.moveTimeout = setTimeout(() => {
        moveSnake()
        scheduleMove()
      }, state.gameSpeed)
    }
  }, [moveSnake])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const state = gameState.current
    const { canvasSize, cellSize } = state

    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, canvasSize, canvasSize)

    ctx.strokeStyle = COLORS.gridLine
    ctx.lineWidth = 1

    for (let i = 0; i <= CONFIG.gridSize; i++) {
      ctx.beginPath()
      ctx.moveTo(i * cellSize, 0)
      ctx.lineTo(i * cellSize, canvasSize)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, i * cellSize)
      ctx.lineTo(canvasSize, i * cellSize)
      ctx.stroke()
    }

    state.obstacles.forEach(obs => {
      const x = obs.x * cellSize
      const y = obs.y * cellSize
      const padding = 3
      const size = cellSize - padding * 2
      const radius = 4

      ctx.fillStyle = COLORS.obstacle
      ctx.strokeStyle = COLORS.obstacleBorder
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.roundRect(x + padding, y + padding, size, size, radius)
      ctx.fill()
      ctx.stroke()
    })

    const foodX = state.food.x * cellSize + cellSize / 2
    const foodY = state.food.y * cellSize + cellSize / 2
    const maxRadius = cellSize / 2 - 4
    const baseRadius = maxRadius * 0.6
    const radius = baseRadius + state.foodPulse * (maxRadius * 0.3)

    ctx.beginPath()
    ctx.arc(foodX, foodY, radius + 6, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.foodGlow
    ctx.fill()

    ctx.beginPath()
    ctx.arc(foodX, foodY, radius, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.food
    ctx.shadowColor = COLORS.food
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0

    state.snake.forEach((segment, index) => {
      const x = segment.x * cellSize
      const y = segment.y * cellSize
      const padding = 2
      const size = cellSize - padding * 2
      const radius = 6

      if (index === 0) {
        ctx.fillStyle = COLORS.snakeHead
        ctx.shadowColor = COLORS.snakeHead
        ctx.shadowBlur = 15
      } else {
        const colorIndex = Math.min(
          Math.floor((index / state.snake.length) * COLORS.snakeBody.length),
          COLORS.snakeBody.length - 1
        )
        ctx.fillStyle = COLORS.snakeBody[colorIndex]
        ctx.shadowBlur = 0
      }

      ctx.beginPath()
      ctx.roundRect(x + padding, y + padding, size, size, radius)
      ctx.fill()
      ctx.shadowBlur = 0

      if (index === 0) {
        drawSnakeEyes(ctx, x, y, cellSize, state.direction)
      }
    })

    state.foodPulse += 0.1 * state.foodPulseDir
    if (state.foodPulse >= 1 || state.foodPulse <= 0) {
      state.foodPulseDir *= -1
    }
  }, [])

  const drawSnakeEyes = (ctx, headX, headY, cellSize, direction) => {
    const centerX = headX + cellSize / 2
    const centerY = headY + cellSize / 2
    const eyeOffset = 6
    const eyeSize = 4

    ctx.fillStyle = '#ffffff'

    if (direction.x === 1) {
      ctx.beginPath()
      ctx.arc(centerX + eyeOffset, centerY - eyeOffset, eyeSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeOffset, centerY + eyeOffset, eyeSize, 0, Math.PI * 2)
      ctx.fill()
    } else if (direction.x === -1) {
      ctx.beginPath()
      ctx.arc(centerX - eyeOffset, centerY - eyeOffset, eyeSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX - eyeOffset, centerY + eyeOffset, eyeSize, 0, Math.PI * 2)
      ctx.fill()
    } else if (direction.y === -1) {
      ctx.beginPath()
      ctx.arc(centerX - eyeOffset, centerY - eyeOffset, eyeSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeOffset, centerY - eyeOffset, eyeSize, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(centerX - eyeOffset, centerY + eyeOffset, eyeSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeOffset, centerY + eyeOffset, eyeSize, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const handleInteraction = useCallback((clientX, clientY) => {
    const state = gameState.current
    if (!state.gameRunning || state.isPaused) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const canvasX = (clientX - rect.left) * scaleX
    const canvasY = (clientY - rect.top) * scaleY

    const head = state.snake[0]
    const headCenterX = head.x * state.cellSize + state.cellSize / 2
    const headCenterY = head.y * state.cellSize + state.cellSize / 2

    const mouseGridX = Math.floor(canvasX / state.cellSize)
    const mouseGridY = Math.floor(canvasY / state.cellSize)

    const diffX = mouseGridX - head.x
    const diffY = mouseGridY - head.y

    let newDirection = { x: 0, y: 0 }

    if (Math.abs(diffX) >= Math.abs(diffY)) {
      newDirection.x = diffX > 0 ? 1 : (diffX < 0 ? -1 : 0)
      newDirection.y = 0
    } else {
      newDirection.x = 0
      newDirection.y = diffY > 0 ? 1 : (diffY < 0 ? -1 : 0)
    }

    if (newDirection.x !== 0 && newDirection.x === -state.direction.x) {
      return
    }
    if (newDirection.y !== 0 && newDirection.y === -state.direction.y) {
      return
    }

    if ((newDirection.x !== 0 || newDirection.y !== 0) && !state.directionLocked) {
      state.nextDirection = newDirection
      state.directionLocked = true
    }
  }, [])

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const containerWidth = container.clientWidth || window.innerWidth - 40
    const padding = 20
    const maxSize = Math.min(containerWidth - padding * 2, window.innerHeight - 200, 600)

    const state = gameState.current
    state.canvasSize = maxSize
    state.cellSize = maxSize / CONFIG.gridSize

    canvas.width = maxSize
    canvas.height = maxSize
  }, [])

  useEffect(() => {
    loadBestScore()
    resetGame()
    initCanvas()

    setIsPaused(true)
    setGameRunning(false)

    const state = gameState.current
    state.gameRunning = false

    let animFrame
    const render = () => {
      draw()
      animFrame = requestAnimationFrame(render)
    }
    render()

    return () => {
      clearTimeout(state.moveTimeout)
      cancelAnimationFrame(animFrame)
    }
  }, [])

  useEffect(() => {
    initCanvas()
    window.addEventListener('resize', initCanvas)
    return () => window.removeEventListener('resize', initCanvas)
  }, [initCanvas])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = gameState.current

      if (e.key === ' ') {
        e.preventDefault()
        if (!state.gameRunning) {
          state.isPaused = false
          setIsPaused(false)
          state.gameRunning = true
          setGameRunning(true)
          moveSnake()
          scheduleMove()
        } else if (state.isPaused) {
          state.isPaused = false
          setIsPaused(false)
          moveSnake()
          scheduleMove()
        } else {
          state.isPaused = true
          setIsPaused(true)
          clearTimeout(state.moveTimeout)
        }
        return
      }

      if (state.isPaused && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        if (!state.gameRunning) {
          state.gameRunning = true
          setGameRunning(true)
        }
        state.isPaused = false
        setIsPaused(false)
        moveSnake()
        scheduleMove()
        return
      }

      if (!state.gameRunning || state.isPaused) return
      if (state.directionLocked) return

      let newDir = null

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          newDir = { x: 0, y: -1 }
          break
        case 's':
        case 'arrowdown':
          newDir = { x: 0, y: 1 }
          break
        case 'a':
        case 'arrowleft':
          newDir = { x: -1, y: 0 }
          break
        case 'd':
        case 'arrowright':
          newDir = { x: 1, y: 0 }
          break
      }

      if (newDir) {
        if (newDir.x !== -state.direction.x || newDir.y !== -state.direction.y) {
          state.nextDirection = newDir
          state.directionLocked = true
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scheduleMove])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      handleInteraction(e.clientX, e.clientY)
    }

    const handleTouchStart = (e) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        handleInteraction(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleTouchMove = (e) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        handleInteraction(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
    }
  }, [handleInteraction])

  const handlePause = () => {
    const state = gameState.current
    if (!state.gameRunning || state.isPaused) {
      state.isPaused = false
      setIsPaused(false)
      moveSnake()
      if (!state.gameRunning) {
        setGameRunning(true)
        state.gameRunning = true
      }
      scheduleMove()
      return
    }

    state.isPaused = true
    setIsPaused(true)
    clearTimeout(state.moveTimeout)
  }

  const handleRestart = () => {
    const state = gameState.current
    clearTimeout(state.moveTimeout)
    resetGame()
    setGameRunning(true)
    setIsPaused(false)
    state.gameRunning = true
    state.isPaused = false
    scheduleMove()
  }

  const handlePlayAgain = () => {
    handleRestart()
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col items-center justify-center p-5 w-full max-w-[500px]">
      {/* 3D立体容器 */}
      <div className="relative w-full rounded-2xl p-5 flex flex-col gap-5 bg-gradient-to-b from-[#3d3d5c] to-[#2d2d4a] shadow-[inset_0_2px_0_rgba(255,255,255,0.1),inset_0_-2px_0_rgba(0,0,0,0.3),0_10px_0_#1e1e36,0_15px_30px_rgba(0,0,0,0.4)]">
        {/* 容器内阴影层 */}
        <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.2)] pointer-events-none" />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2">
            <div className="relative bg-gradient-to-b from-[#4a4a6a] to-[#3a3a5a] rounded-md px-4 py-2 text-center min-w-[80px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_3px_0_#252540]">
              <div className="text-[rgba(255,255,255,0.7)] text-xs uppercase tracking-wider">分数</div>
              <div className="text-white text-base font-bold">{score}</div>
            </div>
            <div className="relative bg-gradient-to-b from-[#4a4a6a] to-[#3a3a5a] rounded-md px-4 py-2 text-center min-w-[80px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_3px_0_#252540]">
              <div className="text-[rgba(255,255,255,0.7)] text-xs uppercase tracking-wider">最高分</div>
              <div className="text-white text-base font-bold">{bestScore}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePause}
              className="px-5 py-2.5 bg-gradient-to-b from-[#00cc6a] to-[#009950] text-white rounded-lg text-base font-bold uppercase tracking-wider cursor-pointer transition-all duration-100 border-t border-[#4dffa0] shadow-[0_4px_0_#006633,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#006633,0_6px_15px_rgba(0,0,0,0.4)] active:shadow-[0_2px_0_#006633,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1"
            >
              {(isPaused && !gameRunning) ? '开始' : (isPaused ? '继续' : '暂停')}
            </button>
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 bg-gradient-to-b from-[#e94560] to-[#c73e54] text-white rounded-lg text-base font-bold uppercase tracking-wider cursor-pointer transition-all duration-100 border-t border-[#f06a82] shadow-[0_4px_0_#9c2a3d,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#9c2a3d,0_6px_15px_rgba(0,0,0,0.4)] active:shadow-[0_2px_0_#9c2a3d,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1"
            >
              新游戏
            </button>
          </div>
        </div>

        <div className="relative w-full">
          {/* 3D立体画布容器 */}
          <div className="relative border border-white/10 p-2 rounded-lg bg-gradient-to-b from-[#2a2a3e] to-[#1a1a2e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_2px_0_rgba(255,255,255,0.05)]">
            {/* 内阴影层 */}
            <div className="absolute inset-3 rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] pointer-events-none" />
            <canvas
              ref={canvasRef}
              className="w-full relative z-10 shadow-[0_0_30px_rgba(0,255,136,0.15)] cursor-crosshair"
              style={{ aspectRatio: '1' }}
            />
          </div>

          {showGameOver && (
            <div className="absolute inset-0 bg-black/85 rounded-xl flex flex-col items-center justify-center gap-5 backdrop-blur-sm animate-[fadeIn_0.3s_ease] z-[100]">
              <div className="text-[#e94560] text-5xl font-bold animate-[shake_0.5s_ease]">
                游戏结束
              </div>
              <div className="text-white text-2xl">
                得分: <span className="text-[#00ff88] text-4xl">{finalScore}</span>
              </div>
              <button
                onClick={handlePlayAgain}
                className="px-12 py-3.5 text-lg bg-gradient-to-b from-[#00ff88] to-[#00cc6a] text-[#1a1a2e] rounded-xl font-bold cursor-pointer transition-all duration-100 border-t border-[#4dffa0] shadow-[0_4px_0_#009950,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#009950,0_6px_15px_rgba(0,255,136,0.4)] active:shadow-[0_2px_0_#009950,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1 uppercase tracking-wider"
              >
                再玩一次
              </button>
            </div>
          )}
        </div>

        <div className="text-[#AAA] text-sm text-center">
          <span className="text-[#00ffff]">WASD</span> 或 <span className="text-[#00ffff]">方向键</span> 控制移动 | <span className="text-[#00ffff]">空格</span> 暂停
        </div>
      </div>
    </div>
  )
}