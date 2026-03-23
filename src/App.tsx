import { startTransition, useEffect, useState } from 'react'
import './App.css'
import {
  courseCatalog,
  semesterOptions,
  type CourseUnit,
  type PracticeMode,
  type Question,
} from './data/mathContent'

type LearningState = {
  answeredIds: string[]
  correctIds: string[]
  wrongIds: string[]
  wrongCounts: Record<string, number>
  pointStats: Record<string, { answered: number; correct: number; wrong: number }>
}

type SubmissionState = {
  status: 'idle' | 'correct' | 'wrong'
  explanation: string
}

const STORAGE_KEY = 'math-knowledge-tool-state'

const defaultLearningState: LearningState = {
  answeredIds: [],
  correctIds: [],
  wrongIds: [],
  wrongCounts: {},
  pointStats: {},
}

function loadLearningState() {
  if (typeof window === 'undefined') {
    return defaultLearningState
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) {
      return defaultLearningState
    }

    const parsedValue = JSON.parse(rawValue) as Partial<LearningState>
    return {
      answeredIds: parsedValue.answeredIds ?? [],
      correctIds: parsedValue.correctIds ?? [],
      wrongIds: parsedValue.wrongIds ?? [],
      wrongCounts: parsedValue.wrongCounts ?? {},
      pointStats: parsedValue.pointStats ?? {},
    }
  } catch {
    return defaultLearningState
  }
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, '').replace(/，/g, ',').toLowerCase()
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

function App() {
  const [selectedSemesterId, setSelectedSemesterId] = useState('grade-3-fall')
  const [selectedUnitId, setSelectedUnitId] = useState('g3-fall-unit-1')
  const [selectedPointId, setSelectedPointId] = useState('g3-fall-time-second')
  const [activeMode, setActiveMode] = useState<PracticeMode>('knowledge')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [learningState, setLearningState] = useState<LearningState>(loadLearningState)
  const [draftAnswer, setDraftAnswer] = useState('')
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ status: 'idle', explanation: '' })

  const semester = courseCatalog.find((item) => item.id === selectedSemesterId) ?? courseCatalog[0]
  const unit = semester.units.find((item) => item.id === selectedUnitId) ?? semester.units[0]
  const knowledgePoint = unit.points.find((item) => item.id === selectedPointId) ?? unit.points[0]
  const questionSet = getModeQuestionSet(unit, activeMode, learningState, selectedPointId)
  const currentQuestion = questionSet[questionIndex] ?? null
  const answeredCount = learningState.answeredIds.length
  const correctCount = learningState.correctIds.length
  const wrongCount = learningState.wrongIds.length
  const accuracy = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100)

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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(learningState))
  }, [learningState])

  useEffect(() => {
    setQuestionIndex(0)
    setDraftAnswer('')
    setSubmissionState({ status: 'idle', explanation: '' })
  }, [selectedPointId, selectedUnitId, activeMode])

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

    setLearningState((currentState) => {
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
        <div>
          <p className="eyebrow">人教版数学 3-6 年级知识点工具</p>
          <h1>先做成体系，再逐步扩到全学段</h1>
          <p className="hero-copy">
            当前是首版 MVP：三年级上册、2 个单元、知识点练习、单元闯关、错题复习和家长查看面板，所有记录保存在本机浏览器。
          </p>
        </div>
        <div className="hero-stats">
          <article>
            <span>已答题</span>
            <strong>{answeredCount}</strong>
          </article>
          <article>
            <span>正确率</span>
            <strong>{accuracy}%</strong>
          </article>
          <article>
            <span>错题数</span>
            <strong>{wrongCount}</strong>
          </article>
        </div>
      </header>

      <section className="semester-strip" aria-label="年级与册别">
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
              <small>{option.available ? '已开放' : '即将开放'}</small>
            </button>
          )
        })}
      </section>

      <main className="layout-grid">
        <aside className="catalog-panel">
          <div className="panel-heading">
            <h2>知识点目录</h2>
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
                  <small>完成度 {getUnitProgress(item, learningState)}%</small>
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
                  <small>掌握度 {pointAccuracy}%</small>
                </button>
              )}
            )}
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
                <span className="card-label">知识卡片</span>
                <p>{knowledgePoint.concept}</p>
              </article>
              <article>
                <span className="card-label">解题步骤</span>
                <ol>
                  {knowledgePoint.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </article>
              <article>
                <span className="card-label">常见易错点</span>
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
                <h2>练习模式</h2>
                <p>{unit.title}</p>
              </div>
              <div className="mode-switcher">
                {[
                  { key: 'knowledge', label: '知识点练习' },
                  { key: 'challenge', label: '单元闯关' },
                  { key: 'review', label: '错题复习' },
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
                    <span>输入答案</span>
                    <input
                      value={draftAnswer}
                      onChange={(event) => setDraftAnswer(event.target.value)}
                      placeholder={currentQuestion.placeholder}
                    />
                  </label>
                )}

                <div className="question-actions">
                  <button type="button" className="primary-button" onClick={submitAnswer}>
                    提交答案
                  </button>
                  <button type="button" className="secondary-button" onClick={moveToNextQuestion}>
                    下一题
                  </button>
                </div>

                {submissionState.status !== 'idle' ? (
                  <div className={submissionState.status === 'correct' ? 'feedback-card correct' : 'feedback-card wrong'}>
                    <strong>{submissionState.status === 'correct' ? '回答正确' : '还需要再想一步'}</strong>
                    <p>标准答案：{currentQuestion.answerLabel}</p>
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
                <h3>当前模式没有可练习题目</h3>
                <p>可以先做知识点练习，系统会自动把错题加入复习列表。</p>
              </div>
            )}
          </section>
        </section>

        <aside className="insight-panel">
          <section className="record-card">
            <div className="panel-heading">
              <h2>学习记录</h2>
              <p>本机保存</p>
            </div>
            <ul className="metric-list">
              <li>
                <span>已掌握知识点</span>
                <strong>{Object.values(learningState.pointStats).filter((item) => item.answered > 0 && item.correct >= item.wrong).length}</strong>
              </li>
              <li>
                <span>待复习题目</span>
                <strong>{Object.values(learningState.wrongCounts).filter((count) => count > 0).length}</strong>
              </li>
              <li>
                <span>家长建议</span>
                <strong>{weakTags.length > 0 ? '查看下方' : '先开始练习'}</strong>
              </li>
            </ul>
          </section>

          <section className="record-card">
            <div className="panel-heading">
              <h2>薄弱标签</h2>
              <p>按错题累计</p>
            </div>
            {weakTags.length > 0 ? (
              <ul className="weak-list">
                {weakTags.map(([tag, count]) => (
                  <li key={tag}>
                    <span>{tag}</span>
                    <strong>{count} 次</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">还没有错题数据，完成几道题后这里会自动生成。</p>
            )}
          </section>

          <section className="record-card">
            <div className="panel-heading">
              <h2>错题本</h2>
              <p>点击直接回练</p>
            </div>
            <div className="wrong-question-list">
              {unit.questions.filter((question) => (learningState.wrongCounts[question.id] ?? 0) > 0).length > 0 ? (
                unit.questions
                  .filter((question) => (learningState.wrongCounts[question.id] ?? 0) > 0)
                  .map((question) => (
                    <button key={question.id} type="button" className="wrong-item" onClick={() => retryWrongQuestion(question.id)}>
                      <span>{question.stem}</span>
                      <strong>{learningState.wrongCounts[question.id]} 次</strong>
                    </button>
                  ))
              ) : (
                <p className="muted">当前单元还没有加入错题本的题目。</p>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App