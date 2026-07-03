import React, { useState, useEffect, useCallback, useRef } from 'react'
import { GameState, loadState, saveState, createInitialState, addExp, getRandomQuote, getStage, getTreeName, getLevelExp, getTodayStr, REWARDS, Book, Chapter } from './gameStore'

const USER_ID = 'default_user'
const CRED_KEY = 'growthTree:v1:saved_cred'

type Page = 'tree' | 'read' | 'think' | 'profile' | 'library' | 'book-detail' | 'chapter-read'

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
  const [phone, setPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [showPhoneLogin, setShowPhoneLogin] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null)

  const saveRef = useRef(state)
  saveRef.current = state

  useEffect(() => {
    saveState(USER_ID, state)
  }, [state])

  const notify = useCallback((msg: string) => {
    setNotifications(prev => [...prev, msg])
    setTimeout(() => setNotifications(prev => prev.slice(1)), 2000)
  }, [])

  const addExpWithNotify = useCallback((amount: number, reason: string) => {
    const result = addExp(state, amount)
    setState(result.state)
    notify(`+${amount} EXP ${reason}`)
    for (const ev of result.events) {
      if (ev.type === 'levelUp') notify(`🎉 升级！Lv.${ev.level}`)
      if (ev.type === 'stageChange') {
        const stage = getStage(ev.level)
        notify(`🌱 进入新阶段：${stage.name}`)
      }
    }
  }, [state, notify])

  const handleDailyLogin = useCallback(() => {
    const today = getTodayStr()
    const ud = { ...state.userData }
    const dt = { ...state.dailyTask }
    
    if (dt.login && dt.refreshDate === today) {
      notify('今日已签到')
      return
    }
    
    dt.login = true
    dt.refreshDate = today
    
    // Check continue
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    
    if (ud.lastCheckDate === yStr) {
      ud.continueDay += 1
    } else {
      ud.continueDay = 1
    }
    ud.lastCheckDate = today
    
    setState(prev => ({ ...prev, userData: ud, dailyTask: dt }))
    
    // Add exp
    let exp = REWARDS.DAILY_LOGIN
    if (ud.continueDay >= 7) exp += REWARDS.CONTINUE_BONUS
    addExpWithNotify(exp, '签到' + (ud.continueDay >= 7 ? ' (连续7天奖励)' : ''))
  }, [state, addExpWithNotify, notify])

  const handleReadSubmit = useCallback((bookId: string, chapterId: number) => {
    const today = getTodayStr()
    const dt = { ...state.dailyTask }
    
    if (dt.refreshDate !== today) {
      dt.readSubmit = false
      dt.thinkSubmit = false
      dt.thinkSubmitCount = 0
      dt.eggCount = 0
      dt.refreshDate = today
    }
    
    if (dt.readSubmit) {
      notify('今日阅读打卡已提交')
      return
    }
    
    const books = state.bookList.map(b => {
      if (b.bookId !== bookId) return b
      const progress = Math.min(100, b.readProgress + Math.round(100 / b.chapters.length))
      const records = [...b.readRecords, `${today} - 完成章节 ${chapterId}`]
      return { ...b, readProgress: progress, readRecords: records, lastReadChapter: chapterId }
    })
    
    dt.readSubmit = true
    
    setState(prev => ({ ...prev, bookList: books, dailyTask: dt }))
    addExpWithNotify(REWARDS.READ_SUBMIT, '阅读打卡')
  }, [state, addExpWithNotify, notify])

  const handleThinkSubmit = useCallback((bookId: string, chapterId: number, note: string) => {
    const today = getTodayStr()
    const dt = { ...state.dailyTask }
    
    if (dt.refreshDate !== today) {
      dt.readSubmit = false
      dt.thinkSubmit = false
      dt.thinkSubmitCount = 0
      dt.eggCount = 0
      dt.refreshDate = today
    }
    
    if (dt.thinkSubmitCount >= REWARDS.THINK_DAILY_MAX) {
      notify('今日拆解次数已达上限')
      return
    }
    
    const books = state.bookList.map(b => {
      if (b.bookId !== bookId) return b
      const progress = Math.min(100, b.thinkProgress + Math.round(100 / b.chapters.length))
      const records = [...b.thinkRecords, `${today} - 拆解章节 ${chapterId}: ${note.substring(0, 50)}`]
      return { ...b, thinkProgress: progress, thinkRecords: records }
    })
    
    dt.thinkSubmit = true
    dt.thinkSubmitCount += 1
    
    setState(prev => ({ ...prev, bookList: books, dailyTask: dt }))
    addExpWithNotify(REWARDS.THINK_SUBMIT, '思维拆解')
  }, [state, addExpWithNotify, notify])

  const handleBookFinish = useCallback((bookId: string, summary: string) => {
    const books = state.bookList.map(b => {
      if (b.bookId !== bookId) return b
      return { ...b, status: 'finish' as const, finishTime: new Date().toISOString(), finishSummary: summary }
    })
    
    const ud = { ...state.userData, totalReadBook: state.userData.totalReadBook + 1 }
    
    setState(prev => ({ ...prev, bookList: books, userData: ud }))
    addExpWithNotify(REWARDS.BOOK_FINISH, '结业书籍')
    notify(`📚 《${books.find(b => b.bookId === bookId)?.bookName}》结业！`)
  }, [state, addExpWithNotify, notify])

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

          {!showPhoneLogin ? (
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
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 text-sm" onClick={() => { setShowRegister(true); setShowLogin(false) }}>
                  注册账号
                </button>
                <button className="btn-ghost flex-1 text-sm" onClick={() => setShowPhoneLogin(true)}>
                  手机号登录
                </button>
              </div>
            </div>
          ) : (
            /* Phone login */
            <div className="space-y-4">
              <input
                className="w-full px-4 py-2.5 rounded-xl border border-moss-200/60 bg-white/80 focus:border-tender-400 focus:outline-none transition text-sm"
                type="tel"
                placeholder="手机号"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-2.5 rounded-xl border border-moss-200/60 bg-white/80 focus:border-tender-400 focus:outline-none transition text-sm"
                  placeholder="验证码"
                  value={phoneCode}
                  onChange={e => setPhoneCode(e.target.value)}
                />
                <button className="btn-ghost text-xs shrink-0 px-3" onClick={() => notify('验证码已发送（演示）')}>
                  获取验证码
                </button>
              </div>
              <button
                className="btn-gold w-full"
                onClick={() => {
                  if (!phone.trim()) { notify('请输入手机号'); return }
                  if (!phoneCode.trim()) { notify('请输入验证码'); return }
                  setLoggedInUser(phone)
                  setShowLogin(false)
                  notify(`欢迎回来！`)
                }}
              >
                手机号登录
              </button>
              <button className="btn-ghost w-full text-sm" onClick={() => setShowPhoneLogin(false)}>
                返回账号密码登录
              </button>
            </div>
          )}
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
        {page === 'think' && <ThinkPage state={state} onSubmit={handleThinkSubmit} onSelectBook={(b) => { setSelectedBook(b); setPage('book-detail') }} />}
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
            book={selectedBook}
            chapter={selectedChapter}
            state={state}
            onBack={() => setPage('book-detail')}
            onReadSubmit={handleReadSubmit}
            onThinkSubmit={handleThinkSubmit}
            onNavigate={(ch) => { setSelectedChapter(ch); }}
          />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="shrink-0 bg-white/90 backdrop-blur-xl border-t border-moss-200/60 flex items-center justify-around py-2 px-4 pb-safe">
        {[
          { id: 'tree' as Page, icon: '🌳', label: '成长' },
          { id: 'read' as Page, icon: '📖', label: '阅读' },
          { id: 'think' as Page, icon: '🧠', label: '拆解' },
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

      {/* Stats */}
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
          <div className="text-2xl mb-1">🧠</div>
          <div className="text-sm font-medium text-moss-700">思维拆解</div>
          <div className="text-[10px] text-moss-500">输出思考笔记</div>
        </button>
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

function ThinkPage({ state, onSubmit, onSelectBook }: { state: GameState; onSubmit: (bookId: string, ch: number, note: string) => void; onSelectBook: (b: Book) => void }) {
  const [note, setNote] = useState('')
  const [selectedBookId, setSelectedBookId] = useState(state.bookList[0]?.bookId || '')
  const [selectedChapterId, setSelectedChapterId] = useState(1)
  
  const book = state.bookList.find(b => b.bookId === selectedBookId)
  const today = getTodayStr()
  const canSubmit = state.dailyTask.refreshDate !== today || state.dailyTask.thinkSubmitCount < REWARDS.THINK_DAILY_MAX

  return (
    <div className="p-4 space-y-4 animate-scale-in">
      <h2 className="heading text-lg">思维拆解笔记</h2>
      
      <div className="surface rounded-xl p-4 space-y-3">
        <div>
          <label className="text-xs text-moss-500 mb-1 block">选择书籍</label>
          <select className="w-full px-3 py-2 rounded-xl border border-moss-200/60 bg-white/80 text-sm" value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)}>
            {state.bookList.filter(b => b.status !== 'lock').map(b => (
              <option key={b.bookId} value={b.bookId}>{b.bookName}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-xs text-moss-500 mb-1 block">选择章节</label>
          <select className="w-full px-3 py-2 rounded-xl border border-moss-200/60 bg-white/80 text-sm" value={selectedChapterId} onChange={e => setSelectedChapterId(Number(e.target.value))}>
            {book?.chapters.map(ch => (
              <option key={ch.chapterId} value={ch.chapterId}>{ch.chapterId}. {ch.title.substring(0, 30)}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-xs text-moss-500 mb-1 block">拆解笔记</label>
          <textarea
            className="w-full px-3 py-2 rounded-xl border border-moss-200/60 bg-white/80 text-sm resize-none h-24 focus:border-tender-400 focus:outline-none transition"
            placeholder="写下你的思考、感悟、应用场景..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
        
        <button
          className="btn-gold w-full"
          disabled={!canSubmit || !note.trim()}
          onClick={() => { onSubmit(selectedBookId, selectedChapterId, note); setNote('') }}
        >
          {canSubmit ? '提交拆解 (+30 EXP)' : '今日拆解已达上限'}
        </button>
        <p className="text-[10px] text-moss-400 text-center">每日最多 {REWARDS.THINK_DAILY_MAX} 次拆解</p>
      </div>

      {/* Recent think records */}
      {book && book.thinkRecords.length > 0 && (
        <div className="surface rounded-xl p-4">
          <h3 className="text-xs font-medium text-moss-500 mb-2">最近拆解记录</h3>
          {book.thinkRecords.slice(-3).reverse().map((r, i) => (
            <p key={i} className="text-xs text-moss-600 py-1 border-b border-moss-200/40 last:border-0">{r}</p>
          ))}
        </div>
      )}
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
            return (
              <div
                key={ch.chapterId}
                className={`px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-moss-50 transition ${isCurrent ? 'bg-moss-50' : ''}`}
                onClick={() => onRead(ch)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="numeral text-xs w-6 text-center shrink-0">{ch.chapterId}</span>
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

function ChapterReadPage({ book, chapter, state, onBack, onReadSubmit, onThinkSubmit, onNavigate }: {
  book: Book
  chapter: Chapter
  state: GameState
  onBack: () => void
  onReadSubmit: (bookId: string, ch: number) => void
  onThinkSubmit: (bookId: string, ch: number, note: string) => void
  onNavigate: (ch: Chapter) => void
}) {
  const [showThinkInput, setShowThinkInput] = useState(false)
  const [note, setNote] = useState('')
  const today = getTodayStr()
  const alreadyRead = state.dailyTask.readSubmit && state.dailyTask.refreshDate === today

  const chIdx = book.chapters.findIndex(c => c.chapterId === chapter.chapterId)
  const prevCh = chIdx > 0 ? book.chapters[chIdx - 1] : null
  const nextCh = chIdx < book.chapters.length - 1 ? book.chapters[chIdx + 1] : null

  // Render markdown-like content
  const renderContent = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="heading text-xl mb-3 mt-4">{line.slice(2)}</h1>
      if (line.startsWith('## ')) return <h2 key={i} className="heading text-lg mb-2 mt-4">{line.slice(3)}</h2>
      if (line.startsWith('### ')) return <h3 key={i} className="heading text-base mb-2 mt-3">{line.slice(4)}</h3>
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-moss-700 mb-2">{line.slice(2, -2)}</p>
      if (line.trim() === '---') return <hr key={i} className="my-3 border-moss-200/60" />
      if (line.trim() === '') return <div key={i} className="h-2" />
      return <p key={i} className="text-sm text-moss-700 leading-relaxed mb-1.5">{line}</p>
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="surface rounded-2xl p-5 max-w-2xl mx-auto">
          {renderContent(chapter.content)}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 px-4 py-3 bg-white/90 backdrop-blur-xl border-t border-moss-200/60 flex gap-2">
        <button
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${alreadyRead ? 'bg-moss-100 text-moss-500' : 'btn-gold'}`}
          onClick={() => { if (!alreadyRead) onReadSubmit(book.bookId, chapter.chapterId) }}
          disabled={alreadyRead}
        >
          {alreadyRead ? '✅ 已读' : '📖 标记已读 (+15 EXP)'}
        </button>
        <button
          className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-ghost"
          onClick={() => setShowThinkInput(true)}
        >
          🧠 写拆解笔记 (+30 EXP)
        </button>
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
            <h3 className="text-sm font-medium text-moss-700 mb-3">思维拆解笔记</h3>
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
