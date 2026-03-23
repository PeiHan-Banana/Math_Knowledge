import { getApp, getApps, initializeApp } from 'firebase/app'
import { get, getDatabase, ref, set } from 'firebase/database'

export type LearningState = {
  answeredIds: string[]
  correctIds: string[]
  wrongIds: string[]
  wrongCounts: Record<string, number>
  pointStats: Record<string, { answered: number; correct: number; wrong: number }>
}

export type LearningRecord = {
  updatedAt: number
  learningState: LearningState
}

export const LAST_PLAYER_KEY = 'math-knowledge-tool-last-player'
const STORAGE_PREFIX = 'math-knowledge-tool-state'

export const defaultLearningState: LearningState = {
  answeredIds: [],
  correctIds: [],
  wrongIds: [],
  wrongCounts: {},
  pointStats: {},
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const hasFirebaseSyncConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.databaseURL,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
].every((value) => typeof value === 'string' && value.trim().length > 0)

let cachedDatabase: ReturnType<typeof getDatabase> | null | undefined

function uniqStrings(values: unknown) {
  if (!Array.isArray(values)) {
    return []
  }

  return [...new Set(values.filter((value): value is string => typeof value === 'string'))]
}

function sanitizeCountMap(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.entries(value).reduce<Record<string, number>>((result, [key, entryValue]) => {
    const numericValue = Number(entryValue)
    if (Number.isFinite(numericValue) && numericValue >= 0) {
      result[key] = numericValue
    }
    return result
  }, {})
}

function sanitizePointStats(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.entries(value).reduce<LearningState['pointStats']>((result, [key, entryValue]) => {
    if (!entryValue || typeof entryValue !== 'object') {
      return result
    }

    const answered = Number((entryValue as Record<string, unknown>).answered ?? 0)
    const correct = Number((entryValue as Record<string, unknown>).correct ?? 0)
    const wrong = Number((entryValue as Record<string, unknown>).wrong ?? 0)

    result[key] = {
      answered: Number.isFinite(answered) ? answered : 0,
      correct: Number.isFinite(correct) ? correct : 0,
      wrong: Number.isFinite(wrong) ? wrong : 0,
    }

    return result
  }, {})
}

export function sanitizeLearningState(value: unknown): LearningState {
  if (!value || typeof value !== 'object') {
    return defaultLearningState
  }

  const recordValue = value as Partial<LearningState>
  return {
    answeredIds: uniqStrings(recordValue.answeredIds),
    correctIds: uniqStrings(recordValue.correctIds),
    wrongIds: uniqStrings(recordValue.wrongIds),
    wrongCounts: sanitizeCountMap(recordValue.wrongCounts),
    pointStats: sanitizePointStats(recordValue.pointStats),
  }
}

export function createEmptyLearningRecord(): LearningRecord {
  return {
    updatedAt: Date.now(),
    learningState: defaultLearningState,
  }
}

export function normalizePlayerName(value: string) {
  return value.trim()
}

function normalizePlayerKey(playerName: string) {
  const normalizedName = normalizePlayerName(playerName)
  return normalizedName ? normalizedName.toLowerCase().replace(/\s+/g, '-') : 'guest'
}

function getStorageKey(playerName: string) {
  return `${STORAGE_PREFIX}:${normalizePlayerKey(playerName)}`
}

export function loadLastPlayerName() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(LAST_PLAYER_KEY) ?? ''
}

export function saveLastPlayerName(playerName: string) {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedName = normalizePlayerName(playerName)
  if (!normalizedName) {
    window.localStorage.removeItem(LAST_PLAYER_KEY)
    return
  }

  window.localStorage.setItem(LAST_PLAYER_KEY, normalizedName)
}

export function loadLocalLearningRecord(playerName: string) {
  if (typeof window === 'undefined') {
    return createEmptyLearningRecord()
  }

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(playerName))
    if (!rawValue) {
      return createEmptyLearningRecord()
    }

    const parsedValue = JSON.parse(rawValue) as Partial<LearningRecord>
    return {
      updatedAt: Number(parsedValue.updatedAt) || Date.now(),
      learningState: sanitizeLearningState(parsedValue.learningState),
    }
  } catch {
    return createEmptyLearningRecord()
  }
}

export function saveLocalLearningRecord(playerName: string, record: LearningRecord) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(getStorageKey(playerName), JSON.stringify(record))
}

export function pickLatestLearningRecord(localRecord: LearningRecord, remoteRecord: LearningRecord | null) {
  if (!remoteRecord) {
    return localRecord
  }

  return remoteRecord.updatedAt > localRecord.updatedAt ? remoteRecord : localRecord
}

function getDatabaseInstance() {
  if (!hasFirebaseSyncConfig) {
    return null
  }

  if (cachedDatabase !== undefined) {
    return cachedDatabase
  }

  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  cachedDatabase = getDatabase(firebaseApp)
  return cachedDatabase
}

function getPlayerRef(playerName: string) {
  const database = getDatabaseInstance()
  if (!database) {
    return null
  }

  return ref(database, `mathKnowledgePlayers/${normalizePlayerKey(playerName)}`)
}

export async function loadRemoteLearningRecord(playerName: string) {
  const playerRef = getPlayerRef(playerName)
  if (!playerRef) {
    return null
  }

  const snapshot = await get(playerRef)
  if (!snapshot.exists()) {
    return null
  }

  const value = snapshot.val() as Partial<LearningRecord> | null
  if (!value) {
    return null
  }

  return {
    updatedAt: Number(value.updatedAt) || Date.now(),
    learningState: sanitizeLearningState(value.learningState),
  }
}

export async function saveRemoteLearningRecord(playerName: string, record: LearningRecord) {
  const playerRef = getPlayerRef(playerName)
  if (!playerRef) {
    return
  }

  await set(playerRef, {
    playerName: normalizePlayerName(playerName),
    updatedAt: record.updatedAt,
    learningState: record.learningState,
  })
}