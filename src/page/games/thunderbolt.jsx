import { useState, useEffect, useCallback, useRef } from 'react'
import playerImg from '@/assets/thunderbolt/player.png'
import shieldImg from '@/assets/thunderbolt/shield.png'
import enemy1Img from '@/assets/thunderbolt/enemy1.png'
import enemy2Img from '@/assets/thunderbolt/enemy2.png'
import enemy3Img from '@/assets/thunderbolt/enemy3.png'
import enemy4Img from '@/assets/thunderbolt/enemy4.png'

let enemyIdCounter = 0

const STORAGE_KEY = 'thunderbolt-best-score'
const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 550
const PLAYER_SIZE = 20
const BULLET_RADIUS = 4
const SCORE_PER_LEVEL = 2000
const MAX_LEVEL = 10
const MAX_WEAPON_LEVEL = 5
const BULLET_COLORS = {
  1: '#ffff00',
  2: '#00ff88',
  3: '#00ffff',
  4: '#00ffff',
  5: '#00ffff',
}
const TRACKING_COLORS = {
  normal: '#a855f7',
  super: '#ff69b4',
}

// 等级难度参数配置
const LEVEL_CONFIG = {
  1: { spawnInterval: 1500, enemySpeed: 1.5, shootInterval: 2000, eliteRate: 0.03, hpMultiplier: 1.0 },
  2: { spawnInterval: 1420, enemySpeed: 1.7, shootInterval: 1900, eliteRate: 0.04, hpMultiplier: 1.1 },
  3: { spawnInterval: 1340, enemySpeed: 1.9, shootInterval: 1800, eliteRate: 0.05, hpMultiplier: 1.2 },
  4: { spawnInterval: 1260, enemySpeed: 2.1, shootInterval: 1700, eliteRate: 0.06, hpMultiplier: 1.3 },
  5: { spawnInterval: 1180, enemySpeed: 2.3, shootInterval: 1600, eliteRate: 0.07, hpMultiplier: 1.4 },
  6: { spawnInterval: 1100, enemySpeed: 2.5, shootInterval: 1500, eliteRate: 0.08, hpMultiplier: 1.5 },
  7: { spawnInterval: 1020, enemySpeed: 2.7, shootInterval: 1400, eliteRate: 0.09, hpMultiplier: 1.6 },
  8: { spawnInterval: 940, enemySpeed: 2.9, shootInterval: 1300, eliteRate: 0.10, hpMultiplier: 1.7 },
  9: { spawnInterval: 860, enemySpeed: 3.1, shootInterval: 1200, eliteRate: 0.11, hpMultiplier: 1.8 },
  10: { spawnInterval: 780, enemySpeed: 3.3, shootInterval: 1100, eliteRate: 0.12, hpMultiplier: 2.0 },
}

// 计算等级
const calculateLevel = (score) => Math.min(MAX_LEVEL, Math.floor(score / SCORE_PER_LEVEL) + 1)

const ENEMY_TYPES = {
  small: { color: '#e85d75', hp: 1, score: 10, speed: 3, width: 40, height: 40 },
  medium: { color: '#f0a04e', hp: 3, score: 30, speed: 2, width: 50, height: 50 },
  large: { color: '#a855f7', hp: 5, score: 50, speed: 1.5, width: 60, height: 60 },
  elite: { color: '#22d3d3', hp: 8, score: 100, speed: 1.2, width: 70, height: 70 },
}
const POWERUPS = {
  weapon: { color: '#ff3333', duration: 0 },
  shield: { color: '#4e9ef0', duration: 10000 },
  health: { color: '#50c878', duration: 0 },
  speed: { color: '#ffe066', duration: 8000 },
}

// 寻找最近的敌人（排除指定ID）
function findNearestEnemy(state, x, y, excludeIds = []) {
  let nearest = null
  let minDist = Infinity
  for (const enemy of state.enemies) {
    if (excludeIds.includes(enemy.id)) continue
    const dx = enemy.x - x
    const dy = enemy.y - y
    const dist = dx * dx + dy * dy
    if (dist < minDist) {
      minDist = dist
      nearest = enemy
    }
  }
  return nearest
}

// 寻找最近的两个不同敌人
function findTwoNearestEnemies(state, x, y) {
  const first = findNearestEnemy(state, x, y)
  if (!first) return []
  const second = findNearestEnemy(state, x, y, [first.id])
  return [first, second].filter(Boolean)
}

export default function Thunderbolt() {
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [weaponLevel, setWeaponLevel] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [fireRate, setFireRate] = useState('正常')
  const [gameLevel, setGameLevel] = useState(1)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showWeaponUp, setShowWeaponUp] = useState(false)
  const [showWeaponDown, setShowWeaponDown] = useState(false)

  // 游戏结束显示覆盖层

  const canvasRef = useRef(null)
  const gameStateRef = useRef({
    player: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, invincible: false, invincibleTimer: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    stars: [],
    score: 0,
    lives: 3,
    weaponLevel: 1,
    level: 1,
    shieldActive: false,
    shieldTimer: 0,
    speedActive: false,
    speedTimer: 0,
    fireRateMultiplier: 1,
    lastFireTime: 0,
    lastTrackingFireTime: 0,
    spawnTimer: 0,
    isPaused: false,
    isGameOver: false,
    keys: {},
  })

  const gameLoopRef = useRef(null)
  const lastTimeRef = useRef(0)
  const imagesRef = useRef({})

  // 图片素材 - Vite 导入的 URL 创建 Image 对象
  useEffect(() => {
    const load = (key, src) => {
      const img = new Image()
      img.src = src
      imagesRef.current[key] = { img, loaded: true }
    }
    load('player', playerImg)
    load('shield', shieldImg)
    load('enemy1', enemy1Img)
    load('enemy2', enemy2Img)
    load('enemy3', enemy3Img)
    load('enemy4', enemy4Img)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setBestScore(parseInt(saved))
    initStars()
  }, [])

  const initStars = () => {
    const stars = []
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 1,
      })
    }
    gameStateRef.current.stars = stars
  }

  const startGame = useCallback(() => {
    const state = gameStateRef.current
    state.player = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, invincible: false, invincibleTimer: 0 }
    state.bullets = []
    state.enemyBullets = []
    state.enemies = []
    state.powerups = []
    state.particles = []
    state.score = 0
    state.lives = 3
    state.weaponLevel = 1
    state.level = 1
    state.shieldActive = false
    state.shieldTimer = 0
    state.speedActive = false
    state.speedTimer = 0
    state.fireRateMultiplier = 1
    state.lastFireTime = 0
    state.lastTrackingFireTime = 0
    state.spawnTimer = 0
    state.isPaused = false
    state.isGameOver = false

    setScore(0)
    setLives(3)
    setWeaponLevel(1)
    setGameLevel(1)
    setIsPaused(false)
    setIsGameOver(false)
    setFireRate('正常')
    setShowLevelUp(false)
    setShowWeaponUp(false)
    setShowWeaponDown(false)
    initStars()

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    lastTimeRef.current = performance.now()
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [])

  const fireBullet = useCallback((state, currentTime) => {
    const fireInterval = state.speedActive ? 1000 / 24 : 1000 / 12
    if (currentTime - state.lastFireTime < fireInterval) return

    state.lastFireTime = currentTime
    const player = state.player
    const level = state.weaponLevel
    const cx = player.x
    const cy = player.y - 15

    const makeBullet = (x, y, vx = 0, vy = -10, extra = {}) => ({
      x, y, vy, vx, trail: [], level, ...extra,
    })

    switch (level) {
      case 1:
        state.bullets.push(makeBullet(cx, cy))
        break
      case 2:
        state.bullets.push(makeBullet(cx - 10, cy))
        state.bullets.push(makeBullet(cx + 10, cy))
        break
      case 3:
        state.bullets.push(makeBullet(cx - 12, cy, -1.5))
        state.bullets.push(makeBullet(cx, cy))
        state.bullets.push(makeBullet(cx + 12, cy, 1.5))
        break
      case 4: {
        // === 4级武器：4发弹药 ===
        // 中间2发直线子弹（每次发射）
        state.bullets.push(makeBullet(cx - 6, cy, 0, -9))
        state.bullets.push(makeBullet(cx + 6, cy, 0, -9))
        // 两侧2发追踪弹（低频：每500ms发射一次）
        const trackingCooldown4 = 500
        if (currentTime - state.lastTrackingFireTime >= trackingCooldown4) {
          state.lastTrackingFireTime = currentTime
          const targets4 = findTwoNearestEnemies(state, cx, cy - 30)
          const t4a = targets4[0]
          const t4b = targets4[1]
          state.bullets.push(makeBullet(cx - 20, cy, -1, -6, {
            tracking: true,
            targetId: t4a ? t4a.id : null,
            trackSpeed: 3.5,
            damage: 1,
          }))
          state.bullets.push(makeBullet(cx + 20, cy, 1, -6, {
            tracking: true,
            targetId: t4b ? t4b.id : null,
            trackSpeed: 3.5,
            damage: 1,
          }))
        }
        break
      }
      case 5: {
        // === 5级武器：5发弹药 ===
        // 中间3发加强直线子弹（带发光圈，伤害=2，每次发射）
        state.bullets.push(makeBullet(cx - 12, cy, -0.3, -10, { hasGlow: true, damage: 2 }))
        state.bullets.push(makeBullet(cx, cy, 0, -10, { hasGlow: true, damage: 2 }))
        state.bullets.push(makeBullet(cx + 12, cy, 0.3, -10, { hasGlow: true, damage: 2 }))
        // 两侧2发超级追踪弹（高频：每250ms发射一次，追踪不同敌人）
        const trackingCooldown5 = 250
        if (currentTime - state.lastTrackingFireTime >= trackingCooldown5) {
          state.lastTrackingFireTime = currentTime
          const targets5 = findTwoNearestEnemies(state, cx, cy - 30)
          const t5a = targets5[0]
          const t5b = targets5[1]
          state.bullets.push(makeBullet(cx - 24, cy, -1.5, -7, {
            tracking: true,
            isSuperTracking: true,
            targetId: t5a ? t5a.id : null,
            trackSpeed: 5,
            damage: 2,
          }))
          state.bullets.push(makeBullet(cx + 24, cy, 1.5, -7, {
            tracking: true,
            isSuperTracking: true,
            targetId: t5b ? t5b.id : null,
            trackSpeed: 5,
            damage: 2,
          }))
        }
        break
      }
    }
  }, [])

  const spawnEnemy = useCallback((state) => {
    const level = state.level
    const config = LEVEL_CONFIG[level]
    const eliteRate = config.eliteRate

    const rand = Math.random()
    let type
    if (rand < 0.5 - eliteRate) type = 'small'
    else if (rand < 0.75 - eliteRate / 2) type = 'medium'
    else if (rand < 0.9 - eliteRate / 3) type = 'large'
    else type = 'elite'

    const baseConfig = ENEMY_TYPES[type]
    const speedMultiplier = config.enemySpeed / 2.0
    const hpMultiplier = config.hpMultiplier

    const enemy = {
      id: enemyIdCounter++,
      type,
      x: Math.random() * (CANVAS_WIDTH - baseConfig.width) + baseConfig.width / 2,
      y: -baseConfig.height,
      hp: Math.ceil(baseConfig.hp * hpMultiplier),
      score: baseConfig.score,
      speed: baseConfig.speed * speedMultiplier,
      width: baseConfig.width,
      height: baseConfig.height,
      color: baseConfig.color,
      shootTimer: Math.random() * config.shootInterval,
      angle: 0,
    }
    state.enemies.push(enemy)
  }, [])

  const spawnPowerup = useCallback((x, y) => {
    const rand = Math.random()
    let type
    if (rand < 0.40) type = 'weapon'
    else if (rand < 0.65) type = 'shield'
    else if (rand < 0.85) type = 'health'
    else type = 'speed'

    gameStateRef.current.powerups.push({
      type,
      x,
      y,
      ...POWERUPS[type],
    })
  }, [])

  const createExplosion = useCallback((x, y, color, count = 15) => {
    const state = gameStateRef.current
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = Math.random() * 3 + 2
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        color,
        size: Math.random() * 4 + 2,
      })
    }
  }, [])

  const update = useCallback((deltaTime) => {
    const state = gameStateRef.current
    if (state.isPaused || state.isGameOver) return

    const currentTime = performance.now()

    // Update player
    if (state.keys['KeyA'] || state.keys['ArrowLeft']) {
      state.player.x = Math.max(PLAYER_SIZE / 2, state.player.x - 8)
    }
    if (state.keys['KeyD'] || state.keys['ArrowRight']) {
      state.player.x = Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, state.player.x + 8)
    }
    if (state.keys['KeyW'] || state.keys['ArrowUp']) {
      state.player.y = Math.max(PLAYER_SIZE / 2, state.player.y - 8)
    }
    if (state.keys['KeyS'] || state.keys['ArrowDown']) {
      state.player.y = Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, state.player.y + 8)
    }

    // Player invincibility
    if (state.player.invincible) {
      state.player.invincibleTimer -= deltaTime
      if (state.player.invincibleTimer <= 0) {
        state.player.invincible = false
      }
    }

    // Shield timer
    if (state.shieldActive) {
      state.shieldTimer -= deltaTime
      if (state.shieldTimer <= 0) {
        state.shieldActive = false
      }
    }

    // Speed timer
    if (state.speedActive) {
      state.speedTimer -= deltaTime
      if (state.speedTimer <= 0) {
        state.speedActive = false
        state.fireRateMultiplier = 1
        setFireRate('正常')
      }
    }

    // Fire bullet
    fireBullet(state, currentTime)

    // Update player bullets (with tracking logic)
    state.bullets = state.bullets.filter(bullet => {
      bullet.trail.unshift({ x: bullet.x, y: bullet.y })
      const maxTrail = bullet.tracking ? 14 : bullet.hasGlow ? 8 : 5
      if (bullet.trail.length > maxTrail) bullet.trail.pop()

      // 追踪弹：每帧修正方向，尾随目标敌人
      if (bullet.tracking) {
        let target = null
        if (bullet.targetId != null) {
          target = state.enemies.find(e => e.id === bullet.targetId)
        }
        if (!target) {
          // 目标丢失，重新寻找最近敌人
          target = findNearestEnemy(state, bullet.x, bullet.y)
          if (target) bullet.targetId = target.id
        }
        if (target) {
          const dx = target.x - bullet.x
          const dy = target.y - bullet.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const steerStrength = bullet.isSuperTracking ? 0.5 : 0.35
          const speed = bullet.trackSpeed || 4
          bullet.vx += (dx / dist) * steerStrength
          bullet.vy += (dy / dist) * steerStrength
          // 归一化速度
          const currentSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy)
          if (currentSpeed > 0) {
            bullet.vx = (bullet.vx / currentSpeed) * speed
            bullet.vy = (bullet.vy / currentSpeed) * speed
          }
        }
      }

      bullet.y += bullet.vy
      if (bullet.vx) bullet.x += bullet.vx
      return bullet.y > -10 && bullet.x > 0 && bullet.x < CANVAS_WIDTH
    })

    // Update enemy bullets
    state.enemyBullets = state.enemyBullets.filter(bullet => {
      bullet.y += bullet.vy
      return bullet.y < CANVAS_HEIGHT + 10
    })

    // Update stars
    state.stars.forEach(star => {
      star.y += star.speed
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0
        star.x = Math.random() * CANVAS_WIDTH
      }
    })

    // Spawn enemies
    state.spawnTimer += deltaTime
    const levelConfig = LEVEL_CONFIG[state.level]
    const spawnDelay = Math.max(400, levelConfig.spawnInterval)
    if (state.spawnTimer >= spawnDelay) {
      state.spawnTimer = 0
      spawnEnemy(state)
    }

    // Update enemies
    state.enemies.forEach(enemy => {
      if (enemy.type === 'small') {
        enemy.y += enemy.speed
      } else if (enemy.type === 'medium') {
        enemy.y += enemy.speed
        enemy.angle += 0.05
        enemy.x += Math.sin(enemy.angle) * 2
      } else if (enemy.type === 'large') {
        enemy.y += enemy.speed
      } else if (enemy.type === 'elite') {
        enemy.y += enemy.speed
        const dx = state.player.x - enemy.x
        enemy.x += Math.sign(dx) * Math.min(Math.abs(dx) * 0.02, 2)
      }

      // Enemy shooting
      enemy.shootTimer -= deltaTime
      if (enemy.shootTimer <= 0) {
        enemy.shootTimer = levelConfig.shootInterval + Math.random() * 1000
        if (enemy.type !== 'small') {
          state.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            vy: 5,
          })
        }
        if (enemy.type === 'large') {
          state.enemyBullets.push({
            x: enemy.x - 10,
            y: enemy.y + enemy.height / 2,
            vy: 5,
          })
          state.enemyBullets.push({
            x: enemy.x + 10,
            y: enemy.y + enemy.height / 2,
            vy: 5,
          })
        }
      }
    })

    // Remove off-screen enemies
    state.enemies = state.enemies.filter(enemy => enemy.y < CANVAS_HEIGHT + 50)

    // Update powerups
    state.powerups = state.powerups.filter(p => {
      p.y += 2
      return p.y < CANVAS_HEIGHT + 20
    })

    // Update particles
    state.particles = state.particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.life -= p.decay
      return p.life > 0
    })

    // Collision detection
    // Player bullets vs enemies
    state.bullets = state.bullets.filter(bullet => {
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i]
        const dx = bullet.x - enemy.x
        const dy = bullet.y - enemy.y
        if (Math.abs(dx) < enemy.width / 2 && Math.abs(dy) < enemy.height / 2) {
          enemy.hp -= (bullet.damage || 1)
          if (enemy.hp <= 0) {
            createExplosion(enemy.x, enemy.y, enemy.color, 20)
            state.score += enemy.score
            setScore(state.score)

            // Check level up
            const newLevel = calculateLevel(state.score)
            if (newLevel > state.level) {
              state.level = newLevel
              setGameLevel(newLevel)
              setShowLevelUp(true)
              setTimeout(() => setShowLevelUp(false), 1500)
            }

            // Drop powerup chance
            if (Math.random() < 0.15) {
              spawnPowerup(enemy.x, enemy.y)
            }

            state.enemies.splice(i, 1)

            if (state.score > bestScore) {
              setBestScore(state.score)
              localStorage.setItem(STORAGE_KEY, state.score.toString())
            }
          } else {
            createExplosion(bullet.x, bullet.y, '#ffff00', 5)
          }
          return false
        }
      }
      return true
    })

    // Player vs enemies
    if (!state.player.invincible) {
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i]
        const dx = state.player.x - enemy.x
        const dy = state.player.y - enemy.y
        if (Math.abs(dx) < (PLAYER_SIZE + enemy.width) / 2 - 5 &&
            Math.abs(dy) < (PLAYER_SIZE + enemy.height) / 2 - 5) {
          createExplosion(enemy.x, enemy.y, enemy.color, 25)
          state.enemies.splice(i, 1)

          if (state.shieldActive) {
            state.shieldActive = false
          } else {
            state.lives--
            setLives(state.lives)
            if (state.weaponLevel > 1) {
              state.weaponLevel--
              setWeaponLevel(state.weaponLevel)
              setShowWeaponDown(true)
              setTimeout(() => setShowWeaponDown(false), 1000)
            }
            state.player.invincible = true
            state.player.invincibleTimer = 1500

            if (state.lives <= 0) {
              state.isGameOver = true
              setIsGameOver(true)
            }
          }
        }
      }
    }

    // Player vs enemy bullets
    if (!state.player.invincible) {
      state.enemyBullets = state.enemyBullets.filter(bullet => {
        const dx = bullet.x - state.player.x
        const dy = bullet.y - state.player.y
        if (Math.abs(dx) < PLAYER_SIZE / 2 && Math.abs(dy) < PLAYER_SIZE / 2) {
          if (state.shieldActive) {
            state.shieldActive = false
            createExplosion(bullet.x, bullet.y, '#4e9ef0', 10)
            return false
          }
          state.lives--
          setLives(state.lives)
          if (state.weaponLevel > 1) {
            state.weaponLevel--
            setWeaponLevel(state.weaponLevel)
            setShowWeaponDown(true)
            setTimeout(() => setShowWeaponDown(false), 1000)
          }
          state.player.invincible = true
          state.player.invincibleTimer = 1500
          createExplosion(state.player.x, state.player.y, '#ff0000', 15)

          if (state.lives <= 0) {
            state.isGameOver = true
            setIsGameOver(true)
          }
          return false
        }
        return true
      })
    }

    // Player vs powerups
    state.powerups = state.powerups.filter(powerup => {
      const dx = powerup.x - state.player.x
      const dy = powerup.y - state.player.y
      if (Math.abs(dx) < (PLAYER_SIZE + 20) / 2 && Math.abs(dy) < (PLAYER_SIZE + 20) / 2) {
        createExplosion(powerup.x, powerup.y, powerup.color, 10)

        switch (powerup.type) {
          case 'weapon':
            if (state.weaponLevel < MAX_WEAPON_LEVEL) {
              state.weaponLevel++
              setWeaponLevel(state.weaponLevel)
              setShowWeaponUp(true)
              setTimeout(() => setShowWeaponUp(false), 1000)
            }
            break
          case 'shield':
            state.shieldActive = true
            state.shieldTimer = powerup.duration
            break
          case 'health':
            if (state.lives < 3) {
              state.lives++
              setLives(state.lives)
            }
            break
          case 'speed':
            state.speedActive = true
            state.speedTimer = powerup.duration
            state.fireRateMultiplier = 2
            setFireRate('双倍')
            break
        }
        return false
      }
      return true
    })

  }, [createExplosion, fireBullet, spawnEnemy, spawnPowerup, bestScore])

  const drawGlowRing = (ctx, x, y, size, color) => {
    ctx.save()
    ctx.shadowBlur = 0

    // 外发光圈
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = 0.3
    ctx.fill()

    // 中发光圈
    ctx.beginPath()
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = 0.5
    ctx.fill()

    // 内发光圈
    ctx.beginPath()
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.8
    ctx.fill()

    ctx.restore()
  }

  const draw = useCallback((ctx) => {
    const state = gameStateRef.current

    // Clear canvas
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw stars
    state.stars.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.size / 4})`
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw particles
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    // Draw powerups
    state.powerups.forEach(p => {
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 10, p.y - 10, 20, 20)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(p.x - 10, p.y - 10, 20, 20)

      // Icon
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const icons = { weapon: 'W', shield: 'S', health: 'H', speed: 'F' }
      ctx.fillText(icons[p.type], p.x, p.y)
    })

    // Draw enemies
    state.enemies.forEach(enemy => {
      // 获取对应的图片
      const typeMap = { small: 'enemy1', medium: 'enemy2', large: 'enemy3', elite: 'enemy4' }
      const imgData = imagesRef.current[typeMap[enemy.type]]
      const size = enemy.width

      if (imgData && imgData.loaded) {
        ctx.drawImage(imgData.img, enemy.x - size / 2, enemy.y - size / 2, size, size)
      } else {
        // Fallback: 绘制原形状
        ctx.fillStyle = enemy.color

        if (enemy.type === 'small') {
          ctx.beginPath()
          ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
          ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2)
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 2)
          ctx.closePath()
          ctx.fill()
        } else if (enemy.type === 'medium') {
          ctx.beginPath()
          ctx.moveTo(enemy.x, enemy.y - enemy.height / 2)
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y)
          ctx.lineTo(enemy.x, enemy.y + enemy.height / 2)
          ctx.lineTo(enemy.x - enemy.width / 2, enemy.y)
          ctx.closePath()
          ctx.fill()
        } else if (enemy.type === 'large') {
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
            const x = enemy.x + Math.cos(angle) * enemy.width / 2
            const y = enemy.y + Math.sin(angle) * enemy.height / 2
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
        } else if (enemy.type === 'elite') {
          ctx.beginPath()
          for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2
            const r = i % 2 === 0 ? enemy.width / 2 : enemy.width / 4
            const x = enemy.x + Math.cos(angle) * r
            const y = enemy.y + Math.sin(angle) * r
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
        }
      }

      // Health bar for multi-hp enemies
      if (enemy.hp < ENEMY_TYPES[enemy.type].hp) {
        const barWidth = enemy.width
        const barHeight = 4
        ctx.fillStyle = '#333'
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 10, barWidth, barHeight)
        ctx.fillStyle = '#00ff00'
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 10,
          barWidth * (enemy.hp / ENEMY_TYPES[enemy.type].hp), barHeight)
      }
    })

    // Draw enemy bullets
    ctx.fillStyle = '#ff6b6b'
    state.enemyBullets.forEach(bullet => {
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw player bullets with trails
    state.bullets.forEach(bullet => {
      if (bullet.tracking) {
        // === 追踪弹绘制（紫色/粉色渐变 + 光晕 + 长拖尾） ===
        const trackColor = bullet.isSuperTracking ? TRACKING_COLORS.super : TRACKING_COLORS.normal
        const trackSize = bullet.isSuperTracking ? BULLET_RADIUS + 4 : BULLET_RADIUS + 2

        // 外层光晕
        ctx.save()
        ctx.shadowBlur = 12
        ctx.shadowColor = trackColor
        ctx.globalAlpha = 0.5
        ctx.fillStyle = trackColor
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, trackSize + 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // 中层发光圈
        drawGlowRing(ctx, bullet.x, bullet.y, trackSize + 4, trackColor)

        // 拖尾（更长、更明显）
        bullet.trail.forEach((t, i) => {
          const alpha = 1 - i / bullet.trail.length
          ctx.globalAlpha = alpha * 0.7
          const gradient = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, trackSize)
          gradient.addColorStop(0, '#ffffff')
          gradient.addColorStop(0.3, trackColor)
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(t.x, t.y, trackSize - i * 0.25, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.globalAlpha = 1

        // 子弹本体（径向渐变）
        const bodyGradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, trackSize)
        bodyGradient.addColorStop(0, '#ffffff')
        bodyGradient.addColorStop(0.35, trackColor)
        bodyGradient.addColorStop(1, 'transparent')
        ctx.fillStyle = bodyGradient
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, trackSize, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // === 普通子弹绘制 ===
        const bulletColor = BULLET_COLORS[bullet.level] || BULLET_COLORS[1]
        const bulletSize = BULLET_RADIUS + (bullet.level >= 4 ? 1 : 0) + (bullet.damage >= 2 ? 1 : 0)

        // Level 5 glow ring (draw behind trail and bullet)
        if (bullet.hasGlow) {
          drawGlowRing(ctx, bullet.x, bullet.y, bulletSize + 6, bulletColor)
        }

        // Trail
        bullet.trail.forEach((t, i) => {
          ctx.globalAlpha = 0.5 - i * 0.1
          ctx.fillStyle = bulletColor
          ctx.beginPath()
          ctx.arc(t.x, t.y, bulletSize - i * 0.5, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.globalAlpha = 1

        // Bullet body
        ctx.fillStyle = bulletColor
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, bulletSize, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Draw player
    if (!state.player.invincible || Math.floor(Date.now() / 100) % 2 === 0) {
      // Draw engine flame particles
      const flameSize = state.speedActive ? 15 : 10
      const flicker = Math.random() * 3
      ctx.fillStyle = state.speedActive ? '#ff6600' : '#ff9900'
      ctx.beginPath()
      ctx.moveTo(state.player.x - 5, state.player.y + PLAYER_SIZE / 2)
      ctx.lineTo(state.player.x, state.player.y + PLAYER_SIZE / 2 + flameSize + flicker)
      ctx.lineTo(state.player.x + 5, state.player.y + PLAYER_SIZE / 2)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = state.speedActive ? '#ffff00' : '#ffaa00'
      ctx.beginPath()
      ctx.moveTo(state.player.x - 3, state.player.y + PLAYER_SIZE / 2)
      ctx.lineTo(state.player.x, state.player.y + PLAYER_SIZE / 2 + flameSize / 2 + flicker)
      ctx.lineTo(state.player.x + 3, state.player.y + PLAYER_SIZE / 2)
      ctx.closePath()
      ctx.fill()

      // 绘制玩家飞船 - 使用图片或 fallback
      const playerImgData = imagesRef.current['player']
      if (playerImgData && playerImgData.loaded) {
        const playerImgSize = PLAYER_SIZE * 2.5
        ctx.drawImage(playerImgData.img, state.player.x - playerImgSize / 2, state.player.y - playerImgSize / 2, playerImgSize, playerImgSize)
      } else {
        // Fallback: 绘制三角形飞船
        ctx.fillStyle = '#00e5f0'
        ctx.beginPath()
        ctx.moveTo(state.player.x, state.player.y - PLAYER_SIZE / 2)
        ctx.lineTo(state.player.x - PLAYER_SIZE / 2, state.player.y + PLAYER_SIZE / 2)
        ctx.lineTo(state.player.x + PLAYER_SIZE / 2, state.player.y + PLAYER_SIZE / 2)
        ctx.closePath()
        ctx.fill()

        // Cockpit
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(state.player.x, state.player.y, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Shield effect - 使用图片或 fallback
    if (state.shieldActive) {
      const shieldImgData = imagesRef.current['shield']
      const shieldSize = PLAYER_SIZE * 3.5

      if (shieldImgData && shieldImgData.loaded) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3
        ctx.drawImage(shieldImgData.img, state.player.x - shieldSize / 2, state.player.y - shieldSize / 2, shieldSize, shieldSize)
        ctx.globalAlpha = 1
      } else {
        // Fallback: 绘制圆形护盾
        ctx.strokeStyle = '#4e9ef0'
        ctx.lineWidth = 3
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3
        ctx.beginPath()
        ctx.arc(state.player.x, state.player.y, PLAYER_SIZE * 1.5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    // Shield effect - 使用图片或 fallback
    if (state.isPaused && !state.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('暂停', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    }

  }, [])

  const gameLoop = useCallback((timestamp) => {
    const deltaTime = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp

    update(deltaTime)

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      draw(ctx)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [update, draw])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = gameStateRef.current
      state.keys[e.code] = true

      if (e.code === 'KeyP') {
        state.isPaused = !state.isPaused
        setIsPaused(state.isPaused)
      }
    }

    const handleKeyUp = (e) => {
      const state = gameStateRef.current
      state.keys[e.code] = false
    }

    const handleMouseMove = (e) => {
      const state = gameStateRef.current
      if (state.isGameOver || state.isPaused) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const scaleY = CANVAS_HEIGHT / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      state.player.x = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, x))
      state.player.y = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, y))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseMove = (e) => {
      const state = gameStateRef.current
      if (state.isGameOver || state.isPaused) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const scaleY = CANVAS_HEIGHT / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      state.player.x = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, x))
      state.player.y = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, y))
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    return () => canvas.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    startGame()
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [startGame])

  const togglePause = () => {
    const state = gameStateRef.current
    state.isPaused = !state.isPaused
    setIsPaused(state.isPaused)
  }

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col items-center p-5">
      <div className="bg-gradient-to-b from-[rgba(30,30,60,0.9)] to-[rgba(20,20,40,0.95)] rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] border border-[rgba(100,100,200,0.3)]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-4 py-3 bg-[rgba(0,0,0,0.3)] rounded-lg border border-[rgba(100,100,200,0.2)]">
          <div className="flex gap-2">
            {Array(3).fill(0).map((_, i) => (
              <span key={i} className={`text-2xl ${i < lives ? 'opacity-100' : 'opacity-30 grayscale'}`}>❤️</span>
            ))}
          </div>
          <div className="text-white text-lg font-bold">
            <span className="text-[#00e5f0]">分数:</span> {score}
            <span className="mx-4 text-[#666]">|</span>
            <span className="text-[#ffe066]">最高:</span> {bestScore}
            <span className="mx-4 text-[#666]">|</span>
            <span className="text-[#22d3d3]">难度:Lv.{gameLevel}</span>
            <span className="mx-4 text-[#666]">|</span>
            <span style={{ color: BULLET_COLORS[weaponLevel] || '#a855f7' }}>武器: Lv.{weaponLevel}</span>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block rounded-lg border-2 border-[rgba(100,100,200,0.4)] shadow-[0_0_20px_rgba(0,229,240,0.2),inset_0_0_60px_rgba(0,0,0,0.5)] cursor-none"
          />

          {/* 游戏结束覆盖层 */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/85 rounded-lg flex flex-col items-center justify-center gap-5 backdrop-blur-sm">
              <div className="text-[#ff4757] text-5xl font-bold">
                游戏结束
              </div>
              <div className="text-white text-2xl">
                得分: <span className="text-[#00e5f0] text-4xl">{score}</span>
              </div>
              <button
                onClick={startGame}
                className="px-12 py-3.5 text-lg bg-gradient-to-b from-[#00e5f0] to-[#00b8d4] text-white rounded-xl font-bold cursor-pointer transition-all duration-100 border-t border-[#5cf0ff] shadow-[0_4px_0_#008899,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#008899,0_6px_15px_rgba(0,229,240,0.4)] active:shadow-[0_2px_0_#008899,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1"              >                再玩一次              </button>            </div>          )}          {/* 等级提升特效 */}          {showLevelUp && (            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">              <div className="animate-ping text-[#ffe066] text-6xl font-bold drop-shadow-[0_0_20px_rgba(255,224,102,0.8)]">                Lv.{gameLevel}!              </div>            </div>          )}          {/* 武器升级特效 */}          {showWeaponUp && (            <div className="absolute top-1/2 left-1/2 pointer-events-none -translate-x-1/2 -translate-y-1/2">              <div className="animate-bounce text-[#ff3333] text-5xl font-bold drop-shadow-[0_0_25px_rgba(255,51,51,0.9)]">                ⬆ 武器升级 Lv.{weaponLevel}!</div>            </div>          )}          {/* 武器降级特效 */}          {showWeaponDown && (            <div className="absolute top-1/2 left-1/2 pointer-events-none -translate-x-1/2 -translate-y-1/2">              <div className="animate-pulse text-[#888888] text-4xl font-bold drop-shadow-[0_0_15px_rgba(136,136,136,0.7)]">                ⬇ 武器降级 Lv.{weaponLevel}</div>            </div>          )}        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mt-4 px-4 py-3 bg-[rgba(0,0,0,0.3)] rounded-lg border border-[rgba(100,100,200,0.2)]">
          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="px-5 py-2.5 text-base font-bold bg-gradient-to-b from-[#00e5f0] to-[#00b8d4] text-black border-none rounded-lg cursor-pointer shadow-[0_4px_15px_rgba(0,229,240,0.4)] hover:scale-105 transition-all"
            >
              新游戏
            </button>
            <button
              onClick={togglePause}
              className="px-5 py-2.5 text-base font-bold bg-gradient-to-b from-[#ffe066] to-[#f0a04e] text-black border-none rounded-lg cursor-pointer shadow-[0_4px_15px_rgba(255,224,102,0.4)] hover:scale-105 transition-all"
            >
              {isPaused ? '继续' : '暂停'}
            </button>
          </div>
          <div className="text-white text-base">
            <span className="text-[#ffe066]">射速:</span> {fireRate}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-5 text-[#AAA] text-sm text-center">
        <span className="text-[#00ffff]">鼠标移动</span> 或 
        <span className="text-[#00ffff]"> WASD/方向键</span> 控制 | 
        <span className="text-[#00ffff]"> P</span> 键暂停 | 🔴 武器升级 | 🔵 护盾 | 🟢 回血 | 🟡 射速翻倍
      </div>
    </div>
  )
}