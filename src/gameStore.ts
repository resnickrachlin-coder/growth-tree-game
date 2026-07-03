import { B1, Ql, Ye, Yl } from './initialBooks'

export type BookStatus = 'lock' | 'unlock' | 'finish'

export interface Book {
  bookId: string
  bookName: string
  status: BookStatus
  readProgress: number
  thinkProgress: number
  finishTime: string
  unlockLevel: number
  branchColor: string
  summary: string
  readRecords: string[]
  thinkRecords: string[]
  finishSummary: string
  chapters: Chapter[]
  lastReadChapter?: number
}

export interface Chapter {
  chapterId: number
  title: string
  content: string
}

export interface Stage {
  name: string
  minLevel: number
  maxLevel: number
  tree: string
  unlockHint: string
}

export interface UserData {
  level: number
  exp: number
  maxExp: number
  stage: string
  continueDay: number
  lastCheckDate: string
  totalReadBook: number
  totalOutput: number
}

export interface DailyTask {
  login: boolean
  readCheck: boolean
  thinkOutput: boolean
  eggGain: boolean
  eggCount: number
  refreshDate: string
  readSubmit: boolean
  thinkSubmit: boolean
  thinkSubmitCount: number
}

export interface GameState {
  userData: UserData
  dailyTask: DailyTask
  bookList: Book[]
  unlockAsset: {
    branchList: string[]
    skinList: string[]
    medalList: string[]
    backgroundList: string[]
  }
  logList: LogEntry[]
}

export interface LogEntry {
  type: string
  level: number
}

const STORAGE_KEY_PREFIX = 'growthTree:v1:user:'

function getStorageKey(userId: string): string {
  return STORAGE_KEY_PREFIX + userId
}

export function getLevelExp(level: number): number {
  return 100 + (level - 1) * 50
}

export function getStage(level: number): Stage {
  return Yl.find(s => level >= s.minLevel && level <= s.maxLevel) ?? Yl[Yl.length - 1]
}

export function getTreeName(level: number): string {
  return getStage(level).tree
}

export function createInitialState(): GameState {
  return {
    userData: {
      level: 1,
      exp: 0,
      maxExp: getLevelExp(1),
      stage: getStage(1).name,
      continueDay: 0,
      lastCheckDate: '',
      totalReadBook: 0,
      totalOutput: 0,
    },
    dailyTask: {
      login: false,
      readCheck: false,
      thinkOutput: false,
      eggGain: false,
      eggCount: 0,
      refreshDate: '',
      readSubmit: false,
      thinkSubmit: false,
      thinkSubmitCount: 0,
    },
    bookList: B1.map(b => ({ ...b })),
    unlockAsset: {
      branchList: [],
      skinList: [],
      medalList: [],
      backgroundList: [],
    },
    logList: [],
  }
}

export function getTodayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getYesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getNowISO(): string {
  return new Date().toISOString()
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

export function daysBetween(d1: string, d2: string): number {
  const a = parseDate(d1)
  const b = parseDate(d2)
  if (!a || !b) return NaN
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}

function ensureNum(val: unknown, fallback: number): number {
  return typeof val === 'number' && Number.isFinite(val) ? val : fallback
}

function sanitizeBook(book: Partial<Book>): Book {
  const validStatuses: BookStatus[] = ['lock', 'unlock', 'finish']
  return {
    bookId: book.bookId ?? '',
    bookName: book.bookName ?? '',
    status: validStatuses.includes(book.status as BookStatus) ? (book.status as BookStatus) : 'lock',
    readProgress: clamp(ensureNum(book.readProgress, 0), 0, 100),
    thinkProgress: clamp(ensureNum(book.thinkProgress, 0), 0, 100),
    finishTime: book.finishTime ?? '',
    unlockLevel: ensureNum(book.unlockLevel, 99),
    branchColor: book.branchColor ?? '#7FB069',
    summary: book.summary ?? '',
    readRecords: Array.isArray(book.readRecords) ? book.readRecords : [],
    thinkRecords: Array.isArray(book.thinkRecords) ? book.thinkRecords : [],
    finishSummary: book.finishSummary ?? '',
    chapters: Array.isArray(book.chapters) ? book.chapters : [],
    lastReadChapter: Math.max(0, ensureNum(book.lastReadChapter, 0)),
  }
}

function sanitizeUserData(data: Partial<UserData>): UserData {
  const level = Math.max(1, Math.trunc(ensureNum(data.level, 1)))
  return {
    level,
    exp: Math.max(0, ensureNum(data.exp, 0)),
    maxExp: getLevelExp(level),
    continueDay: Math.max(0, ensureNum(data.continueDay, 0)),
    lastCheckDate: data.lastCheckDate ?? '',
    totalReadBook: Math.max(0, ensureNum(data.totalReadBook, 0)),
    totalOutput: Math.max(0, ensureNum(data.totalOutput, 0)),
    stage: getStage(level).name,
  }
}

function mergeBooks(saved: Book[], defaults: Book[]): Book[] {
  const map = new Map(saved.map(b => [b.bookId, b]))
  return defaults.map(def => {
    const savedBook = map.get(def.bookId)
    if (!savedBook) return def
    return {
      ...def,
      ...savedBook,
      chapters: def.chapters,
      lastReadChapter: savedBook.lastReadChapter ?? def.lastReadChapter,
    }
  })
}

function sanitizeLog(log: Partial<LogEntry>): LogEntry {
  return {
    type: log.type ?? '',
    level: Math.max(1, Math.trunc(ensureNum(log.level, 1))),
  }
}

export function mergeState(saved: Partial<GameState>): GameState {
  const def = createInitialState()
  if (!saved || typeof saved !== 'object') return def

  const userData = sanitizeUserData({ ...def.userData, ...(saved.userData ?? {}) })
  const dailyTask = { ...def.dailyTask, ...(saved.dailyTask ?? {}) } as DailyTask
  dailyTask.eggCount = Math.max(0, ensureNum(dailyTask.eggCount, 0))
  dailyTask.thinkSubmitCount = Math.max(0, ensureNum(dailyTask.thinkSubmitCount, 0))

  const bookList = (
    Array.isArray(saved.bookList) && saved.bookList.length > 0
      ? mergeBooks(saved.bookList, def.bookList)
      : def.bookList
  ).map(sanitizeBook)

  const unlockAsset = { ...def.unlockAsset, ...(saved.unlockAsset ?? {}) }
  const logList = Array.isArray(saved.logList) ? saved.logList.map(sanitizeLog) : []

  return { userData, dailyTask, bookList, unlockAsset, logList }
}

export function loadState(userId: string): GameState {
  if (typeof window === 'undefined' || !userId) return createInitialState()
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId))
    return raw ? mergeState(JSON.parse(raw)) : createInitialState()
  } catch {
    console.warn('[growthTree] load failed, resetting')
    return createInitialState()
  }
}

export function saveState(userId: string, state: GameState): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(state))
  } catch (e) {
    console.warn('[growthTree] save failed:', e)
  }
}

export function clearState(userId: string): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    window.localStorage.removeItem(getStorageKey(userId))
  } catch (e) {
    console.warn('[growthTree] clear failed:', e)
  }
}

export function addExp(state: GameState, amount: number): { state: GameState; events: LogEntry[] } {
  if (amount <= 0) return { state, events: [] }
  
  const events: LogEntry[] = []
  const newState = { ...state }
  const ud = { ...newState.userData, exp: newState.userData.exp + amount }
  const books = newState.bookList.map(b => ({ ...b }))
  
  while (ud.exp >= ud.maxExp) {
    ud.exp -= ud.maxExp
    ud.level += 1
    ud.maxExp = getLevelExp(ud.level)
    events.push({ type: 'levelUp', level: ud.level })
    
    const stage = getStage(ud.level)
    if (stage.name !== ud.stage) {
      ud.stage = stage.name
      events.push({ type: 'stageChange', level: ud.level })
      
      // Unlock books
      for (const book of books) {
        if (book.status === 'lock' && ud.level >= book.unlockLevel) {
          book.status = 'unlock'
        }
      }
    }
  }
  
  ud.stage = getStage(ud.level).name
  newState.userData = ud
  newState.bookList = books
  newState.logList = [...newState.logList, ...events]
  
  return { state: newState, events }
}

export const REWARDS = Ye as Record<string, number>

export const QUOTES = Ql as string[]

export function getRandomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]
}

export const STAGES = Yl as Stage[]
