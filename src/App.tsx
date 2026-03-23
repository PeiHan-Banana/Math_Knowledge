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
      title: 'Local Trial Mode',
      body: 'Progress stays in this browser only. Enter a student name to keep separate records.',
    }
  }

  if (!hasFirebaseSyncConfig) {
    return {
      className: 'sync-banner local',
      title: 'Local Student Mode',
      body: 'Firebase is not configured yet. Records are still separated by student name on this device.',
    }
  }

  if (syncState === 'connecting') {
    return {
      className: 'sync-banner connecting',
      title: 'Connecting To Cloud',
      body: 'Loading the latest learning record from Firebase.',
    }
  }

  if (syncState === 'error') {
    return {
      className: 'sync-banner error',
      title: 'Cloud Sync Failed',
      body: 'The app fell back to local storage. Check Firebase config and database rules.',
    }
  }

  return {
    className: 'sync-banner synced',
    title: 'Cloud Sync Enabled',
    body: 'The latest record for this student can continue across different devices.',
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
  const displayPlayerName = isGuestMode ? 'Guest' : currentPlayerName
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
          <p className="eyebrow">Math Knowledge Tool</p>
          <h1>Build by knowledge points, then scale to all grades</h1>
          <p className="hero-copy">
            The current MVP includes grade 3 first semester, two sample units, focused practice, unit challenge, wrong-question review, and optional Firebase cloud sync.
          </p>
        </div>

        <div className="hero-side">
          <section className="sync-panel">
            <span className="card-label">Student Profile</span>
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
                placeholder="Enter a student name"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    activatePlayer()
                  }
                }}
              />
              <button type="button" className="primary-button" onClick={activatePlayer} disabled={isPlayerLoading}>
                {hasFirebaseSyncConfig ? 'Enable Cloud Sync' : 'Switch Student'}
              </button>
            </div>
            <div className="inline-actions">
              <button type="button" className="secondary-button" onClick={switchToGuestMode}>
                Local Guest Mode
              </button>
              <small className="support-note">
                {hasFirebaseSyncConfig
                  ? 'Firebase config detected. Progress can sync across devices.'
                  : 'Firebase config missing. Student records still stay separate on this device.'}
              </small>
            </div>
          </section>

          <div className="hero-stats">
            <article>
              <span>Answered</span>
              <strong>{answeredCount}</strong>
            </article>
            <article>
              <span>Accuracy</span>
              <strong>{accuracy}%</strong>
            </article>
            <article>
              <span>Wrong</span>
              <strong>{wrongCount}</strong>
            </article>
          </div>
        </div>
      </header>

      <section className="semester-strip" aria-label="Semester Selection">
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
              <small>{option.available ? 'Open' : 'Soon'}</small>
            </button>
          )
        })}
      </section>

      <main className="layout-grid">
        <aside className="catalog-panel">
          <div className="panel-heading">
            <h2>Knowledge Catalog</h2>
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
                  <small>Progress {getUnitProgress(item, learningState)}%</small>
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
                  <small>Mastery {pointAccuracy}%</small>
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
                <span className="card-label">Concept Card</span>
                <p>{knowledgePoint.concept}</p>
              </article>
              <article>
                <span className="card-label">Steps</span>
                <ol>
                  {knowledgePoint.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </article>
              <article>
                <span className="card-label">Common Mistakes</span>
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
                <h2>Practice Mode</h2>
                <p>{unit.title}</p>
              </div>
              <div className="mode-switcher">
                {[
                  { key: 'knowledge', label: 'Point Practice' },
                  { key: 'challenge', label: 'Unit Challenge' },
                  { key: 'review', label: 'Wrong Review' },
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
                    <span>Answer</span>
                    <input
                      value={draftAnswer}
                      onChange={(event) => setDraftAnswer(event.target.value)}
                      placeholder={currentQuestion.placeholder}
                    />
                  </label>
                )}

                <div className="question-actions">
                  <button type="button" className="primary-button" onClick={submitAnswer}>
                    Submit
                  </button>
                  <button type="button" className="secondary-button" onClick={moveToNextQuestion}>
                    Next
                  </button>
                </div>

                {submissionState.status !== 'idle' ? (
                  <div className={submissionState.status === 'correct' ? 'feedback-card correct' : 'feedback-card wrong'}>
                    <strong>{submissionState.status === 'correct' ? 'Correct' : 'Try One More Step'}</strong>
                    <p>Expected answer: {currentQuestion.answerLabel}</p>
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
                <h3>No questions in this mode yet</h3>
                <p>Start with knowledge practice and wrong questions will automatically join the review list.</p>
              </div>
            )}
          </section>
        </section>

        <aside className="insight-panel">
          <section className="record-card">
            <div className="panel-heading">
              <h2>Learning Record</h2>
              <p>{isGuestMode ? 'Local guest record' : hasFirebaseSyncConfig ? 'Cloud student record' : 'Local student record'}</p>
            </div>
            <ul className="metric-list">
              <li>
                <span>Mastered Points</span>
                <strong>{Object.values(learningState.pointStats).filter((item) => item.answered > 0 && item.correct >= item.wrong).length}</strong>
              </li>
              <li>
                <span>Review Items</span>
                <strong>{Object.values(learningState.wrongCounts).filter((count) => count > 0).length}</strong>
              </li>
              <li>
                <span>Current Student</span>
                <strong>{displayPlayerName}</strong>
              </li>
            </ul>
          </section>

          <section className="record-card">
            <div className="panel-heading">
              <h2>Weak Tags</h2>
              <p>Based on wrong answers</p>
            </div>
            {weakTags.length > 0 ? (
              <ul className="weak-list">
                {weakTags.map(([tag, count]) => (
                  <li key={tag}>
                    <span>{tag}</span>
                    <strong>{count} times</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Complete a few questions and weak tags will appear here.</p>
            )}
          </section>

          <section className="record-card">
            <div className="panel-heading">
              <h2>Wrong Notebook</h2>
              <p>Tap to revisit</p>
            </div>
            <div className="wrong-question-list">
              {unit.questions.filter((question) => (learningState.wrongCounts[question.id] ?? 0) > 0).length > 0 ? (
                unit.questions
                  .filter((question) => (learningState.wrongCounts[question.id] ?? 0) > 0)
                  .map((question) => (
                    <button key={question.id} type="button" className="wrong-item" onClick={() => retryWrongQuestion(question.id)}>
                      <span>{question.stem}</span>
                      <strong>{learningState.wrongCounts[question.id]} times</strong>
                    </button>
                  ))
              ) : (
                <p className="muted">There are no wrong questions for this unit yet.</p>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App