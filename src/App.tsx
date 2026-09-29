import React, { useState, useEffect, useCallback, useRef } from 'react'
import { GameState, loadState, saveState, createInitialState, addExp, getRandomQuote, getStage, getTreeName, getLevelExp, getTodayStr, getYesterdayStr, REWARDS, Book, Chapter } from './gameStore'

const USER_ID = 'default_user'
const CRED_KEY = 'growthTree:v1:saved_cred'

type Page = 'tree' | 'read' | 'think' | 'profile' | 'library' | 'book-detail' | 'chapter-read' | 'notes'

function loadSavedCred(): { username: string; password: string; remember: boolean } {
  try {
    const raw = localStorage.getItem(CRED_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { username: '', password: '', remember: false }
}

function saveCred(username: string, password: string, remember: boolean) {
  try {
    if (remember) {
      localStorage.setItem(CRED_KEY, JSON.stringify({ username, password, remember }))
    } else {
      localStorage.removeItem(CRED_KEY)
    }
  } catch {}
}

// 阅读页字号档位（仅作用于书籍正文，UI 不受影响）
const FONT_KEY = 'growthTree:fontScale'
const FONT_SIZES = [
  { label: '小', px: 14 },
  { label: '中', px: 16 },
  { label: '大', px: 18 },
  { label: '特大', px: 20 },
]
const DEFAULT_FONT_PX = 16

function loadFontPx(): number {
  try {
    const raw = localStorage.getItem(FONT_KEY)
    if (raw) {
      const n = parseInt(raw, 10)
      if (FONT_SIZES.some(f => f.px === n)) return n
    }
  } catch {}
  return DEFAULT_FONT_PX
}

function saveFontPx(px: number) {
  try {
    localStorage.setItem(FONT_KEY, String(px))
  } catch {}
}

export default function App() {
  const savedCred = loadSavedCred()
  const [state, setState] = useState<GameState>(() => loadState(USER_ID))
  const [page, setPage] = useState<Page>('tree')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [showLogin, setShowLogin] = useState(true)
  const [username, setUsername] = useState(savedCred.username)
  const [password, setPassword] = useState(savedCred.password)
  const [rememberPwd, setRememberPwd] = useState(savedCred.remember)
  const [showRegister, setShowRegister] = useState(false)
  const [phone, setPhone] = useState('')
  const [notifications, setNotifications] = useState<string[]>([])
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null)
  const [showData, setShowData] = useState(false)
  const [userDataStr, setUserDataStr] = useState('')

  const saveRef = useRef(state)
  saveRef.current = state

  useEffect(() => {
    saveState(USER_ID, state)
  }, [state])

  const notify = useCallback((msg: string) => {
    setNotifications(prev => [...prev, msg])
    setTimeout(() => setNotifications(prev => prev.slice(1)), 2000)
  }, [])

  const handleDailyLogin = useCallback(() => {
    const today = getTodayStr()
    const yesterday = getYesterdayStr()
    
    // Check if already checked in today using checkInDates array
    if ((state.dailyTask.checkInDates || []).includes(today)) {
      notify('今日已签到')
      return
    }
    
    // Batch all state updates together
    setState(prev => {
      // Double-check within the updater to prevent race conditions
      if ((prev.dailyTask.checkInDates || []).includes(today)) {
        setTimeout(() => notify('今日已签到'), 0)
        return prev
      }
      
      const ud = { ...prev.userData }
      const dt = { ...prev.dailyTask }
      
      dt.login = true
      dt.refreshDate = today
      dt.checkInDates = [...(dt.checkInDates || []), today]
      
      // Check continuous days using latest prev state
      const isContinuous = ud.lastCheckDate === yesterday
      ud.continueDay = isContinuous ? ud.continueDay + 1 : 1
      ud.lastCheckDate = today
      
      // Calculate exp
      let exp = REWARDS.DAILY_LOGIN
      if (ud.continueDay >= 7) exp += REWARDS.CONTINUE_BONUS
      
      // Apply EXP and level-up within the same batch
      const result = addExp({ ...prev, userData: ud, dailyTask: dt }, exp)
      const reason = '签到' + (ud.continueDay >= 7 ? ' (连续7天奖励)' : '')
      
      // Use setTimeout to show notification after render commits
      setTimeout(() => notify(`+${exp} EXP ${reason}`), 0)
      for (const ev of result.events) {
        if (ev.type === 'levelUp') {
          setTimeout(() => notify(`🎉 升级！Lv.${ev.level}`), 100)
        }
        if (ev.type === 'stageChange') {
          setTimeout(() => {
            const stage = getStage(ev.level)
            notify(`🌱 进入新阶段：${stage.name}`)
          }, 200)
        }
      }
      
      return result.state
    })
  }, [state, notify])

  const handleReadSubmit = useCallback((bookId: string, chapterId: number) => {
    const today = getTodayStr()
    
    setState(prev => {
      const dt = { ...prev.dailyTask }
      
      if (dt.refreshDate !== today) {
        dt.readSubmit = false
        dt.thinkSubmit = false
        dt.thinkSubmitCount = 0
        dt.eggCount = 0
        dt.refreshDate = today
      }
      
      // 检查该章节是否已被该用户永久标记已读
      const targetBook = prev.bookList.find(b => b.bookId === bookId)
      if (targetBook && (targetBook.readChapters || []).includes(chapterId)) {
        setTimeout(() => notify('该章节已阅读过'), 0)
        return prev
      }
      
      if (dt.readSubmit) {
        setTimeout(() => notify('今日阅读打卡已提交'), 0)
        return prev
      }
      
      const books = prev.bookList.map(b => {
        if (b.bookId !== bookId) return b
        const progress = Math.min(100, b.readProgress + Math.round(100 / b.chapters.length))
        const records = [...b.readRecords, `${today} - 完成章节 ${chapterId}`]
        const readCh = [...(b.readChapters || []), chapterId]
        return { ...b, readProgress: progress, readRecords: records, lastReadChapter: chapterId, readChapters: readCh }
      })
      
      dt.readSubmit = true
      
      const result = addExp({ ...prev, bookList: books, dailyTask: dt }, REWARDS.READ_SUBMIT)
      setTimeout(() => notify(`+${REWARDS.READ_SUBMIT} EXP 阅读打卡`), 0)
      
      return result.state
    })
  }, [notify])

  const handleThinkSubmit = useCallback((bookId: string, chapterId: number, note: string) => {
    const today = getTodayStr()
    
    setState(prev => {
      const dt = { ...prev.dailyTask }
      
      if (dt.refreshDate !== today) {
        dt.readSubmit = false
        dt.thinkSubmit = false
        dt.thinkSubmitCount = 0
        dt.eggCount = 0
        dt.refreshDate = today
      }
      
      if (dt.thinkSubmitCount >= REWARDS.THINK_DAILY_MAX) {
        setTimeout(() => notify('今日拆解次数已达上限'), 0)
        return prev
      }
      
      const books = prev.bookList.map(b => {
        if (b.bookId !== bookId) return b
        const progress = Math.min(100, b.thinkProgress + Math.round(100 / b.chapters.length))
        const records = [...b.thinkRecords, `${today} [${chapterId}] - ${note}`]
        return { ...b, thinkProgress: progress, thinkRecords: records }
      })
      
      dt.thinkSubmit = true
      dt.thinkSubmitCount += 1
      
      const result = addExp({ ...prev, bookList: books, dailyTask: dt }, REWARDS.THINK_SUBMIT)
      setTimeout(() => notify(`+${REWARDS.THINK_SUBMIT} EXP 思维拆解`), 0)
      
      return result.state
    })
  }, [notify])

  const handleDeleteNote = useCallback((bookId: string, chapterId: number) => {
    setState(prev => {
      const books = prev.bookList.map(b => {
        if (b.bookId !== bookId) return b
        const tag = `[${chapterId}]`
        const records = b.thinkRecords.filter(r => !r.includes(tag))
        return { ...b, thinkRecords: records }
      })
      return { ...prev, bookList: books }
    })
  }, [])

  const handleBookFinish = useCallback((bookId: string, summary: string) => {
    setState(prev => {
      const books = prev.bookList.map(b => {
        if (b.bookId !== bookId) return b
        return { ...b, status: 'finish' as const, finishTime: new Date().toISOString(), finishSummary: summary }
      })
      
      const ud = { ...prev.userData, totalReadBook: prev.userData.totalReadBook + 1 }
      const result = addExp({ ...prev, bookList: books, userData: ud }, REWARDS.BOOK_FINISH)
      
      const bookName = books.find(b => b.bookId === bookId)?.bookName || ''
      setTimeout(() => notify(`+${REWARDS.BOOK_FINISH} EXP 结业书籍`), 0)
      setTimeout(() => notify(`📚 《${bookName}》结业！`), 100)
      
      return result.state
    })
  }, [notify])

  // Login page
  if (showLogin && !loggedInUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-cream-100">
        <div className="surface rounded-2xl p-8 w-full max-w-sm animate-scale-in">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🌳</div>
            <h1 className="heading text-2xl">思维成长树</h1>
            <p className="text-xs text-moss-500 mt-1">读书 · 思考 · 成长</p>
          </div>

          <div className="space-y-4">
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-moss-200/60 bg-white/80 focus:border-tender-400 focus:outline-none transition text-sm"
              placeholder="用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-moss-200/60 bg-white/80 focus:border-tender-400 focus:outline-none transition text-sm"
              type="password"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-moss-500 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-moss-300 text-tender-500 focus:ring-tender-400"
                checked={rememberPwd}
                onChange={e => setRememberPwd(e.target.checked)}
              />
              记住密码
            </label>
            <button
              className="btn-gold w-full"
              onClick={() => {
                if (!username.trim()) { notify('请输入用户名'); return }
                if (!password.trim()) { notify('请输入密码'); return }
                saveCred(username.trim(), password.trim(), rememberPwd)
                setLoggedInUser(username)
                setShowLogin(false)
                notify(`欢迎回来，${username}！`)
              }}
            >
              登 录
            </button>
            <button className="btn-ghost w-full text-sm" onClick={() => { setShowRegister(true); setShowLogin(false) }}>
              注册账号
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Register page
  if (showRegister) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-cream-100">
        <div className="surface rounded-2xl p-8 w-full max-w-sm animate-scale-in">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🌱</div>
            <h1 className="heading text-2xl">注册新账号</h1>
            <p className="text-xs text-moss-500 mt-1">开启你的思维成长之旅</p>
          </div>
          <div className="space-y-4">
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-moss-200/60 bg-white/80 focus:border-tender-400 focus:outline-none transition text-sm"
              placeholder="用户名（2-12位中文/字母/数字）"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-moss-200/60 bg-white/80 focus:border-tender-400 focus:outline-none transition text-sm"
              type="password"
              placeholder="密码（6-16位）"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-moss-200/60 bg-white/80 focus:border-tender-400 focus:outline-none transition text-sm"
              type="password"
              placeholder="确认密码"
            />
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-moss-200/60 bg-white/80 focus:border-tender-400 focus:outline-none transition text-sm"
              type="tel"
              placeholder="手机号（选填，用于找回密码）"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <button
              className="btn-gold w-full"
              onClick={() => {
                if (!username.trim()) { notify('请输入用户名'); return }
                if (!password.trim()) { notify('请输入密码'); return }
                saveCred(username.trim(), password.trim(), rememberPwd)
                setLoggedInUser(username)
                setShowRegister(false)
                notify(`🎉 注册成功！欢迎 ${username}`)
              }}
            >
              注 册
            </button>
            <button className="btn-ghost w-full text-sm" onClick={() => { setShowRegister(false); setShowLogin(true) }}>
              已有账号？去登录
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-leaf-pattern">
      {/* Top bar */}
      <header className="shrink-0 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-moss-200/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌳</span>
          <span className="heading text-base">思维成长树</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-xs text-moss-500">{loggedInUser}</div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="numeral text-lg font-bold">{state.userData.level}</span>
            <div className="w-20 h-2 bg-moss-200 rounded-full overflow-hidden">
              <div className="h-full bg-tender-500 rounded-full transition-[width] duration-500" style={{ width: `${(state.userData.exp / state.userData.maxExp) * 100}%` }} />
            </div>
            <span className="text-xs text-moss-500">{state.userData.exp}/{state.userData.maxExp}</span>
          </div>
          <button className="text-xs text-moss-500 hover:text-moss-700" onClick={() => { setLoggedInUser(null); setShowLogin(true) }}>切换</button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {page === 'tree' && <TreePage state={state} onDailyLogin={handleDailyLogin} onNavigate={setPage} />}
        {page === 'read' && <ReadPage state={state} onRead={handleReadSubmit} onSelectBook={(b) => { setSelectedBook(b); setPage('book-detail') }} />}
        {page === 'think' && <NotesPage state={state} onDeleteNote={handleDeleteNote} />}
        {page === 'profile' && <ProfilePage state={state} />}
        {page === 'library' && <LibraryPage state={state} onSelectBook={(b) => { setSelectedBook(b); setPage('book-detail') }} />}
        {page === 'book-detail' && selectedBook && (
          <BookDetailPage
            book={selectedBook}
            state={state}
            onBack={() => setPage('library')}
            onRead={(ch) => { setSelectedChapter(ch); setPage('chapter-read') }}
            onFinish={handleBookFinish}
          />
        )}
        {page === 'chapter-read' && selectedBook && selectedChapter && (
          <ChapterReadPage
            book={state.bookList.find(b => b.bookId === selectedBook.bookId) || selectedBook}
            chapter={selectedChapter}
            state={state}
            onBack={() => setPage('book-detail')}
            onReadSubmit={handleReadSubmit}
            onThinkSubmit={handleThinkSubmit}
            onDeleteNote={handleDeleteNote}
            onNavigate={(ch) => { setSelectedChapter(ch); }}
          />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="shrink-0 bg-white/90 backdrop-blur-xl border-t border-moss-200/60 flex items-center justify-around py-2 px-4 pb-safe">
        {[
          { id: 'tree' as Page, icon: '🌳', label: '成长' },
          { id: 'read' as Page, icon: '📖', label: '阅读' },
          { id: 'think' as Page, icon: '📝', label: '笔记' },
          { id: 'library' as Page, icon: '📚', label: '书库' },
          { id: 'profile' as Page, icon: '👤', label: '我的' },
        ].map(item => (
          <button
            key={item.id}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${page === item.id ? 'text-tender-500' : 'text-stone-400'}`}
            onClick={() => setPage(item.id)}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 space-y-1">
          {notifications.map((msg, i) => (
            <div key={i} className="surface rounded-xl px-4 py-2 text-sm text-moss-700 animate-scale-in shadow-soft">
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* 显示数据按钮 */}
      <button
        className="fixed bottom-20 left-2 z-50 text-[10px] bg-white/80 border border-moss-300 rounded px-1.5 py-0.5 text-moss-600"
        onClick={() => {
          const raw = localStorage.getItem('growthTree:v1:user:default_user')
          setUserDataStr(raw ? JSON.stringify(JSON.parse(raw), null, 2) : '无数据')
          setShowData(true)
        }}
      >
        📊
      </button>

      {showData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowData(false)}>
          <pre className="bg-white text-xs text-moss-900 p-4 rounded-xl max-w-full max-h-[80vh] overflow-auto whitespace-pre-wrap font-mono" onClick={e => e.stopPropagation()}>
            {userDataStr}
            <div className="mt-3 text-center">
              <button className="text-xs text-tender-500 underline" onClick={() => setShowData(false)}>关闭</button>
            </div>
          </pre>
        </div>
      )}
    </div>
  )
}

// ===== Compact Calendar Component (1/4 original height) =====

function CalendarView({ checkInDates }: { checkInDates: string[] }) {
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const today = new Date()
  const todayStr = getTodayStr()
  
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  
  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }
  
  const cells: React.ReactNode[] = []
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />)
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isCheckIn = checkInDates.includes(dateStr)
    const isToday = dateStr === todayStr
    cells.push(
      <div
        key={d}
        className={`flex items-center justify-center rounded text-[10px] leading-none h-5 ${
          isToday ? 'bg-tender-500 text-white font-bold' : isCheckIn ? 'bg-green-100 text-green-700 font-medium' : 'text-moss-400'
        }`}
      >
        {isCheckIn ? '✓' : d}
      </div>
    )
  }
  
  return (
    <div className="text-[10px] leading-tight">
      {/* Header: nav + month */}
      <div className="flex items-center justify-between mb-1">
        <button onClick={goPrev} className="w-5 h-5 flex items-center justify-center hover:bg-moss-100 rounded text-moss-400">◀</button>
        <button onClick={goToday} className="text-[11px] font-medium text-moss-600 hover:text-tender-600 px-1">{viewYear}年{monthNames[viewMonth]}</button>
        <button onClick={goNext} className="w-5 h-5 flex items-center justify-center hover:bg-moss-100 rounded text-moss-400">▶</button>
      </div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-[1px]">
        {['日','一','二','三','四','五','六'].map(d => (
          <div key={d} className="text-center text-moss-400 text-[9px]">{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-[1px]">
        {cells}
      </div>
    </div>
  )
}

// ===== Pages =====

function TreePage({ state, onDailyLogin, onNavigate }: { state: GameState; onDailyLogin: () => void; onNavigate: (p: Page) => void }) {
  const stage = getStage(state.userData.level)
  const treeName = getTreeName(state.userData.level)
  const today = getTodayStr()
  const isCheckedIn = state.dailyTask.login && state.dailyTask.refreshDate === today
  
  const treeEmojis: Record<string, string> = {
    sprout: '🌱',
    branch: '🌿',
    leaf: '🌳',
    bud: '🌲',
    bloom: '🌸',
    tower: '🌴',
    infinite: '🌺',
  }

  return (
    <div className="p-4 space-y-4 animate-scale-in">
      {/* Tree display */}
      <div className="surface rounded-2xl p-6 text-center">
        <div className="text-7xl mb-2">{treeEmojis[treeName] || '🌱'}</div>
        <h2 className="heading text-xl mb-1">{stage.name}</h2>
        <p className="text-xs text-moss-500 mb-3">{stage.unlockHint}</p>
        
        {/* Level progress */}
        <div className="max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-moss-500 mb-1">
            <span>Lv.{state.userData.level}</span>
            <span>{state.userData.exp}/{state.userData.maxExp} EXP</span>
          </div>
          <div className="h-2.5 bg-moss-200 rounded-full overflow-hidden">
            <div className="h-full bg-gold-gradient rounded-full transition-[width] duration-500" style={{ width: `${(state.userData.exp / state.userData.maxExp) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Quote */}
      <div className="surface rounded-xl p-4 text-center">
        <p className="text-sm text-moss-600 italic leading-relaxed">"{getRandomQuote()}"</p>
      </div>

      {/* Daily check-in */}
      <button
        className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${isCheckedIn ? 'bg-moss-200 text-moss-500 cursor-default' : 'btn-gold'}`}
        onClick={onDailyLogin}
        disabled={isCheckedIn}
      >
        {isCheckedIn ? '✅ 今日已签到' : '☀️ 每日签到'}
      </button>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="surface rounded-xl p-4 text-left hover:shadow-soft-lg transition" onClick={() => onNavigate('read')}>
          <div className="text-2xl mb-1">📖</div>
          <div className="text-sm font-medium text-moss-700">开始阅读</div>
          <div className="text-[10px] text-moss-500">每日阅读打卡</div>
        </button>
        <button className="surface rounded-xl p-4 text-left hover:shadow-soft-lg transition" onClick={() => onNavigate('think')}>
          <div className="text-2xl mb-1">📝</div>
          <div className="text-sm font-medium text-moss-700">我的笔记</div>
          <div className="text-[10px] text-moss-500">查看所有思考笔记</div>
        </button>
      </div>

      {/* Stats - moved to bottom */}
      <div className="grid grid-cols-3 gap-2">
        <div className="surface rounded-xl p-3 text-center">
          <div className="numeral text-xl font-bold">{state.userData.continueDay}</div>
          <div className="text-[10px] text-moss-500">连续签到</div>
        </div>
        <div className="surface rounded-xl p-3 text-center">
          <div className="numeral text-xl font-bold">{state.userData.totalReadBook}</div>
          <div className="text-[10px] text-moss-500">结业书籍</div>
        </div>
        <div className="surface rounded-xl p-3 text-center">
          <div className="numeral text-xl font-bold">{state.userData.totalOutput}</div>
          <div className="text-[10px] text-moss-500">思维输出</div>
        </div>
      </div>

      {/* Calendar - compact, moved to bottom */}
      <div className="surface rounded-xl px-3 py-2.5">
        <h3 className="text-[11px] font-medium text-moss-700 mb-1.5">📅 签到日历</h3>
        <CalendarView checkInDates={state.dailyTask.checkInDates || []} />
      </div>
    </div>
  )
}

function ReadPage({ state, onRead, onSelectBook }: { state: GameState; onRead: (bookId: string, ch: number) => void; onSelectBook: (b: Book) => void }) {
  const availableBooks = state.bookList.filter(b => b.status !== 'lock')
  
  if (availableBooks.length === 0) {
    return (
      <div className="p-4 text-center mt-20 animate-scale-in">
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-moss-500">暂无可用书籍，继续升级解锁</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 animate-scale-in">
      <h2 className="heading text-lg mb-2">选择书籍阅读</h2>
      {availableBooks.map(book => (
        <div key={book.bookId} className="surface rounded-xl p-4 hover:shadow-soft-lg transition cursor-pointer" onClick={() => onSelectBook(book)}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-moss-700">{book.bookName}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${book.status === 'finish' ? 'bg-tender-100 text-tender-600' : 'bg-moss-50 text-moss-600'}`}>
              {book.status === 'finish' ? '已结业' : '阅读中'}
            </span>
          </div>
          <p className="text-xs text-moss-500 mb-2 line-clamp-2">{book.summary}</p>
          <div className="flex items-center gap-2 text-xs text-moss-500">
            <span>阅读进度</span>
            <div className="flex-1 h-1.5 bg-moss-200 rounded-full overflow-hidden">
              <div className="h-full bg-tender-500 rounded-full" style={{ width: `${book.readProgress}%` }} />
            </div>
            <span className="numeral">{book.readProgress}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function NotesPage({ state, onDeleteNote }: { state: GameState; onDeleteNote: (bookId: string, ch: number) => void }) {
  // Collect all think records from all books, newest first
  const allNotes: { bookName: string; chapterId: number; record: string; bookId: string }[] = []
  for (const book of state.bookList) {
    if (book.thinkRecords.length > 0) {
      for (const record of book.thinkRecords) {
        const chMatch = record.match(/\[(\d+)\]/)
        const chId = chMatch ? parseInt(chMatch[1]) : 0
        allNotes.push({ bookName: book.bookName, chapterId: chId, record, bookId: book.bookId })
      }
    }
  }
  // Sort by date (records start with date string like "2026-07-03 - ...")
  allNotes.sort((a, b) => {
    const dateA = a.record.match(/^\d{4}-\d{2}-\d{2}/)
    const dateB = b.record.match(/^\d{4}-\d{2}-\d{2}/)
    if (dateA && dateB) return dateB[0].localeCompare(dateA[0])
    return 0
  })

  if (allNotes.length === 0) {
    return (
      <div className="p-4 text-center mt-20 animate-scale-in">
        <div className="text-5xl mb-4">📝</div>
        <p className="text-moss-500">暂无笔记，读完章节后写下你的思考吧</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 animate-scale-in">
      <h2 className="heading text-lg mb-2">我的笔记</h2>
      <p className="text-[10px] text-moss-400 mb-3">共 {allNotes.length} 条笔记</p>
      {allNotes.map((note, i) => {
        const dateMatch = note.record.match(/^(\d{4}-\d{2}-\d{2})/)
        const dateStr = dateMatch ? dateMatch[1] : ''
        const content = note.record.replace(/^\d{4}-\d{2}-\d{2} \[\d+\] - /, '')
        return (
          <div key={i} className="surface rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-tender-600">{note.bookName}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-moss-400">{dateStr}</span>
                {note.chapterId > 0 && (
                  <button
                    className="text-[10px] text-red-300 hover:text-red-500 transition"
                    onClick={() => { if (confirm('删除此笔记？')) onDeleteNote(note.bookId, note.chapterId) }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-moss-700 leading-relaxed">{content}</p>
          </div>
        )
      })}
    </div>
  )
}

function ProfilePage({ state }: { state: GameState }) {
  return (
    <div className="p-4 space-y-4 animate-scale-in">
      <div className="surface rounded-2xl p-6 text-center">
        <div className="text-5xl mb-2">🌳</div>
        <h2 className="heading text-xl">成长记录</h2>
        <p className="text-xs text-moss-500 mt-1">{state.userData.stage} · Lv.{state.userData.level}</p>
      </div>

      <div className="surface rounded-xl p-4">
        <h3 className="text-sm font-medium text-moss-700 mb-3">详细数据</h3>
        <div className="space-y-2 text-sm">
          {[
            ['等级', `Lv.${state.userData.level}`],
            ['经验值', `${state.userData.exp} / ${state.userData.maxExp}`],
            ['成长阶段', state.userData.stage],
            ['连续签到', `${state.userData.continueDay} 天`],
            ['结业书籍', `${state.userData.totalReadBook} 本`],
            ['思维输出', `${state.userData.totalOutput} 次`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-moss-200/40 last:border-0">
              <span className="text-moss-500">{label}</span>
              <span className="font-medium text-moss-700">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="surface rounded-xl p-4">
        <h3 className="text-sm font-medium text-moss-700 mb-3">阶段说明</h3>
        <div className="space-y-2">
          {state.bookList.filter(b => b.status === 'unlock' || b.status === 'finish').map(book => (
            <div key={book.bookId} className="flex items-center gap-2 text-sm">
              <span className={book.status === 'finish' ? 'text-tender-500' : 'text-moss-500'}>
                {book.status === 'finish' ? '✅' : '📖'}
              </span>
              <span className="text-moss-700">{book.bookName}</span>
              {book.status === 'finish' && <span className="text-[10px] text-tender-500">已结业</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LibraryPage({ state, onSelectBook }: { state: GameState; onSelectBook: (b: Book) => void }) {
  const unlockBooks: Book[] = []
  const finishBooks: Book[] = []
  const lockedBooks: Book[] = []
  for (const b of state.bookList) {
    if (b.status === 'finish') finishBooks.push(b)
    else if (b.status === 'unlock') unlockBooks.push(b)
    else lockedBooks.push(b)
  }

  return (
    <div className="p-4 space-y-4 animate-scale-in">
      <h2 className="heading text-lg mb-2">我的书库</h2>
      
      {/* Unlocked books */}
      {unlockBooks.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-moss-500 mb-2 uppercase tracking-wider">阅读中</h3>
          <div className="space-y-2">
            {unlockBooks.map(book => <BookCard key={book.bookId} book={book} onClick={() => onSelectBook(book)} />)}
          </div>
        </div>
      )}

      {/* Finished books */}
      {finishBooks.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-moss-500 mb-2 uppercase tracking-wider">已结业</h3>
          <div className="space-y-2">
            {finishBooks.map(book => <BookCard key={book.bookId} book={book} onClick={() => onSelectBook(book)} />)}
          </div>
        </div>
      )}

      {/* Locked books */}
      {lockedBooks.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-moss-500 mb-2 uppercase tracking-wider">未解锁</h3>
          <div className="space-y-2 opacity-60">
            {lockedBooks.map(book => (
              <div key={book.bookId} className="surface rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-moss-700">{book.bookName}</h3>
                  <span className="text-xs text-moss-400">Lv.{book.unlockLevel} 解锁</span>
                </div>
                <p className="text-xs text-moss-500 mt-1">{book.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <div className="surface rounded-xl p-4 hover:shadow-soft-lg transition cursor-pointer active:scale-[0.98]" onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-moss-700">{book.bookName}</h3>
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: book.branchColor }} />
      </div>
      <p className="text-xs text-moss-500 mb-2 line-clamp-2">{book.summary}</p>
      <div className="flex items-center gap-2 text-xs text-moss-500">
        <span>阅读</span>
        <div className="flex-1 h-1 bg-moss-200 rounded-full overflow-hidden">
          <div className="h-full bg-tender-500 rounded-full" style={{ width: `${book.readProgress}%` }} />
        </div>
        <span className="numeral">{book.readProgress}%</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-moss-500 mt-1">
        <span>拆解</span>
        <div className="flex-1 h-1 bg-moss-200 rounded-full overflow-hidden">
          <div className="h-full bg-tender-400 rounded-full" style={{ width: `${book.thinkProgress}%` }} />
        </div>
        <span className="numeral">{book.thinkProgress}%</span>
      </div>
    </div>
  )
}

function BookDetailPage({ book, state, onBack, onRead, onFinish }: {
  book: Book
  state: GameState
  onBack: () => void
  onRead: (ch: Chapter) => void
  onFinish: (bookId: string, summary: string) => void
}) {
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [finishSummary, setFinishSummary] = useState('')
  
  const isFinished = book.status === 'finish'
  const canFinish = book.readProgress >= 100 && book.thinkProgress >= 100 && !isFinished
  
  const currentChapter = book.lastReadChapter ? book.chapters.find(ch => ch.chapterId === book.lastReadChapter) : null

  return (
    <div className="p-4 space-y-4 animate-scale-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button className="p-1.5 hover:bg-moss-50 rounded-lg transition" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h2 className="heading text-lg">{book.bookName}</h2>
          <p className="text-[10px] text-moss-500">
            {isFinished ? '✅ 已结业' : `${book.chapters.length} 个章节`}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="surface rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span>📖 阅读进度</span>
          <div className="flex-1 h-1.5 bg-moss-200 rounded-full overflow-hidden">
            <div className="h-full bg-tender-500 rounded-full transition-[width]" style={{ width: `${book.readProgress}%` }} />
          </div>
          <span className="numeral text-sm">{book.readProgress}%</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>🧠 拆解进度</span>
          <div className="flex-1 h-1.5 bg-moss-200 rounded-full overflow-hidden">
            <div className="h-full bg-tender-400 rounded-full transition-[width]" style={{ width: `${book.thinkProgress}%` }} />
          </div>
          <span className="numeral text-sm">{book.thinkProgress}%</span>
        </div>
      </div>

      {/* Chapters */}
      <div className="surface rounded-xl">
        <div className="px-4 py-3 border-b border-moss-200/60">
          <h3 className="text-sm font-medium text-moss-700">章节列表</h3>
        </div>
        <div className="divide-y divide-moss-200/40 max-h-96 overflow-y-auto">
          {book.chapters.map(ch => {
            const isCurrent = currentChapter?.chapterId === ch.chapterId
            const isRead = (book.readChapters || []).includes(ch.chapterId)
            return (
              <div
                key={ch.chapterId}
                className={`px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-moss-50 transition ${isCurrent ? 'bg-moss-50' : ''}`}
                onClick={() => onRead(ch)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs w-6 text-center shrink-0">{isRead ? '✅' : ch.chapterId}</span>
                  <span className="text-sm text-moss-700 truncate">{ch.title}</span>
                </div>
                <span className="text-[10px] text-moss-400 shrink-0">{ch.content.length}字</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Finish button */}
      {canFinish && (
        <button className="btn-gold w-full" onClick={() => setShowFinishDialog(true)}>
          🎓 申请结业此书籍
        </button>
      )}

      {/* Finish dialog */}
      {showFinishDialog && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4" onClick={() => setShowFinishDialog(false)}>
          <div className="surface rounded-2xl p-6 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="heading text-lg mb-3">结业总结</h3>
            <textarea
              className="w-full h-24 px-3 py-2 rounded-xl border border-moss-200/60 bg-white/80 text-sm resize-none focus:border-tender-400 focus:outline-none transition mb-3"
              placeholder="写下你的学习心得和收获..."
              value={finishSummary}
              onChange={e => setFinishSummary(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setShowFinishDialog(false)}>取消</button>
              <button className="btn-gold flex-1" onClick={() => { onFinish(book.bookId, finishSummary); setShowFinishDialog(false) }}>
                确认结业
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish info */}
      {isFinished && (
        <div className="surface rounded-xl p-4">
          <h3 className="text-sm font-medium text-moss-700 mb-2">结业信息</h3>
          <p className="text-xs text-moss-500">{book.finishSummary || '暂无总结'}</p>
          <p className="text-[10px] text-moss-400 mt-1">结业时间：{new Date(book.finishTime).toLocaleDateString('zh-CN')}</p>
        </div>
      )}
    </div>
  )
}

function ChapterReadPage({ book, chapter, state, onBack, onReadSubmit, onThinkSubmit, onDeleteNote, onNavigate }: {
  book: Book
  chapter: Chapter
  state: GameState
  onBack: () => void
  onReadSubmit: (bookId: string, ch: number) => void
  onThinkSubmit: (bookId: string, ch: number, note: string) => void
  onDeleteNote: (bookId: string, ch: number) => void
  onNavigate: (ch: Chapter) => void
}) {
  const [showThinkInput, setShowThinkInput] = useState(false)
  const [note, setNote] = useState('')
  const [fontPx, setFontPx] = useState(loadFontPx)
  const [showFontPanel, setShowFontPanel] = useState(false)

  const changeFont = (px: number) => {
    setFontPx(px)
    saveFontPx(px)
  }

  const today = getTodayStr()
  const isChapterRead = (book.readChapters || []).includes(chapter.chapterId)
  const alreadyRead = isChapterRead
  const hasNote = book.thinkRecords.some(r => r.includes(`[${chapter.chapterId}]`))

  const chIdx = book.chapters.findIndex(c => c.chapterId === chapter.chapterId)
  const prevCh = chIdx > 0 ? book.chapters[chIdx - 1] : null
  const nextCh = chIdx < book.chapters.length - 1 ? book.chapters[chIdx + 1] : null

  // Render markdown-like content
  const renderContent = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="heading text-[1.5em] mb-[0.75em] mt-[1em]">{line.slice(2)}</h1>
      if (line.startsWith('## ')) return <h2 key={i} className="heading text-[1.25em] mb-[0.5em] mt-[1em]">{line.slice(3)}</h2>
      if (line.startsWith('### ')) return <h3 key={i} className="heading text-[1.125em] mb-[0.5em] mt-[0.75em]">{line.slice(4)}</h3>
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-moss-700 mb-[0.5em]">{line.slice(2, -2)}</p>
      if (line.trim() === '---') return <hr key={i} className="my-[1em] border-moss-200/60" />
      if (line.trim() === '') return <div key={i} className="h-[0.5em]" />
      // Image markdown: ![alt](src)
      const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/)
      if (imgMatch) return <div key={i} className="my-3 flex justify-center"><img src={imgMatch[2].replace(/^\//, '')} alt={imgMatch[1]} className="max-w-full rounded-lg" loading="lazy" /></div>
      return <p key={i} className="text-moss-700 leading-relaxed mb-[0.4em]">{line}</p>
    })
  }

  return (
    <div className="h-full flex flex-col animate-scale-in">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-moss-200/60 flex items-center gap-3">
        <button className="p-1.5 hover:bg-moss-50 rounded-lg transition" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-moss-700 truncate">{chapter.title}</h2>
          <p className="text-[10px] text-moss-400">{book.bookName}</p>
        </div>
        <button
          className="ml-auto shrink-0 px-2 py-1 rounded-lg text-xs font-semibold text-moss-600 hover:bg-moss-50 transition"
          onClick={() => setShowFontPanel(v => !v)}
          title="调整字号"
        >
          A<span className="text-[10px]">A</span>
        </button>
      </div>

      {/* 字号调节面板 */}
      {showFontPanel && (
        <div className="shrink-0 px-4 pb-2 bg-white/80 backdrop-blur-sm border-b border-moss-200/60 flex items-center gap-2">
          <span className="text-[10px] text-moss-400 shrink-0">字号</span>
          {FONT_SIZES.map(f => (
            <button
              key={f.px}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${fontPx === f.px ? 'bg-tender-100 text-tender-700' : 'bg-moss-50 text-moss-600 hover:bg-moss-100'}`}
              onClick={() => changeFont(f.px)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="surface rounded-2xl p-5 max-w-2xl mx-auto" style={{ fontSize: `${fontPx}px` }}>
          {renderContent(chapter.content)}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 px-4 py-3 bg-white/90 backdrop-blur-xl border-t border-moss-200/60 flex gap-2">
        <button
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${alreadyRead ? 'bg-moss-100 text-moss-500' : 'btn-gold'}`}
          onClick={() => {
            if (!alreadyRead) {
              onReadSubmit(book.bookId, chapter.chapterId)
              // Auto-prompt for notes after marking as read
              setTimeout(() => setShowThinkInput(true), 300)
            }
          }}
          disabled={alreadyRead}
        >
          {alreadyRead ? '✅ 已读' : '📖 标记已读 (+15 EXP)'}
        </button>
        <button
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${hasNote ? 'bg-moss-100 text-moss-500' : 'btn-ghost'}`}
          onClick={() => { if (!hasNote) setShowThinkInput(true) }}
          disabled={hasNote}
        >
          {hasNote ? '✅ 已写笔记' : '🧠 写笔记 (+30 EXP)'}
        </button>
        {hasNote && (
          <button
            className="py-2.5 px-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 transition"
            onClick={() => {
              if (confirm('删除此章节的笔记？')) {
                onDeleteNote(book.bookId, chapter.chapterId)
              }
            }}
          >
            🗑️
          </button>
        )}
      </div>

      {/* Chapter nav */}
      <div className="shrink-0 px-4 pb-3 bg-white/90 backdrop-blur-xl flex gap-2">
        {prevCh ? (
          <button
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-moss-50 text-moss-600 hover:bg-moss-100 transition"
            onClick={() => onNavigate(prevCh)}
          >
            ← {prevCh.chapterId}. {prevCh.title.substring(0, 14)}
          </button>
        ) : <div className="flex-1" />}
        {nextCh ? (
          <button
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-tender-100 text-tender-700 hover:bg-tender-200 transition"
            onClick={() => onNavigate(nextCh)}
          >
            {nextCh.chapterId}. {nextCh.title.substring(0, 14)} →
          </button>
        ) : <div className="flex-1" />}
      </div>

      {/* Think input modal */}
      {showThinkInput && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-end sm:items-center justify-center" onClick={() => setShowThinkInput(false)}>
          <div className="surface rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-medium text-moss-700 mb-3">读书笔记</h3>
            <textarea
              className="w-full h-28 px-3 py-2 rounded-xl border border-moss-200/60 bg-white/80 text-sm resize-none focus:border-tender-400 focus:outline-none transition mb-3"
              placeholder="这个模型如何应用到你的生活？..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setShowThinkInput(false)}>取消</button>
              <button
                className="btn-gold flex-1"
                disabled={!note.trim()}
                onClick={() => { onThinkSubmit(book.bookId, chapter.chapterId, note); setShowThinkInput(false); setNote('') }}
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
