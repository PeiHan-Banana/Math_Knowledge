import { startTransition, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  courseCatalog,
  semesterOptions,
  type CourseUnit,
  type PracticeMode,
  type Question,
} from './data/mathContent'
import {
  createEmptyLearningRecord,
  hasFirebaseSyncConfig,
  loadLastPlayerName,
  loadLocalLearningRecord,
  loadRemoteLearningRecord,
  normalizePlayerName,
  pickLatestLearningRecord,
  saveLastPlayerName,
  saveLocalLearningRecord,
  saveRemoteLearningRecord,
  type LearningRecord,
  type LearningState,
} from './lib/learningSync'

type SubmissionState = {
  status: 'idle' | 'correct' | 'wrong'
  explanation: string
}

type SyncState = 'guest' | 'local' | 'connecting' | 'synced' | 'error'

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, '').replaceAll('\uFF0C', ',').toLowerCase()
}

function isQuestionCorrect(question: Question, answer: string) {
  const expectedAnswers = [question.answer, ...(question.acceptedAnswers ?? [])].map(normalizeAnswer)
  return expectedAnswers.includes(normalizeAnswer(answer))
}

function getUnitProgress(unit: CourseUnit, learningState: LearningState) {
  const answeredCount = unit.questions.filter((question) => learningState.answeredIds.includes(question.id)).length
  return Math.round((answeredCount / unit.questions.length) * 100)
}

function getModeQuestionSet(unit: CourseUnit, mode: PracticeMode, learningState: LearningState, selectedPointId: string) {
  if (mode === 'knowledge') {
    return unit.questions.filter((question) => question.pointId === selectedPointId)
  }

  if (mode === 'review') {
    return unit.questions.filter((question) => (learningState.wrongCounts[question.id] ?? 0) > 0)
  }

  return unit.questions
}

function getActivePlayerKey(playerName: string) {
  return normalizePlayerName(playerName) || 'guest'
}

function getSyncMeta(syncState: SyncState, isGuestMode: boolean) {
  if (isGuestMode) {
    return {
      className: 'sync-banner guest',
      title: '\u672c\u673a\u4f53\u9a8c\u6a21\u5f0f',
      body: '\u5f53\u524d\u6570\u636e\u4ec5\u4fdd\u5b58\u5728\u672c\u6d4f\u89c8\u5668\u3002\u8f93\u5165\u5b66\u751f\u59d3\u540d\u540e\uff0c\u53ef\u6309\u5b66\u751f\u5206\u522b\u4fdd\u5b58\u8bb0\u5f55\u3002',
    }
  }

  if (!hasFirebaseSyncConfig) {
    return {
      className: 'sync-banner local',
      title: '\u672c\u5730\u5b66\u751f\u6a21\u5f0f',
      body: 'Firebase \u8fd8\u672a\u914d\u7f6e\uff0c\u5f53\u524d\u4ecd\u4f1a\u6309\u5b66\u751f\u59d3\u540d\u5206\u5f00\u4fdd\u5b58\u5728\u672c\u673a\u3002',
    }
  }

  if (syncState === 'connecting') {
    return {
      className: 'sync-banner connecting',
      title: '\u6b63\u5728\u8fde\u63a5\u4e91\u7aef',
      body: '\u6b63\u5728\u4ece Firebase \u62c9\u53d6\u8fd9\u4f4d\u5b66\u751f\u7684\u6700\u65b0\u5b66\u4e60\u8bb0\u5f55\u3002',
    }
  }

  if (syncState === 'error') {
    return {
      className: 'sync-banner error',
      title: '\u4e91\u540c\u6b65\u5931\u8d25',
      body: '\u5df2\u81ea\u52a8\u56de\u9000\u5230\u672c\u5730\u5b58\u50a8\uff0c\u8bf7\u68c0\u67e5 Firebase \u914d\u7f6e\u548c\u6570\u636e\u5e93\u89c4\u5219\u3002',
    }
  }

  return {
    className: 'sync-banner synced',
    title: '\u4e91\u7aef\u540c\u6b65\u5df2\u5f00\u542f',
    body: '\u540c\u4e00\u4f4d\u5b66\u751f\u53ef\u4ee5\u5728\u4e0d\u540c\u8bbe\u5907\u7ee7\u7eed\u5b66\u4e60\uff0c\u7cfb\u7edf\u4f1a\u4f18\u5148\u4fdd\u7559\u6700\u65b0\u8fdb\u5ea6\u3002',
  }
}

function App() {
  const initialPlayerName = loadLastPlayerName()
  const [playerNameInput, setPlayerNameInput] = useState(initialPlayerName)
  const [currentPlayerName, setCurrentPlayerName] = useState(initialPlayerName)
  const [selectedSemesterId, setSelectedSemesterId] = useState('grade-3-fall')
  const [selectedUnitId, setSelectedUnitId] = useState('g3-fall-unit-1')
  const [selectedPointId, setSelectedPointId] = useState('g3-fall-time-second')
  const [activeMode, setActiveMode] = useState<PracticeMode>('knowledge')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [learningRecord, setLearningRecord] = useState<LearningRecord>(() => loadLocalLearningRecord(getActivePlayerKey(initialPlayerName)))
  const [draftAnswer, setDraftAnswer] = useState('')
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ status: 'idle', explanation: '' })
  const [syncState, setSyncState] = useState<SyncState>(initialPlayerName ? (hasFirebaseSyncConfig ? 'connecting' : 'local') : 'guest')
  const [isPlayerLoading, setIsPlayerLoading] = useState(false)
  const persistReadyRef = useRef(false)

  const activePlayerKey = getActivePlayerKey(currentPlayerName)
  const isGuestMode = activePlayerKey === 'guest'
  const learningState = learningRecord.learningState
  const semester = courseCatalog.find((item) => item.id === selectedSemesterId) ?? courseCatalog[0]
  const unit = semester.units.find((item) => item.id === selectedUnitId) ?? semester.units[0]
  const knowledgePoint = unit.points.find((item) => item.id === selectedPointId) ?? unit.points[0]
  const questionSet = getModeQuestionSet(unit, activeMode, learningState, selectedPointId)
  const currentQuestion = questionSet[questionIndex] ?? null
  const answeredCount = learningState.answeredIds.length
  const correctCount = learningState.correctIds.length
  const wrongCount = learningState.wrongIds.length
  const accuracy = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100)
  const displayPlayerName = isGuestMode ? '\u8bbf\u5ba2\u6a21\u5f0f' : currentPlayerName
  const syncMeta = getSyncMeta(syncState, isGuestMode)

  const weakTagEntries = Object.entries(learningState.wrongCounts)
    .map(([questionId, count]) => {
      const matchedQuestion = semester.units.flatMap((item) => item.questions).find((question) => question.id === questionId)
      return matchedQuestion ? matchedQuestion.tags.map((tag) => ({ tag, count })) : []
    })
    .flat()
    .reduce<Record<string, number>>((result, item) => {
      result[item.tag] = (result[item.tag] ?? 0) + item.count
      return result
    }, {})

  const weakTags = Object.entries(weakTagEntries)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)

  useEffect(() => {
    let cancelled = false
    persistReadyRef.current = false
    setIsPlayerLoading(true)
    setQuestionIndex(0)
    setDraftAnswer('')
    setSubmissionState({ status: 'idle', explanation: '' })

    const localRecord = loadLocalLearningRecord(activePlayerKey)
    setLearningRecord(localRecord)

    if (isGuestMode) {
      setSyncState('guest')
      setIsPlayerLoading(false)
      persistReadyRef.current = true
      return
    }

    if (!hasFirebaseSyncConfig) {
      setSyncState('local')
      setIsPlayerLoading(false)
      persistReadyRef.current = true
      return
    }

    setSyncState('connecting')

    void (async () => {
      try {
        const remoteRecord = await loadRemoteLearningRecord(activePlayerKey)
        if (cancelled) {
          return
        }

        const latestRecord = pickLatestLearningRecord(localRecord, remoteRecord)
        setLearningRecord(latestRecord)
        saveLocalLearningRecord(activePlayerKey, latestRecord)

        if (!remoteRecord || remoteRecord.updatedAt !== latestRecord.updatedAt) {
          await saveRemoteLearningRecord(activePlayerKey, latestRecord)
        }

        if (!cancelled) {
          setSyncState('synced')
        }
      } catch {
        if (!cancelled) {
          setSyncState('error')
        }
      } finally {
        if (!cancelled) {
          setIsPlayerLoading(false)
          persistReadyRef.current = true
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activePlayerKey, isGuestMode])

  useEffect(() => {
    if (!persistReadyRef.current) {
      return
    }

    saveLocalLearningRecord(activePlayerKey, learningRecord)
    saveLastPlayerName(currentPlayerName)

    if (isGuestMode || !hasFirebaseSyncConfig) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void saveRemoteLearningRecord(activePlayerKey, learningRecord)
        .then(() => setSyncState('synced'))
        .catch(() => setSyncState('error'))
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [activePlayerKey, currentPlayerName, isGuestMode, learningRecord])

  useEffect(() => {
    setQuestionIndex(0)
    setDraftAnswer('')
    setSubmissionState({ status: 'idle', explanation: '' })
  }, [selectedPointId, selectedUnitId, activeMode])

  function updateLearningState(updater: (state: LearningState) => LearningState) {
    setLearningRecord((currentRecord) => ({
      updatedAt: Date.now(),
      learningState: updater(currentRecord.learningState),
    }))
  }

  function activatePlayer() {
    startTransition(() => {
      setCurrentPlayerName(normalizePlayerName(playerNameInput))
    })
  }

  function switchToGuestMode() {
    startTransition(() => {
      setCurrentPlayerName('')
      setPlayerNameInput('')
      setLearningRecord(createEmptyLearningRecord())
      setSyncState('guest')
    })
  }

  function selectSemester(semesterId: string) {
    const nextSemester = courseCatalog.find((item) => item.id === semesterId)
    if (!nextSemester) {
      return
    }

    startTransition(() => {
      setSelectedSemesterId(semesterId)
      setSelectedUnitId(nextSemester.units[0].id)
      setSelectedPointId(nextSemester.units[0].points[0].id)
      setActiveMode('knowledge')
    })
  }

  function selectUnit(nextUnit: CourseUnit) {
    startTransition(() => {
      setSelectedUnitId(nextUnit.id)
      setSelectedPointId(nextUnit.points[0].id)
      setActiveMode('knowledge')
    })
  }

  function submitAnswer() {
    if (!currentQuestion || !draftAnswer.trim()) {
      return
    }

    const correct = isQuestionCorrect(currentQuestion, draftAnswer)
    setSubmissionState({
      status: correct ? 'correct' : 'wrong',
      explanation: currentQuestion.explanation,
    })

    updateLearningState((currentState) => {
      const answeredIds = currentState.answeredIds.includes(currentQuestion.id)
        ? currentState.answeredIds
        : [...currentState.answeredIds, currentQuestion.id]
      const correctIds = correct
        ? currentState.correctIds.includes(currentQuestion.id)
          ? currentState.correctIds
          : [...currentState.correctIds, currentQuestion.id]
        : currentState.correctIds.filter((item) => item !== currentQuestion.id)
      const wrongIds = correct
        ? currentState.wrongIds.filter((item) => item !== currentQuestion.id)
        : currentState.wrongIds.includes(currentQuestion.id)
          ? currentState.wrongIds
          : [...currentState.wrongIds, currentQuestion.id]
      const wrongCounts = {
        ...currentState.wrongCounts,
        [currentQuestion.id]: correct ? currentState.wrongCounts[currentQuestion.id] ?? 0 : (currentState.wrongCounts[currentQuestion.id] ?? 0) + 1,
      }
      const previousPointStats = currentState.pointStats[currentQuestion.pointId] ?? { answered: 0, correct: 0, wrong: 0 }

      return {
        answeredIds,
        correctIds,
        wrongIds,
        wrongCounts,
        pointStats: {
          ...currentState.pointStats,
          [currentQuestion.pointId]: {
            answered: previousPointStats.answered + 1,
            correct: previousPointStats.correct + (correct ? 1 : 0),
            wrong: previousPointStats.wrong + (correct ? 0 : 1),
          },
        },
      }
    })
  }

  function moveToNextQuestion() {
    if (questionSet.length === 0) {
      return
    }

    setQuestionIndex((currentValue) => (currentValue + 1) % questionSet.length)
    setDraftAnswer('')
    setSubmissionState({ status: 'idle', explanation: '' })
  }

  function retryWrongQuestion(questionId: string) {
    const targetQuestion = unit.questions.find((question) => question.id === questionId)
    if (!targetQuestion) {
      return
    }

    startTransition(() => {
      setSelectedPointId(targetQuestion.pointId)
      setActiveMode('review')
      const reviewQuestions = getModeQuestionSet(unit, 'review', learningState, targetQuestion.pointId)
      const nextIndex = reviewQuestions.findIndex((question) => question.id === questionId)
      setQuestionIndex(nextIndex >= 0 ? nextIndex : 0)
      setDraftAnswer('')
      setSubmissionState({ status: 'idle', explanation: '' })
    })
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div className="hero-copy-block">
          <p className="eyebrow">\u4eba\u6559\u7248\u6570\u5b66 3-6 \u5e74\u7ea7\u77e5\u8bc6\u70b9\u5de5\u5177</p>
          <h1>\u5148\u505a\u6210\u4f53\u7cfb\uff0c\u518d\u9010\u6b65\u6269\u5230\u5168\u5b66\u6bb5</h1>
          <p className="hero-copy">
            \u5f53\u524d\u662f\u9996\u7248 MVP\uff1a\u4e09\u5e74\u7ea7\u4e0a\u518c\u30012 \u4e2a\u5355\u5143\u3001\u77e5\u8bc6\u70b9\u7ec3\u4e60\u3001\u5355\u5143\u95ef\u5173\u3001\u9519\u9898\u590d\u4e60\u548c Firebase \u4e91\u540c\u6b65\u3002
          </p>
        </div>

        <div className="hero-side">
          <section className="sync-panel">
            <span className="card-label">\u5b66\u751f\u6863\u6848</span>
            <strong className="player-title">{displayPlayerName}</strong>
            <p className={syncMeta.className}>
              <strong>{syncMeta.title}</strong>
              <span>{syncMeta.body}</span>
            </p>
            <div className="player-form">
              <input
                className="player-input"
                value={playerNameInput}
                onChange={(event) => setPlayerNameInput(event.target.value)}
                placeholder="\u8f93\u5165\u5b66\u751f\u59d3\u540d"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    activatePlayer()
                  }
                }}
              />
              <button type="button" className="primary-button" onClick={activatePlayer} disabled={isPlayerLoading}>
                {hasFirebaseSyncConfig ? '\u8fdb\u5165\u4e91\u540c\u6b65' : '\u5207\u6362\u5b66\u751f'}
              </button>
            </div>
            <div className="inline-actions">
              <button type="button" className="secondary-button" onClick={switchToGuestMode}>
                \u672c\u673a\u4e34\u65f6\u5b66\u4e60
              </button>
              <small className="support-note">
                {hasFirebaseSyncConfig
                  ? '\u5df2\u68c0\u6d4b\u5230 Firebase \u914d\u7f6e\uff0c\u5b66\u4e60\u8fdb\u5ea6\u53ef\u5728\u4e0d\u540c\u8bbe\u5907\u95f4\u540c\u6b65\u3002'
                  : '\u5c1a\u672a\u914d\u7f6e Firebase\uff0c\u5f53\u524d\u4ecd\u4f1a\u6309\u5b66\u751f\u59d3\u540d\u5206\u522b\u4fdd\u5b58\u5728\u672c\u673a\u3002'}
              </small>
            </div>
          </section>

          <div className="hero-stats">
            <article>
              <span>\u5df2\u7b54\u9898</span>
              <strong>{answeredCount}</strong>
            </article>
            <article>
              <span>\u6b63\u786e\u7387</span>
              <strong>{accuracy}%</strong>
            </article>
            <article>
              <span>\u9519\u9898\u6570</span>
              <strong>{wrongCount}</strong>
            </article>
          </div>
        </div>
      </header>

      <section className="semester-strip" aria-label="\u5e74\u7ea7\u4e0e\u518c\u522b">
        {semesterOptions.map((option) => {
          const isActive = option.id === selectedSemesterId
          return (
            <button
              key={option.id}
              type="button"
              className={isActive ? 'semester-chip active' : 'semester-chip'}
              onClick={() => option.available && selectSemester(option.id)}
              disabled={!option.available}
            >
              <span>{option.label}</span>
              <small>{option.available ? '\u5df2\u5f00\u653e' : '\u5373\u5c06\u5f00\u653e'}</small>
            </button>
          )
        })}
      </section>

      <main className="layout-grid">
        <aside className="catalog-panel">
          <div className="panel-heading">
            <h2>\u77e5\u8bc6\u70b9\u76ee\u5f55</h2>
            <p>{semester.label}</p>
          </div>
          <div className="unit-list">
            {semester.units.map((item) => {
              const isActive = item.id === unit.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={isActive ? 'unit-card active' : 'unit-card'}
                  onClick={() => selectUnit(item)}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                  <small>\u5b8c\u6210\u5ea6 {getUnitProgress(item, learningState)}%</small>
                </button>
              )
            })}
          </div>
          <div className="point-list">
            {unit.points.map((item) => {
              const isActive = item.id === knowledgePoint.id
              const pointStats = learningState.pointStats[item.id]
              const pointAccuracy = pointStats && pointStats.answered > 0 ? Math.round((pointStats.correct / pointStats.answered) * 100) : 0
              return (
                <button
                  key={item.id}
                  type="button"
                  className={isActive ? 'point-card active' : 'point-card'}
                  onClick={() => setSelectedPointId(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.summary}</span>
                  <small>\u638c\u63e1\u5ea6 {pointAccuracy}%</small>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="content-column">
          <section className="knowledge-panel">
            <div className="panel-heading">
              <h2>{knowledgePoint.title}</h2>
              <p>{knowledgePoint.summary}</p>
            </div>
            <div className="knowledge-grid">
              <article>
                <span className="card-label">\u77e5\u8bc6\u5361\u7247</span>
                <p>{knowledgePoint.concept}</p>
              </article>
              <article>
                <span className="card-label">\u89e3\u9898\u6b65\u9aa4</span>
                <ol>
                  {knowledgePoint.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </article>
              <article>
                <span className="card-label">\u5e38\u89c1\u6613\u9519\u70b9</span>
                <ul className="tag-list">
                  {knowledgePoint.mistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              </article>
            </div>
          </section>

          <section className="practice-panel">
            <div className="practice-topbar">
              <div>
                <h2>\u7ec3\u4e60\u6a21\u5f0f</h2>
                <p>{unit.title}</p>
              </div>
              <div className="mode-switcher">
                {[
                  { key: 'knowledge', label: '\u77e5\u8bc6\u70b9\u7ec3\u4e60' },
                  { key: 'challenge', label: '\u5355\u5143\u95ef\u5173' },
                  { key: 'review', label: '\u9519\u9898\u590d\u4e60' },
                ].map((item) => {
                  const isActive = item.key === activeMode
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={isActive ? 'mode-chip active' : 'mode-chip'}
                      onClick={() => setActiveMode(item.key as PracticeMode)}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {currentQuestion ? (
              <div className="question-card">
                <div className="question-meta">
                  <span>{currentQuestion.kindLabel}</span>
                  <span>{currentQuestion.difficulty}</span>
                  <span>{questionIndex + 1} / {questionSet.length}</span>
                </div>
                <h3>{currentQuestion.stem}</h3>
                <p className="question-prompt">{currentQuestion.prompt}</p>

                {currentQuestion.options ? (
                  <div className="option-grid">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={draftAnswer === option.value ? 'option-card active' : 'option-card'}
                        onClick={() => setDraftAnswer(option.value)}
                      >
                        <strong>{option.value}</strong>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <label className="answer-box">
                    <span>\u8f93\u5165\u7b54\u6848</span>
                    <input
                      value={draftAnswer}
                      onChange={(event) => setDraftAnswer(event.target.value)}
                      placeholder={currentQuestion.placeholder}
                    />
                  </label>
                )}

                <div className="question-actions">
                  <button type="button" className="primary-button" onClick={submitAnswer}>
                    \u63d0\u4ea4\u7b54\u6848
                  </button>
                  <button type="button" className="secondary-button" onClick={moveToNextQuestion}>
                    \u4e0b\u4e00\u9898
                  </button>
                </div>

                {submissionState.status !== 'idle' ? (
                  <div className={submissionState.status === 'correct' ? 'feedback-card correct' : 'feedback-card wrong'}>
                    <strong>{submissionState.status === 'correct' ? '\u56de\u7b54\u6b63\u786e' : '\u8fd8\u9700\u518d\u60f3\u4e00\u6b65'}</strong>
                    <p>\u6807\u51c6\u7b54\u6848\uff1a{currentQuestion.answerLabel}</p>
                    <p>{submissionState.explanation}</p>
                  </div>
                ) : null}

                <ul className="tag-list compact">
                  {currentQuestion.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="empty-card">
                <h3>\u5f53\u524d\u6a21\u5f0f\u8fd8\u6ca1\u6709\u53ef\u7ec3\u4e60\u7684\u9898\u76ee</h3>
                <p>\u53ef\u4ee5\u5148\u505a\u77e5\u8bc6\u70b9\u7ec3\u4e60\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u628a\u9519\u9898\u52a0\u5165\u590d\u4e60\u5217\u8868\u3002</p>
              </div>
            )}
          </section>
        </section>

        <aside className="insight-panel">
          <section className="record-card">
            <div className="panel-heading">
              <h2>\u5b66\u4e60\u8bb0\u5f55</h2>
              <p>{isGuestMode ? '\u672c\u673a\u4e34\u65f6\u8bb0\u5f55' : hasFirebaseSyncConfig ? '\u5b66\u751f\u4e91\u540c\u6b65' : '\u5b66\u751f\u672c\u5730\u8bb0\u5f55'}</p>
            </div>
            <ul className="metric-list">
              <li>
                <span>\u5df2\u638c\u63e1\u77e5\u8bc6\u70b9</span>
                <strong>{Object.values(learningState.pointStats).filter((item) => item.answered > 0 && item.correct >= item.wrong).length}</strong>
              </li>
              <li>
                <span>\u5f85\u590d\u4e60\u9898\u76ee</span>
                <strong>{Object.values(learningState.wrongCounts).filter((count) => count > 0).length}</strong>
              </li>
              <li>
                <span>\u5f53\u524d\u5b66\u751f</span>
                <strong>{displayPlayerName}</strong>
              </li>
            </ul>
          </section>

          <section className="record-card">
            <div className="panel-heading">
              <h2>\u8584\u5f31\u6807\u7b7e</h2>
              <p>\u6309\u9519\u9898\u7edf\u8ba1</p>
            </div>
            {weakTags.length > 0 ? (
              <ul className="weak-list">
                {weakTags.map(([tag, count]) => (
                  <li key={tag}>
                    <span>{tag}</span>
                    <strong>{count} \u6b21</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">\u5b8c\u6210\u51e0\u9053\u9898\u540e\uff0c\u8fd9\u91cc\u4f1a\u81ea\u52a8\u751f\u6210\u8584\u5f31\u6807\u7b7e\u3002</p>
            )}
          </section>

          <section className="record-card">
            <div className="panel-heading">
              <h2>\u9519\u9898\u672c</h2>
              <p>\u70b9\u51fb\u53ef\u76f4\u63a5\u56de\u7ec3</p>
            </div>
            <div className="wrong-question-list">
              {unit.questions.filter((question) => (learningState.wrongCounts[question.id] ?? 0) > 0).length > 0 ? (
                unit.questions
                  .filter((question) => (learningState.wrongCounts[question.id] ?? 0) > 0)
                  .map((question) => (
                    <button key={question.id} type="button" className="wrong-item" onClick={() => retryWrongQuestion(question.id)}>
                      <span>{question.stem}</span>
                      <strong>{learningState.wrongCounts[question.id]} \u6b21</strong>
                    </button>
                  ))
              ) : (
                <p className="muted">\u5f53\u524d\u5355\u5143\u8fd8\u6ca1\u6709\u52a0\u5165\u9519\u9898\u672c\u7684\u9898\u76ee\u3002</p>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App