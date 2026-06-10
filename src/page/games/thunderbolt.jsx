import { useState, useEffect, useCallback, useRef } from 'react'
import playerImg from '@/assets/thunderbolt/player.png'
import shieldImg from '@/assets/thunderbolt/shield.png'
import enemy1Img from '@/assets/thunderbolt/enemy1.png'
import enemy2Img from '@/assets/thunderbolt/enemy2.png'
import enemy3Img from '@/assets/thunderbolt/enemy3.png'
import enemy4Img from '@/assets/thunderbolt/enemy4.png'
import boss1Img from '@/assets/thunderbolt/boss/boss_1.png'
import boss2Img from '@/assets/thunderbolt/boss/boss_2.png'
import boss3Img from '@/assets/thunderbolt/boss/boss_3.png'
import boss4Img from '@/assets/thunderbolt/boss/boss_4.png'
import boss5Img from '@/assets/thunderbolt/boss/boss_5.png'
import boss6Img from '@/assets/thunderbolt/boss/boss_6.png'
import boss7Img from '@/assets/thunderbolt/boss/boss_7.png'
import boss8Img from '@/assets/thunderbolt/boss/boss_8.png'
import boss9Img from '@/assets/thunderbolt/boss/boss_9.png'
import boss10Img from '@/assets/thunderbolt/boss/boss_10.png'

let enemyIdCounter = 0

const STORAGE_KEY = 'thunderbolt-best-score'
const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 550
const PLAYER_SIZE = 20
const BULLET_RADIUS = 4
const SCORE_PER_LEVEL = 1000
const MAX_LEVEL = 50
const MAX_WEAPON_LEVEL = 5
const BOSS_INTERVAL = 3 // 每3个难度等级触发一次Boss
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

// 等级难度参数配置（动态计算）
const getLevelConfig = (level) => {
  const t = (level - 1) / 49 // 0~1 插值因子
  return {
    spawnInterval: Math.round(1500 - t * 1050),       // 1500 → 450
    enemySpeed: 1.5 + t * 1.8,                          // 1.5 → 3.3
    shootInterval: Math.round(2200 - t * 1400),         // 2200 → 800
    eliteRate: 0.03 + t * 0.17,                          // 3% → 20%
    hpMultiplier: 1 + (level - 1) * 0.08 + Math.pow(level / 50, 2) * 2,
  }
}

// Boss触发分数 = SCORE_PER_LEVEL * BOSS_INTERVAL * bossNumber
const getBossScore = (bossIndex) => SCORE_PER_LEVEL * BOSS_INTERVAL * (bossIndex + 1)

// Boss配置
const BOSS_CONFIG = [
  { hp: 300,  speed: 1.5, amplitude: 150, imageKey: 'boss_1',  name: '冰霜' },
  { hp: 500,  speed: 1.5, amplitude: 150, imageKey: 'boss_2',  name: '地狱火' },
  { hp: 750,  speed: 1.5, amplitude: 150, imageKey: 'boss_3',  name: '铁幕' },
  { hp: 1000, speed: 2.0, amplitude: 200, imageKey: 'boss_4',  name: '暗影' },
  { hp: 1400, speed: 2.0, amplitude: 200, imageKey: 'boss_5',  name: '堡垒' },
  { hp: 1800, speed: 2.0, amplitude: 200, imageKey: 'boss_6',  name: '毁灭者' },
  { hp: 2400, speed: 2.5, amplitude: 250, imageKey: 'boss_7',  name: '掠食者' },
  { hp: 3000, speed: 2.5, amplitude: 250, imageKey: 'boss_8',  name: '毒刺' },
  { hp: 3800, speed: 2.5, amplitude: 250, imageKey: 'boss_9',  name: '巨像' },
  { hp: 5000, speed: 3.0, amplitude: 300, imageKey: 'boss_10', name: '蛇发女妖' },
]

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
  const [bossPhaseText, setBossPhaseText] = useState('')
  const [showBossPhase, setShowBossPhase] = useState(false)
  const [showBossDefeat, setShowBossDefeat] = useState(false)
  const [bossCleared, setBossCleared] = useState(false)

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
    bossState: {
      active: false,
      boss: null,
      phase: 1,
      phaseTransition: false,
      phaseTimer: 0,
      defeatedBosses: [],
      cleared: false,
      restoreTimer: 0,
      lasers: [],
      bossSpecialBullets: [],
      showPhaseText: false,
      phaseText: '',
      phaseTextTimer: 0,
      showDefeatText: false,
      defeatTextTimer: 0,
    },
  })

  const gameLoopRef = useRef(null)
  const lastTimeRef = useRef(0)
  const levelUpTimeoutRef = useRef(null)
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
    load('boss_1', boss1Img)
    load('boss_2', boss2Img)
    load('boss_3', boss3Img)
    load('boss_4', boss4Img)
    load('boss_5', boss5Img)
    load('boss_6', boss6Img)
    load('boss_7', boss7Img)
    load('boss_8', boss8Img)
    load('boss_9', boss9Img)
    load('boss_10', boss10Img)
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
    state.bossState = {
      active: false,
      boss: null,
      phase: 1,
      phaseTransition: false,
      phaseTimer: 0,
      defeatedBosses: [],
      cleared: false,
      restoreTimer: 0,
      lasers: [],
      bossSpecialBullets: [],
      showPhaseText: false,
      phaseText: '',
      phaseTextTimer: 0,
      showDefeatText: false,
      defeatTextTimer: 0,
    }

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
    setBossPhaseText('')
    setShowBossPhase(false)
    setShowBossDefeat(false)
    setBossCleared(false)
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
            trackSpeed: 5,
            damage: 1,
          }))
          state.bullets.push(makeBullet(cx + 20, cy, 1, -6, {
            tracking: true,
            targetId: t4b ? t4b.id : null,
            trackSpeed: 5,
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
            trackSpeed: 7,
            damage: 2,
          }))
          state.bullets.push(makeBullet(cx + 24, cy, 1.5, -7, {
            tracking: true,
            isSuperTracking: true,
            targetId: t5b ? t5b.id : null,
            trackSpeed: 7,
            damage: 2,
          }))
        }
        break
      }
    }
  }, [])

  const spawnEnemy = useCallback((state) => {
    const level = state.level
    const config = getLevelConfig(level)
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
      maxHp: Math.ceil(baseConfig.hp * hpMultiplier),
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

  // ==================== Boss攻击模式函数 ====================

  const fireBossAimed = (boss, player, state, speed = 6) => {
    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    state.enemyBullets.push({
      x: boss.x, y: boss.y + 30, vx: (dx / dist) * speed, vy: (dy / dist) * speed, isBoss: true,
    })
  }

  const fireBossFan = (boss, player, state, n, spread, speed = 5) => {
    const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
    const spreadRad = (spread * Math.PI) / 180
    const startAngle = baseAngle - spreadRad / 2
    const step = n > 1 ? spreadRad / (n - 1) : 0
    for (let i = 0; i < n; i++) {
      const a = startAngle + step * i
      state.enemyBullets.push({
        x: boss.x, y: boss.y + 30, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, isBoss: true,
      })
    }
  }

  const fireBossCircle = (boss, state, n, speed = 4) => {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n
      state.enemyBullets.push({
        x: boss.x, y: boss.y + 30, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, isBoss: true,
      })
    }
  }

  const fireBossSpiral = (boss, state, n, speed = 4, offsetAngle = 0) => {
    for (let i = 0; i < n; i++) {
      const a = offsetAngle + (Math.PI * 2 * i) / n
      state.enemyBullets.push({
        x: boss.x, y: boss.y + 30, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, isBoss: true,
      })
    }
  }

  const fireBossBurst = (boss, player, state, n, interval, speed = 6) => {
    // 连发弹：通过boss的burstQueue实现
    if (!boss.burstQueue) boss.burstQueue = []
    for (let i = 0; i < n; i++) {
      boss.burstQueue.push({ timer: i * interval, speed })
    }
  }

  const fireBossTracking = (boss, player, state, n, speed = 3) => {
    for (let i = 0; i < n; i++) {
      const spreadAngle = n > 1 ? (i / (n - 1) - 0.5) * 0.8 : 0
      state.bossState.bossSpecialBullets.push({
        x: boss.x, y: boss.y + 30,
        vx: Math.cos(Math.PI / 2 + spreadAngle) * speed,
        vy: speed * 1.2,
        tracking: true,
        trackSpeed: speed,
        life: 1,
      })
    }
  }

  const fireBossBoomerang = (boss, state, n, speed = 5, curveStrength = 0.04) => {
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 4 + (Math.PI / 2 * i) / Math.max(n - 1, 1)
      state.bossState.bossSpecialBullets.push({
        x: boss.x, y: boss.y + 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        boomerang: true,
        curveStrength,
        originX: boss.x,
        life: 1,
      })
    }
  }

  const fireBossLaser = (boss, state, angle, width = 20) => {
    state.bossState.lasers.push({
      x: boss.x, y: boss.y + 30,
      angle: angle !== undefined ? angle : Math.PI / 2,
      width,
      life: 1,
      maxLife: 1.5,
    })
  }

  const fireBossWall = (boss, state, speed = 4) => {
    // 从屏幕左右两侧发射横向弹
    const yPos = boss.y + 30
    for (let y = yPos - 60; y <= yPos + 60; y += 30) {
      state.enemyBullets.push({ x: 0, y, vx: speed, vy: 0, isBoss: true })
      state.enemyBullets.push({ x: CANVAS_WIDTH, y, vx: -speed, vy: 0, isBoss: true })
    }
  }

  // ==================== Boss阶段攻击模式定义 ====================

  const getBossPatterns = (bossIndex) => {
    // 返回3个阶段的攻击模式配置
    const patterns = [
      // Boss 1: 哨兵 - 散射弹系列
      [
        { type: 'aimed', interval: 1200, params: { speed: 5 } },
        { type: 'fan', interval: 1000, params: { n: 3, spread: 30, speed: 5 } },
        { type: 'fan', interval: 600, params: { n: 5, spread: 45, speed: 5.5 } },
      ],
      // Boss 2: 织网者 - 十字/环形系列
      [
        { type: 'cross', interval: 1500, params: { speed: 4 } },
        { type: 'xcross', interval: 1200, params: { speed: 4.5 } },
        { type: 'circle', interval: 800, params: { n: 8, speed: 5 } },
      ],
      // Boss 3: 炮台 - 连发弹系列
      [
        { type: 'burst', interval: 1500, params: { n: 3, burstInterval: 100, speed: 6 } },
        { type: 'burstFan', interval: 1200, params: { n: 5, burstInterval: 100, speed: 6, fanN: 2, fanSpread: 20 } },
        { type: 'burstFan', interval: 800, params: { n: 7, burstInterval: 80, speed: 6.5, fanN: 3, fanSpread: 30 } },
      ],
      // Boss 4: 螺旋 - 螺旋弹系列
      [
        { type: 'spiral', interval: 50, params: { n: 1, speed: 4, dir: 1 } },
        { type: 'doubleSpiral', interval: 50, params: { n: 1, speed: 4 } },
        { type: 'tripleSpiral', interval: 50, params: { n: 1, speed: 4.5 } },
      ],
      // Boss 5: 风暴 - 波浪弹系列
      [
        { type: 'wave', interval: 800, params: { amplitude: 80, frequency: 0.1, speed: 4 } },
        { type: 'doubleWave', interval: 800, params: { amplitude: 80, frequency: 0.1, speed: 4 } },
        { type: 'denseWave', interval: 500, params: { amplitude: 100, frequency: 0.2, speed: 5 } },
      ],
      // Boss 6: 幻影 - 分身系列
      [
        { type: 'phantom', interval: 1400, params: { clones: 2, fanN: 3, speed: 4.5 } },
        { type: 'phantomWall', interval: 2000, params: { clones: 2, fanN: 3, speed: 4.5 } },
        { type: 'phantomTracking', interval: 2500, params: { clones: 2, fanN: 3, speed: 4.5, trackingN: 2 } },
      ],
      // Boss 7: 激光阵列 - 激光系列
      [
        { type: 'laserSweep', interval: 2500, params: { width: 20, sweepSpeed: 0.02 } },
        { type: 'doubleLaser', interval: 2500, params: { width: 20, sweepSpeed: 0.025 } },
        { type: 'tripleLaser', interval: 2500, params: { width: 20, sweepSpeed: 0.03 } },
      ],
      // Boss 8: 弹幕 - 弹幕系列
      [
        { type: 'scatter', interval: 1200, params: { n: 8, angleRange: 180, speed: 4 } },
        { type: 'fanGroup', interval: 1000, params: { groups: 3, fanN: 5, spread: 20, speed: 4.5 } },
        { type: 'bulletHell', interval: 600, params: { n: 24, speed: 4.5 } },
      ],
      // Boss 9: 回旋 - 回旋弹系列
      [
        { type: 'boomerang', interval: 1000, params: { n: 6, speed: 5, curve: 0.04 } },
        { type: 'boomerangCircle', interval: 1500, params: { n: 6, speed: 5, curve: 0.04 } },
        { type: 'boomerangTracking', interval: 2000, params: { n: 6, speed: 5, curve: 0.04, trackingN: 3 } },
      ],
      // Boss 10: 终焉 - 全模式混合
      [
        { type: 'hybrid1', interval: 800, params: { fanN: 5, fanSpread: 40, aimedSpeed: 6 } },
        { type: 'hybrid2', interval: 2000, params: { speed: 4.5, trackingN: 3 } },
        { type: 'hybrid3', interval: 1200, params: { fanN: 5, fanSpread: 40, speed: 4.5, trackingN: 2 } },
      ],
    ]
    return patterns[bossIndex] || patterns[0]
  }

  // ==================== Boss攻击执行 ====================

  const executeBossPattern = (boss, player, state, pattern, currentTime) => {
    if (!pattern) return
    // 检查冷却
    if (currentTime - (boss._lastShotTime || 0) < pattern.interval) return
    boss._lastShotTime = currentTime

    const p = pattern.params || {}
    const bs = state.bossState

    switch (pattern.type) {
      case 'aimed':
        fireBossAimed(boss, player, state, p.speed || 6)
        break
      case 'fan':
        fireBossFan(boss, player, state, p.n || 3, p.spread || 30, p.speed || 5)
        break
      case 'cross': {
        // 上下左右4向
        const spd = p.speed || 4
        state.enemyBullets.push(
          { x: boss.x, y: boss.y + 30, vx: 0, vy: spd, isBoss: true },
          { x: boss.x, y: boss.y + 30, vx: 0, vy: -spd, isBoss: true },
          { x: boss.x, y: boss.y + 30, vx: spd, vy: 0, isBoss: true },
          { x: boss.x, y: boss.y + 30, vx: -spd, vy: 0, isBoss: true },
        )
        break
      }
      case 'xcross': {
        // 斜向4向 + 瞄准弹
        const s = p.speed || 4.5
        const diag = s / Math.SQRT2
        state.enemyBullets.push(
          { x: boss.x, y: boss.y + 30, vx: diag, vy: diag, isBoss: true },
          { x: boss.x, y: boss.y + 30, vx: -diag, vy: diag, isBoss: true },
          { x: boss.x, y: boss.y + 30, vx: diag, vy: -diag, isBoss: true },
          { x: boss.x, y: boss.y + 30, vx: -diag, vy: -diag, isBoss: true },
        )
        fireBossAimed(boss, player, state, s)
        break
      }
      case 'circle':
        fireBossCircle(boss, state, p.n || 8, p.speed || 5)
        break
      case 'burst': {
        // 连发瞄准弹 (使用burstQueue)
        if (!boss.burstQueue) boss.burstQueue = []
        const burstN = p.n || 3
        const burstInt = p.burstInterval || 100
        const sp = p.speed || 6
        for (let i = 0; i < burstN; i++) {
          boss.burstQueue.push({ timer: i * burstInt, speed: sp })
        }
        break
      }
      case 'burstFan': {
        if (!boss.burstQueue) boss.burstQueue = []
        const bn = p.n || 3
        const bi = p.burstInterval || 100
        const sp = p.speed || 6
        const fn = p.fanN || 2
        const fs = p.fanSpread || 20
        for (let i = 0; i < bn; i++) {
          boss.burstQueue.push({ timer: i * bi, speed: sp, fanN: fn, fanSpread: fs })
        }
        break
      }
      case 'spiral':
      case 'doubleSpiral':
      case 'tripleSpiral': {
        const spiralN = pattern.type === 'doubleSpiral' ? 2 : pattern.type === 'tripleSpiral' ? 3 : 1
        boss._spiralAngle = (boss._spiralAngle || 0) + (Math.PI / 12)
        for (let j = 0; j < spiralN; j++) {
          const offset = (Math.PI * 2 * j) / spiralN
          fireBossSpiral(boss, state, 1, p.speed || 4, boss._spiralAngle + offset)
        }
        break
      }
      case 'wave': {
        const amp = p.amplitude || 80
        const freq = p.frequency || 0.1
        const sp = p.speed || 4
        boss._wavePhase = (boss._wavePhase || 0) + freq
        for (let i = 0; i < 7; i++) {
          const baseX = boss.x + (i - 3) * 30
          const vx = Math.sin(boss._wavePhase + i * 0.5) * amp * 0.05
          state.enemyBullets.push({ x: baseX, y: boss.y + 30, vx, vy: sp, isBoss: true })
        }
        break
      }
      case 'doubleWave': {
        const amp2 = p.amplitude || 80
        const freq2 = p.frequency || 0.1
        const sp2 = p.speed || 4
        boss._wavePhase = (boss._wavePhase || 0) + freq2
        for (let i = 0; i < 7; i++) {
          const baseX = boss.x + (i - 3) * 30
          state.enemyBullets.push({ x: baseX, y: boss.y + 30, vx: Math.sin(boss._wavePhase + i * 0.5) * amp2 * 0.05, vy: sp2, isBoss: true })
          state.enemyBullets.push({ x: baseX, y: boss.y + 30, vx: Math.sin(boss._wavePhase + Math.PI + i * 0.5) * amp2 * 0.05, vy: sp2, isBoss: true })
        }
        // 随机散射
        for (let i = 0; i < 5; i++) {
          const ra = Math.PI / 2 + (Math.random() - 0.5) * 0.8
          state.enemyBullets.push({ x: boss.x, y: boss.y + 30, vx: Math.cos(ra) * sp2, vy: Math.sin(ra) * sp2, isBoss: true })
        }
        break
      }
      case 'denseWave': {
        const amp3 = p.amplitude || 100
        const freq3 = p.frequency || 0.2
        const sp3 = p.speed || 5
        boss._wavePhase = (boss._wavePhase || 0) + freq3
        for (let i = 0; i < 10; i++) {
          const baseX = boss.x + (i - 5) * 25
          state.enemyBullets.push({ x: baseX, y: boss.y + 30, vx: Math.sin(boss._wavePhase + i * 0.4) * amp3 * 0.05, vy: sp3, isBoss: true })
        }
        // 闪电快弹
        fireBossAimed(boss, player, state, 12)
        break
      }
      case 'phantom': {
        // 生成分身并齐射
        const clones = p.clones || 2
        const fn = p.fanN || 3
        const sp = p.speed || 4.5
        const allBosses = [{ x: boss.x, y: boss.y }]
        boss._phantomOffset = (boss._phantomOffset || 0) + 0.03
        for (let c = 0; c < clones; c++) {
          const cx = boss.x + Math.sin(boss._phantomOffset + c * 2) * 120
          allBosses.push({ x: cx, y: boss.y })
        }
        allBosses.forEach(b => fireBossFan(b, player, state, fn, 30, sp))
        break
      }
      case 'phantomWall': {
        const clones2 = p.clones || 2
        const fn2 = p.fanN || 3
        const sp2 = p.speed || 4.5
        const allBosses2 = [{ x: boss.x, y: boss.y }]
        boss._phantomOffset = (boss._phantomOffset || 0) + 0.03
        for (let c = 0; c < clones2; c++) {
          allBosses2.push({ x: boss.x + Math.sin(boss._phantomOffset + c * 2) * 120, y: boss.y })
        }
        allBosses2.forEach(b => fireBossFan(b, player, state, fn2, 30, sp2))
        if (currentTime - (boss._lastWallTime || 0) > 2500) {
          boss._lastWallTime = currentTime
          fireBossWall(boss, state)
        }
        break
      }
      case 'phantomTracking': {
        const clones3 = p.clones || 2
        const fn3 = p.fanN || 3
        const sp3 = p.speed || 4.5
        const tN = p.trackingN || 2
        const allBosses3 = [{ x: boss.x, y: boss.y }]
        boss._phantomOffset = (boss._phantomOffset || 0) + 0.03
        for (let c = 0; c < clones3; c++) {
          allBosses3.push({ x: boss.x + Math.sin(boss._phantomOffset + c * 2) * 120, y: boss.y })
        }
        allBosses3.forEach(b => fireBossFan(b, player, state, fn3, 30, sp3))
        if (currentTime - (boss._lastWallTime || 0) > 2500) {
          boss._lastWallTime = currentTime
          fireBossWall(boss, state)
        }
        if (currentTime - (boss._lastTrackingTime || 0) > 2000) {
          boss._lastTrackingTime = currentTime
          fireBossTracking(boss, player, state, tN)
        }
        break
      }
      case 'laserSweep': {
        boss._laserAngle = (boss._laserAngle !== undefined ? boss._laserAngle : 0) + (p.sweepSpeed || 0.02)
        const absAngle = Math.PI / 4 + Math.sin(boss._laserAngle) * Math.PI / 4
        fireBossLaser(boss, state, absAngle, p.width || 20)
        if (currentTime - (boss._laserAimedTime || 0) > 1200) {
          boss._laserAimedTime = currentTime
          fireBossAimed(boss, player, state, 5)
        }
        break
      }
      case 'doubleLaser': {
        boss._laserAngle = (boss._laserAngle !== undefined ? boss._laserAngle : 0) + (p.sweepSpeed || 0.025)
        const base = Math.PI / 4 + Math.sin(boss._laserAngle) * Math.PI / 4
        fireBossLaser(boss, state, base, p.width || 20)
        fireBossLaser(boss, state, base + Math.PI / 2, p.width || 20)
        if (currentTime - (boss._laserAimedTime || 0) > 1200) {
          boss._laserAimedTime = currentTime
          fireBossAimed(boss, player, state, 5)
        }
        break
      }
      case 'tripleLaser': {
        boss._laserAngle = (boss._laserAngle !== undefined ? boss._laserAngle : 0) + (p.sweepSpeed || 0.03)
        const base3 = Math.PI / 4 + Math.sin(boss._laserAngle) * Math.PI / 4
        fireBossLaser(boss, state, base3, p.width || 20)
        fireBossLaser(boss, state, base3 + Math.PI / 3, p.width || 20)
        fireBossLaser(boss, state, base3 - Math.PI / 3, p.width || 20)
        if (currentTime - (boss._scatterTimer || 0) > 400) {
          boss._scatterTimer = currentTime
          for (let i = 0; i < 8; i++) {
            const ra = Math.PI / 2 + (Math.random() - 0.5) * 1.5
            state.enemyBullets.push({ x: boss.x, y: boss.y + 30, vx: Math.cos(ra) * 4, vy: Math.sin(ra) * 4, isBoss: true })
          }
        }
        break
      }
      case 'scatter': {
        const n = p.n || 8
        const range = (p.angleRange || 180) * Math.PI / 180
        for (let i = 0; i < n; i++) {
          const a = Math.PI / 2 - range / 2 + (range * i) / Math.max(n - 1, 1)
          state.enemyBullets.push({ x: boss.x, y: boss.y + 30, vx: Math.cos(a) * (p.speed || 4), vy: Math.sin(a) * (p.speed || 4), isBoss: true })
        }
        break
      }
      case 'fanGroup': {
        const groups = p.groups || 3
        const fanN = p.fanN || 5
        const spread = p.spread || 20
        const spd4 = p.speed || 4.5
        for (let g = 0; g < groups; g++) {
          const offsetAngle = (g - (groups - 1) / 2) * 15 * Math.PI / 180
          const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x) + offsetAngle
          const spreadRad = (spread * Math.PI) / 180
          const startAngle = baseAngle - spreadRad / 2
          const step = fanN > 1 ? spreadRad / (fanN - 1) : 0
          for (let i = 0; i < fanN; i++) {
            const a = startAngle + step * i
            state.enemyBullets.push({ x: boss.x, y: boss.y + 30, vx: Math.cos(a) * spd4, vy: Math.sin(a) * spd4, isBoss: true })
          }
        }
        break
      }
      case 'bulletHell':
        fireBossCircle(boss, state, p.n || 24, p.speed || 4.5)
        break
      case 'boomerang': {
        fireBossBoomerang(boss, state, p.n || 6, p.speed || 5, p.curve || 0.04)
        break
      }
      case 'boomerangCircle': {
        fireBossBoomerang(boss, state, p.n || 6, p.speed || 5, p.curve || 0.04)
        if (currentTime - (boss._circleTimer || 0) > 1500) {
          boss._circleTimer = currentTime
          fireBossCircle(boss, state, 8, 4)
        }
        break
      }
      case 'boomerangTracking': {
        fireBossBoomerang(boss, state, p.n || 6, p.speed || 5, p.curve || 0.04)
        if (currentTime - (boss._circleTimer || 0) > 1500) {
          boss._circleTimer = currentTime
          fireBossCircle(boss, state, 8, 4)
        }
        if (currentTime - (boss._trackTimer || 0) > (p.trackingInterval || 1500)) {
          boss._trackTimer = currentTime
          fireBossTracking(boss, player, state, p.trackingN || 3)
        }
        break
      }
      case 'hybrid1': {
        fireBossFan(boss, player, state, p.fanN || 5, p.fanSpread || 40, 5)
        if (currentTime - (boss._aimedSubTimer || 0) > 600) {
          boss._aimedSubTimer = currentTime
          fireBossAimed(boss, player, state, p.aimedSpeed || 6)
        }
        break
      }
      case 'hybrid2': {
        // 双螺旋 + 追踪导弹
        boss._spiralAngle = (boss._spiralAngle || 0) + (Math.PI / 12)
        fireBossSpiral(boss, state, 1, p.speed || 4.5, boss._spiralAngle)
        fireBossSpiral(boss, state, 1, p.speed || 4.5, boss._spiralAngle + Math.PI)
        if (currentTime - (boss._trackTimer || 0) > 2000) {
          boss._trackTimer = currentTime
          fireBossTracking(boss, player, state, p.trackingN || 3)
        }
        break
      }
      case 'hybrid3': {
        // 全模式混合: 扇形 + 螺旋 + 追踪 + 激光
        fireBossFan(boss, player, state, p.fanN || 5, p.fanSpread || 40, 5)
        boss._spiralAngle = (boss._spiralAngle || 0) + (Math.PI / 12)
        fireBossSpiral(boss, state, 1, p.speed || 4.5, boss._spiralAngle)
        if (currentTime - (boss._trackTimer || 0) > 1000) {
          boss._trackTimer = currentTime
          fireBossTracking(boss, player, state, p.trackingN || 2, 3)
        }
        if (currentTime - (boss._laserTimer || 0) > 3000) {
          boss._laserTimer = currentTime
          boss._laserAngle2 = (boss._laserAngle2 || 0) + 0.03
          fireBossLaser(boss, state, Math.PI / 4 + Math.sin(boss._laserAngle2) * Math.PI / 3, 22)
        }
        break
      }
    }
  }

  // ==================== Boss初始化 ====================

  const initBoss = (state, bossConfig, bossIndex) => {
    const bossScore = getBossScore(bossIndex)
    state.bossState.active = true
    state.bossState.phase = 1
    state.bossState.phaseTransition = false
    state.bossState.phaseTimer = 0
    state.bossState.lasers = []
    state.bossState.bossSpecialBullets = []
    state.bossState.restoreTimer = 0

    state.bossState.boss = {
      score: bossScore,
      bossIndex,
      hp: bossConfig.hp,
      maxHp: bossConfig.hp,
      x: CANVAS_WIDTH / 2,
      y: -80, // 从顶部外进入
      targetY: 80,
      width: 120,
      height: 120,
      speed: bossConfig.speed,
      amplitude: bossConfig.amplitude,
      moveTimer: 0,
      shootTimer: 0,
      imageKey: bossConfig.imageKey,
      name: bossConfig.name,
      // 内部状态
      burstQueue: [],
      _spiralAngle: 0,
      _wavePhase: 0,
      _phantomOffset: 0,
      _laserAngle: 0,
      _laserAngle2: 0,
      _lastShotTime: 0,
      _lastWallTime: 0,
      _lastTrackingTime: 0,
      _lastCircleTimer: 0,
      _laserAimedTime: 0,
      _scatterTimer: 0,
      _trackTimer: 0,
      _laserTimer: 0,
      _circleTimer: 0,
      _aimedSubTimer: 0,
    }

    // 清空屏幕
    state.enemies.forEach(e => createExplosion(e.x, e.y, e.color, 15))
    state.enemies = []
    state.enemyBullets = []
  }

  // ==================== Boss更新 ====================

  const updateBoss = (state, deltaTime, currentTime) => {
    const bs = state.bossState
    if (!bs.active || !bs.boss) return

    const boss = bs.boss
    const player = state.player

    // Boss入场动画
    if (boss.y < boss.targetY) {
      boss.y += 1.5
      return // 动画期间不攻击
    }

    // 阶段切换无敌
    if (bs.phaseTransition) {
      bs.phaseTimer -= deltaTime
      if (bs.phaseTimer <= 0) {
        bs.phaseTransition = false
        boss._lastShotTime = currentTime + 500 // 切换后给玩家反应时间
        state.enemyBullets = state.enemyBullets.filter(b => !b.isBoss)
      }
      return
    }

    // 阶段提示文字计时
    if (bs.showPhaseText) {
      bs.phaseTextTimer -= deltaTime
      if (bs.phaseTextTimer <= 0) bs.showPhaseText = false
    }
    if (bs.showDefeatText) {
      bs.defeatTextTimer -= deltaTime
      if (bs.defeatTextTimer <= 0) bs.showDefeatText = false
    }

    // Boss水平移动
    boss.moveTimer += deltaTime * 0.001
    boss.x = CANVAS_WIDTH / 2 + Math.sin(boss.moveTimer * boss.speed * 0.5) * boss.amplitude
    boss.x = Math.max(boss.width / 2 + 50, Math.min(CANVAS_WIDTH - boss.width / 2 - 50, boss.x))

    // 处理burst队列
    if (boss.burstQueue && boss.burstQueue.length > 0) {
      boss.burstQueue = boss.burstQueue.filter(bq => {
        bq.timer -= deltaTime
        if (bq.timer <= 0) {
          if (bq.fanN) {
            fireBossFan(boss, player, state, bq.fanN, bq.fanSpread || 20, bq.speed || 6)
          } else {
            fireBossAimed(boss, player, state, bq.speed || 6)
          }
          return false
        }
        return true
      })
    }

    // 确定当前阶段和模式
    const hpPercent = boss.hp / boss.maxHp
    let newPhase = bs.phase
    if (hpPercent <= 0.3) newPhase = 3
    else if (hpPercent <= 0.6) newPhase = 2

    if (newPhase !== bs.phase) {
      // 阶段切换
      bs.phase = newPhase
      bs.phaseTransition = true
      bs.phaseTimer = 500 // 0.5秒无敌
      state.enemyBullets = state.enemyBullets.filter(b => !b.isBoss)
      // 闪烁和提示
      bs.showPhaseText = true
      bs.phaseTextTimer = 1500
      bs.phaseText = newPhase === 2 ? '⚠ 阶段2' : '⚡ 阶段3'
      setBossPhaseText(bs.phaseText)
      setShowBossPhase(true)
      setTimeout(() => setShowBossPhase(false), 1500)
      return
    }

    // 获取当前攻击模式
    const patterns = getBossPatterns(boss.bossIndex)
    const currentPattern = patterns ? patterns[bs.phase - 1] : null

    // 执行攻击
    if (currentPattern) {
      executeBossPattern(boss, player, state, currentPattern, currentTime)
    }
  }

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
          const steerStrength = bullet.isSuperTracking ? 0.7 : 0.5
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
      if (bullet.vx) bullet.x += bullet.vx
      return bullet.y > -20 && bullet.y < CANVAS_HEIGHT + 10 && bullet.x > -20 && bullet.x < CANVAS_WIDTH + 20
    })

    // Update stars
    state.stars.forEach(star => {
      star.y += star.speed
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0
        star.x = Math.random() * CANVAS_WIDTH
      }
    })

    // Spawn enemies - Boss战期间不生成普通敌机
    state.spawnTimer += deltaTime
    const levelConfig = getLevelConfig(state.level)
    const spawnDelay = Math.max(400, levelConfig.spawnInterval)

    // 检查是否触发Boss
    if (!state.bossState.active && !state.bossState.cleared && !state.isGameOver) {
      const triggeredIndex = BOSS_CONFIG.findIndex((_, i) => {
        const threshold = getBossScore(i)
        return state.score >= threshold && !state.bossState.defeatedBosses.includes(threshold)
      })
      if (triggeredIndex !== -1) {
        initBoss(state, BOSS_CONFIG[triggeredIndex], triggeredIndex)
      }
    }

    // Boss恢复计时器
    if (state.bossState.restoreTimer > 0) {
      state.bossState.restoreTimer -= deltaTime
    }

    if (!state.bossState.active && state.spawnTimer >= spawnDelay && state.bossState.restoreTimer <= 0) {
      state.spawnTimer = 0
      spawnEnemy(state)
    }

    // 更新Boss
    if (state.bossState.active) {
      updateBoss(state, deltaTime, currentTime)

      // 更新Boss特殊弹（追踪弹、回旋弹）
      state.bossState.bossSpecialBullets = state.bossState.bossSpecialBullets.filter(bb => {
        if (bb.tracking) {
          const dx2 = state.player.x - bb.x
          const dy2 = state.player.y - bb.y
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
          bb.vx += (dx2 / dist2) * 0.3
          bb.vy += (dy2 / dist2) * 0.3
          const cs = Math.sqrt(bb.vx * bb.vx + bb.vy * bb.vy)
          if (cs > 0) { bb.vx = (bb.vx / cs) * bb.trackSpeed; bb.vy = (bb.vy / cs) * bb.trackSpeed }
        }
        if (bb.boomerang) {
          // 回旋弹：持续弯曲
          bb.vy += 0.15 // 重力效果
          bb.vx += (bb.originX - bb.x) * bb.curveStrength // 回旋效果
        }
        bb.x += bb.vx
        bb.y += bb.vy
        bb.life -= deltaTime * 0.0008
        return bb.y > -20 && bb.y < CANVAS_HEIGHT + 20 && bb.x > -20 && bb.x < CANVAS_WIDTH + 20 && bb.life > 0
      })

      // 更新Boss激光寿命
      state.bossState.lasers = state.bossState.lasers.filter(l => {
        l.life -= deltaTime * 0.001
        return l.life > 0
      })
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
              if (levelUpTimeoutRef.current) clearTimeout(levelUpTimeoutRef.current)
              setShowLevelUp(true)
              levelUpTimeoutRef.current = setTimeout(() => {
                setShowLevelUp(false)
                levelUpTimeoutRef.current = null
              }, 1500)
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

    // Player bullets vs Boss
    if (state.bossState.active && state.bossState.boss && !state.bossState.phaseTransition) {
      const boss = state.bossState.boss
      if (boss.y >= boss.targetY) { // Boss已入场
        state.bullets = state.bullets.filter(bullet => {
          const dbx = bullet.x - boss.x
          const dby = bullet.y - boss.y
          if (Math.abs(dbx) < boss.width / 2 + 5 && Math.abs(dby) < boss.height / 2 + 5 && boss.y >= boss.targetY) {
            boss.hp -= (bullet.damage || 1)
            createExplosion(bullet.x, bullet.y, '#ffff00', 3)
            if (boss.hp <= 0) {
              // Boss被击败
              createExplosion(boss.x, boss.y, '#ffffff', 60)
              for (let pi = 0; pi < 50; pi++) {
                state.particles.push({
                  x: boss.x + (Math.random() - 0.5) * boss.width,
                  y: boss.y + (Math.random() - 0.5) * boss.height,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  life: 1,
                  decay: 0.008 + Math.random() * 0.015,
                  color: ['#ff3333', '#ff9900', '#ffff00', '#ffffff'][Math.floor(Math.random() * 4)],
                  size: Math.random() * 6 + 3,
                })
              }
              // 掉落道具
              spawnPowerup(boss.x - 30, boss.y)
              spawnPowerup(boss.x, boss.y)
              spawnPowerup(boss.x + 30, boss.y)

              // 标记击败（记录分数阈值）
              state.bossState.defeatedBosses.push(boss.score)
              state.bossState.active = false
              state.bossState.boss = null
              state.bossState.lasers = []
              state.bossState.bossSpecialBullets = []
              state.bossState.restoreTimer = 3000 // 3秒后恢复
              state.bossState.showDefeatText = true
              state.bossState.defeatTextTimer = 2000
              setShowBossDefeat(true)
              setTimeout(() => setShowBossDefeat(false), 2000)

              // 检查通关
              if (state.bossState.defeatedBosses.length >= 10) {
                state.bossState.cleared = true
                setBossCleared(true)
                state.isGameOver = true
                setIsGameOver(true)
                state.enemies = []
                state.enemyBullets = []
                state.bullets = []
                // 最终分数保存
                if (state.score > bestScore) {
                  setBestScore(state.score)
                  localStorage.setItem(STORAGE_KEY, state.score.toString())
                }
              }
            }
            return false
          }
          return true
        })
      }
    }

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

      // Player vs Boss special bullets
      state.bossState.bossSpecialBullets = state.bossState.bossSpecialBullets.filter(bb => {
        const dx = bb.x - state.player.x
        const dy = bb.y - state.player.y
        if (Math.abs(dx) < PLAYER_SIZE / 2 + 3 && Math.abs(dy) < PLAYER_SIZE / 2 + 3) {
          if (state.shieldActive) {
            state.shieldActive = false
            createExplosion(bb.x, bb.y, '#4e9ef0', 10)
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

      // Player vs Boss lasers
      if (!state.shieldActive) {
        for (const laser of state.bossState.lasers) {
          // 简化激光碰撞：检测玩家是否在激光束上
          const ldx = state.player.x - laser.x
          const ldy = state.player.y - laser.y
          // 激光方向上的投影
          const projDist = Math.abs(-Math.sin(laser.angle) * ldx + Math.cos(laser.angle) * ldy)
          const alongDist = Math.cos(laser.angle) * ldx + Math.sin(laser.angle) * ldy
          if (projDist < laser.width / 2 + PLAYER_SIZE / 2 && alongDist > -20 && alongDist < CANVAS_HEIGHT) {
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
            break
          }
        }
      }
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
      if (enemy.hp < enemy.maxHp) {
        const barWidth = enemy.width
        const barHeight = 4
        ctx.fillStyle = '#333'
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 10, barWidth, barHeight)
        ctx.fillStyle = '#00ff00'
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 10,
          barWidth * (enemy.hp / enemy.maxHp), barHeight)
      }
    })

    // Draw enemy bullets
    ctx.fillStyle = '#ff6b6b'
    state.enemyBullets.forEach(bullet => {
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, bullet.isBoss ? 6 : 5, 0, Math.PI * 2)
      ctx.fill()
      if (bullet.isBoss) {
        ctx.strokeStyle = '#ffaa00'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    })

    // Draw Boss special bullets (tracking, boomerang)
    state.bossState.bossSpecialBullets.forEach(bb => {
      if (bb.tracking) {
        // 追踪弹 - 紫色
        ctx.fillStyle = '#a855f7'
        ctx.shadowBlur = 8
        ctx.shadowColor = '#a855f7'
        ctx.beginPath()
        ctx.arc(bb.x, bb.y, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else if (bb.boomerang) {
        // 回旋弹 - 橙色
        ctx.fillStyle = '#ff8800'
        ctx.shadowBlur = 6
        ctx.shadowColor = '#ff8800'
        ctx.beginPath()
        ctx.arc(bb.x, bb.y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    })

    // Draw Boss
    if (state.bossState.active && state.bossState.boss) {
      const boss = state.bossState.boss
      const bs = state.bossState

      // Boss闪烁效果（阶段切换时）
      if (bs.phaseTransition && Math.floor(Date.now() / 50) % 2 === 0) {
        // 跳过绘制（闪烁）
      } else {
        const bossImgData = imagesRef.current[boss.imageKey]
        const bossSize = boss.width

        if (bossImgData && bossImgData.loaded) {
          ctx.drawImage(bossImgData.img, boss.x - bossSize / 2, boss.y - bossSize / 2, bossSize, bossSize)
        } else {
          // Fallback
          ctx.fillStyle = '#ff3333'
          ctx.fillRect(boss.x - bossSize / 2, boss.y - bossSize / 2, bossSize, bossSize)
        }

        // Boss HP bar (屏幕顶部)
        const hpBarWidth = 400
        const hpBarHeight = 12
        const hpBarX = CANVAS_WIDTH / 2 - hpBarWidth / 2
        const hpBarY = 10
        const hpRatio = boss.hp / boss.maxHp

        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.fillRect(hpBarX - 2, hpBarY - 2, hpBarWidth + 4, hpBarHeight + 4)

        // HP条
        const hpGradient = ctx.createLinearGradient(hpBarX, 0, hpBarX + hpBarWidth, 0)
        hpGradient.addColorStop(0, '#ff3333')
        hpGradient.addColorStop(0.5, '#ff9900')
        hpGradient.addColorStop(1, '#ff3333')
        ctx.fillStyle = hpGradient
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpRatio, hpBarHeight)

        // 边框
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight)

        // Boss名称和等级
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`${boss.name} (${boss.score}分) | 阶段 ${bs.phase}/3`, CANVAS_WIDTH / 2, hpBarY + hpBarHeight + 18)

        // HP数字
        ctx.fillText(`${boss.hp} / ${boss.maxHp}`, CANVAS_WIDTH / 2, hpBarY + hpBarHeight + 35)
      }
    }

    // Draw Boss lasers
    state.bossState.lasers.forEach(laser => {
      ctx.save()
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = laser.width
      ctx.shadowBlur = 15
      ctx.shadowColor = '#ff0000'
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      const len = CANVAS_HEIGHT * 1.5
      const endX = laser.x + Math.cos(laser.angle) * len
      const endY = laser.y + Math.sin(laser.angle) * len
      const startX = laser.x - Math.cos(laser.angle) * len
      const startY = laser.y - Math.sin(laser.angle) * len
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      // 内层亮线
      ctx.strokeStyle = '#ff6666'
      ctx.lineWidth = laser.width * 0.4
      ctx.shadowBlur = 8
      ctx.shadowColor = '#ffffff'
      ctx.globalAlpha = 0.9
      ctx.stroke()
      ctx.restore()
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
          {isGameOver && !bossCleared && (
            <div className="absolute inset-0 bg-black/85 rounded-lg flex flex-col items-center justify-center gap-5 backdrop-blur-sm">
              <div className="text-[#ff4757] text-5xl font-bold">
                游戏结束
              </div>
              <div className="text-white text-2xl">
                得分: <span className="text-[#00e5f0] text-4xl">{score}</span>
              </div>
              <button
                onClick={startGame}
                className="px-12 py-3.5 text-lg bg-gradient-to-b from-[#00e5f0] to-[#00b8d4] text-white rounded-xl font-bold cursor-pointer transition-all duration-100 border-t border-[#5cf0ff] shadow-[0_4px_0_#008899,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#008899,0_6px_15px_rgba(0,229,240,0.4)] active:shadow-[0_2px_0_#008899,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1"              >                再玩一次              </button>            </div>          )}          {/* 等级提升特效 */}          {showLevelUp && (            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">              <div className="animate-bounce text-[#ffe066] text-6xl font-bold drop-shadow-[0_0_20px_rgba(255,224,102,0.8)]">                Lv.{gameLevel}!              </div>            </div>          )}          {/* 武器升级特效 */}          {showWeaponUp && (            <div className="absolute top-1/2 left-1/2 pointer-events-none -translate-x-1/2 -translate-y-1/2">              <div className="animate-bounce text-[#ff3333] text-5xl font-bold drop-shadow-[0_0_25px_rgba(255,51,51,0.9)]">                ⬆ 武器升级 Lv.{weaponLevel}!</div>            </div>          )}          {/* 武器降级特效 */}          {showWeaponDown && (            <div className="absolute top-1/2 left-1/2 pointer-events-none -translate-x-1/2 -translate-y-1/2">              <div className="animate-pulse text-[#888888] text-4xl font-bold drop-shadow-[0_0_15px_rgba(136,136,136,0.7)]">                ⬇ 武器降级 Lv.{weaponLevel}</div>            </div>          )}          {/* Boss阶段提示 */}          {showBossPhase && (            <div className="absolute top-1/4 left-1/2 pointer-events-none -translate-x-1/2">              <div className="animate-pulse text-[#ff6600] text-5xl font-bold drop-shadow-[0_0_20px_rgba(255,102,0,0.9)]">                {bossPhaseText}              </div>            </div>          )}          {/* Boss击败提示 */}          {showBossDefeat && (            <div className="absolute top-1/3 left-1/2 pointer-events-none -translate-x-1/2">              <div className="animate-bounce text-[#ffe066] text-4xl font-bold drop-shadow-[0_0_20px_rgba(255,224,102,0.9)]">                🎉 Boss击败！              </div>            </div>          )}          {/* 通关覆盖层 */}          {bossCleared && (            <div className="absolute inset-0 bg-black/90 rounded-lg flex flex-col items-center justify-center gap-5 backdrop-blur-sm">              <div className="text-[#ffd700] text-5xl font-bold text-center drop-shadow-[0_0_30px_rgba(255,215,0,0.9)]">                🎉 恭喜通关！<br/>你击败了所有Boss！              </div>              <div className="text-white text-2xl">                最终得分: <span className="text-[#00e5f0] text-4xl">{score}</span>              </div>              <button                onClick={startGame}                className="px-12 py-3.5 text-lg bg-gradient-to-b from-[#ffd700] to-[#ff8c00] text-white rounded-xl font-bold cursor-pointer transition-all duration-100 border-t border-[#ffed4a] shadow-[0_4px_0_#cc7000,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#cc7000,0_6px_15px_rgba(255,215,0,0.4)] active:shadow-[0_2px_0_#cc7000,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1"              >                再玩一次              </button>            </div>          )}        </div>

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