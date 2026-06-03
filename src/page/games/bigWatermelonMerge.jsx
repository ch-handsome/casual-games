import { useState, useEffect, useCallback, useRef } from 'react'
import Matter from 'matter-js'
import fruit1 from '@/assets/bigWatermelonMerge/fruit_1.png'
import fruit2 from '@/assets/bigWatermelonMerge/fruit_2.png'
import fruit3 from '@/assets/bigWatermelonMerge/fruit_3.png'
import fruit4 from '@/assets/bigWatermelonMerge/fruit_4.png'
import fruit5 from '@/assets/bigWatermelonMerge/fruit_5.png'
import fruit6 from '@/assets/bigWatermelonMerge/fruit_6.png'
import fruit7 from '@/assets/bigWatermelonMerge/fruit_7.png'
import fruit8 from '@/assets/bigWatermelonMerge/fruit_8.png'
import fruit9 from '@/assets/bigWatermelonMerge/fruit_9.png'
import fruit10 from '@/assets/bigWatermelonMerge/fruit_10.png'
import fruit11 from '@/assets/bigWatermelonMerge/fruit_11.png'

// ===== 常量 =====
const CANVAS_W = 400
const CANVAS_H = 700
const RED_LINE_Y = CANVAS_H / 10
const DROP_Y = RED_LINE_Y - 20 // 水果待释放的 Y 坐标
const WALL_THICKNESS = 15
const GRACE_PERIOD = 2000 // 水果生成后 2 秒内不触发 game over（允许下落过程）
const MAX_FRUIT_LEVEL = 11

/** 水果等级对应颜色 (图片加载失败时的 fallback) */
const FRUIT_COLORS = {
  1: '#9ACD32',
  2: '#DC143C',
  3: '#FF8C00',
  4: '#FFD700',
  5: '#8B4513',
  6: '#FF6347',
  7: '#FF69B4',
  8: '#FFA500',
  9: '#D2691E',
  10: '#F0E68C',
  11: '#228B22',
}

const fruitImages = {
  1: fruit1,
  2: fruit2,
  3: fruit3,
  4: fruit4,
  5: fruit5,
  6: fruit6,
  7: fruit7,
  8: fruit8,
  9: fruit9,
  10: fruit10,
  11: fruit11,
}

/** 根据等级计算半径 */
const getRadius = (level) => 25 + (level - 1) * 1.5

/** 随机生成 1-5 级的水果 */
const randomFruitLevel = () => Math.floor(Math.random() * 5) + 1

// ===== 组件 =====
export default function BigWatermelonMerge() {
  const canvasRef = useRef(null)

  // --- 可变游戏状态 (refs — 避免闭包陈旧问题) ---
  const engineRef = useRef(null)
  const mouseXRef = useRef(CANVAS_W / 2)
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const currentFruitRef = useRef({ level: 0, active: false })
  const mergedSetRef = useRef(new Set()) // 防抖：已处理的碰撞对
  const spawnTimeRef = useRef({}) // body.id → 生成时间戳
  const animFrameRef = useRef(null)
  const loadedImagesRef = useRef({}) // level → HTMLImageElement

  // --- UI 状态 ---
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  // ===== 初始化 Matter.js 引擎 =====
  const initEngine = useCallback(() => {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.0 },
    })

    // 墙壁：左右 + 底部
    const walls = [
      Matter.Bodies.rectangle(
        CANVAS_W / 2,
        CANVAS_H + WALL_THICKNESS / 2,
        CANVAS_W + WALL_THICKNESS * 2,
        WALL_THICKNESS,
        { isStatic: true, label: 'wall' },
      ),
      Matter.Bodies.rectangle(
        -WALL_THICKNESS / 2,
        CANVAS_H / 2,
        WALL_THICKNESS,
        CANVAS_H,
        { isStatic: true, label: 'wall' },
      ),
      Matter.Bodies.rectangle(
        CANVAS_W + WALL_THICKNESS / 2,
        CANVAS_H / 2,
        WALL_THICKNESS,
        CANVAS_H,
        { isStatic: true, label: 'wall' },
      ),
    ]
    Matter.Composite.add(engine.world, walls)

    // 碰撞合成逻辑
    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair

        // 只处理两个都是水果的情况
        if (!bodyA.fruitLevel || !bodyB.fruitLevel) continue
        // 必须同等级
        if (bodyA.fruitLevel !== bodyB.fruitLevel) continue
        // 已达到最高等级
        if (bodyA.fruitLevel >= MAX_FRUIT_LEVEL) continue

        // 防抖：每对只合成一次
        const key = [bodyA.id, bodyB.id].sort((a, b) => a - b).join('-')
        if (mergedSetRef.current.has(key)) continue

        // 确认两个 body 都还在世界中（可能已被其他碰撞对先处理）
        const allBodies = Matter.Composite.allBodies(engine.world)
        if (!allBodies.includes(bodyA) || !allBodies.includes(bodyB)) continue

        mergedSetRef.current.add(key)

        const newLevel = bodyA.fruitLevel + 1
        const midX = (bodyA.position.x + bodyB.position.x) / 2
        const midY = (bodyA.position.y + bodyB.position.y) / 2
        const radius = getRadius(newLevel)

        // 删除旧水果
        Matter.Composite.remove(engine.world, [bodyA, bodyB])

        // 创建合成后的新水果
        const newBody = Matter.Bodies.circle(midX, midY, radius, {
          density: 0.004,
          restitution: 0.4,
          friction: 0.1,
          label: 'fruit',
        })
        newBody.fruitLevel = newLevel
        spawnTimeRef.current[newBody.id] = performance.now()

        Matter.Composite.add(engine.world, newBody)

        // 更新分数
        scoreRef.current += newLevel * 10
        setScore(scoreRef.current)
      }
    })

    engineRef.current = engine
    mergedSetRef.current = new Set()
    spawnTimeRef.current = {}

    return engine
  }, [])

  // ===== 渲染 Canvas =====
  const render = useCallback((ctx) => {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // 背景
    ctx.fillStyle = '#FBE79D'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // 红线
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(0, RED_LINE_Y)
    ctx.lineTo(CANVAS_W, RED_LINE_Y)
    ctx.stroke()
    ctx.setLineDash([])

    // 获取所有非墙壁 body
    const allBodies = Matter.Composite.allBodies(engineRef.current.world)
    const fruitBodies = allBodies.filter((b) => b.fruitLevel && !b.isStatic)

    // 绘制已落地的水果
    for (const body of fruitBodies) {
      const level = body.fruitLevel
      const { x, y } = body.position
      const radius = getRadius(level)
      const img = loadedImagesRef.current[level]
      const imgLoaded = img && img.complete && img.naturalWidth > 0

      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2

      if (imgLoaded) {
        const size = radius * 2
        ctx.drawImage(img, x - radius, y - radius, size, size)
      } else {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = FRUIT_COLORS[level] || '#999'
        ctx.fill()
      }

      ctx.restore()

      // 图片未加载时显示等级数字
      if (!imgLoaded) {
        ctx.fillStyle = '#000'
        ctx.font = `bold ${Math.round(radius * 0.8)}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(level), x, y + 1)
      }
    }

    // 绘制当前正在瞄准的水果
    if (currentFruitRef.current.active && !gameOverRef.current) {
      const level = currentFruitRef.current.level
      const x = mouseXRef.current
      const y = DROP_Y
      const radius = getRadius(level)
      const img = loadedImagesRef.current[level]
      const imgLoaded = img && img.complete && img.naturalWidth > 0

      ctx.save()
      ctx.globalAlpha = 0.85
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2

      if (imgLoaded) {
        const size = radius * 2
        ctx.drawImage(img, x - radius, y - radius, size, size)
      } else {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = FRUIT_COLORS[level] || '#999'
        ctx.fill()
      }

      ctx.restore()

      if (!imgLoaded) {
        ctx.fillStyle = '#000'
        ctx.font = `bold ${Math.round(radius * 0.8)}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(level), x, y + 1)
      }

      // 垂直辅助虚线
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, y + radius)
      ctx.lineTo(x, CANVAS_H)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [])

  // ===== 释放当前水果 =====
  const dropFruit = useCallback(() => {
    if (gameOverRef.current) return
    if (!currentFruitRef.current.active) return

    const level = currentFruitRef.current.level
    const x = mouseXRef.current
    const radius = getRadius(level)

    // 夹紧 X 坐标，不超出墙壁
    const clampedX = Math.max(radius + 2, Math.min(CANVAS_W - radius - 2, x))

    const body = Matter.Bodies.circle(clampedX, DROP_Y, radius, {
      density: 0.004,
      restitution: 0.4,
      friction: 0.1,
      label: 'fruit',
    })
    body.fruitLevel = level
    spawnTimeRef.current[body.id] = performance.now()

    Matter.Composite.add(engineRef.current.world, body)

    // 生成新的随机水果
    currentFruitRef.current = { level: randomFruitLevel(), active: true }
  }, [])

  // ===== 开始 / 重新开始 =====
  const startGame = useCallback(() => {
    // 清理旧引擎
    if (engineRef.current) {
      Matter.Events.off(engineRef.current, 'collisionStart')
      Matter.Engine.clear(engineRef.current)
      Matter.World.clear(engineRef.current.world, false)
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }

    const engine = initEngine()

    scoreRef.current = 0
    gameOverRef.current = false
    mergedSetRef.current = new Set()
    spawnTimeRef.current = {}

    currentFruitRef.current = { level: randomFruitLevel(), active: true }
    mouseXRef.current = CANVAS_W / 2

    setScore(0)
    setGameOver(false)

    // 游戏主循环
    const loop = () => {
      if (!gameOverRef.current) {
        Matter.Engine.update(engine, 1000 / 60)

        // 检测 game over：水果停留在红线以上超过宽限期
        const now = performance.now()
        const allBodies = Matter.Composite.allBodies(engine.world)
        for (const body of allBodies) {
          if (!body.fruitLevel || body.isStatic) continue
          const spawnTime = spawnTimeRef.current[body.id]
          if (!spawnTime || now - spawnTime < GRACE_PERIOD) continue
          if (body.position.y - getRadius(body.fruitLevel) < RED_LINE_Y) {
            gameOverRef.current = true
            setGameOver(true)
            break
          }
        }
      }

      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        render(ctx)
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
  }, [initEngine, render])

  // ===== 预加载水果图片 =====
  useEffect(() => {
    for (let i = 1; i <= MAX_FRUIT_LEVEL; i++) {
      const img = new Image()
      img.src = fruitImages[i]
      loadedImagesRef.current[i] = img
    }
  }, [])

  // ===== 鼠标事件 =====
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_W / rect.width
      const rawX = (e.clientX - rect.left) * scaleX
      mouseXRef.current = Math.max(
        getRadius(1) + 2,
        Math.min(CANVAS_W - getRadius(1) - 2, rawX),
      )
    }

    const handleClick = () => {
      dropFruit()
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [dropFruit])

  // ===== 挂载启动 / 卸载清理 =====
  useEffect(() => {
    startGame()
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (engineRef.current) {
        Matter.Events.off(engineRef.current, 'collisionStart')
        Matter.Engine.clear(engineRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== JSX =====
  return (
    <div className="w-full h-full min-h-[750px] flex flex-col items-center justify-center p-5 select-none">
      <div className="relative">
        {/* 顶部信息栏 */}
        <div className="flex justify-between items-center mb-3 px-4 py-2 bg-white/80 rounded-lg shadow">
          <div className="text-lg font-bold text-gray-800">
            分数: <span className="text-red-500 text-xl">{score}</span>
          </div>
          <button
            onClick={startGame}
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg font-bold cursor-pointer hover:bg-blue-600 active:scale-95 transition-all shadow-sm border-0"
          >
            新游戏
          </button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block rounded-lg border-2 border-gray-300 shadow-lg cursor-pointer"
        />

        {/* Game Over 遮罩 */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center gap-5 backdrop-blur-sm">
            <div className="text-red-400 text-5xl font-bold drop-shadow-lg">
              Game Over
            </div>
            <div className="text-white text-2xl">
              得分:{' '}
              <span className="text-yellow-400 text-4xl font-bold">{score}</span>
            </div>
            <button
              onClick={startGame}
              className="px-10 py-3 text-lg bg-gradient-to-b from-blue-400 to-blue-600 text-white rounded-xl font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg border-0"
            >
              重新开始
            </button>
          </div>
        )}
      </div>

      {/* 操作提示 */}
      <div className="mt-3 text-[#AAA] text-sm text-center">
         <span className="text-[#00ffff]">移动鼠标</span>瞄准 | 
         <span className="text-[#00ffff]"> 点击</span>释放水果 | 相同水果碰撞合成
      </div>
    </div>
  )
}
