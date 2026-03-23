export type PracticeMode = 'knowledge' | 'challenge' | 'review'

export type Question = {
  id: string
  unitId: string
  pointId: string
  kind: 'single' | 'fill' | 'judge' | 'calc'
  kindLabel: string
  difficulty: '基础' | '提升'
  stem: string
  prompt: string
  answer: string
  answerLabel: string
  acceptedAnswers?: string[]
  explanation: string
  placeholder?: string
  tags: string[]
  options?: Array<{ value: string; label: string }>
}

export type KnowledgePoint = {
  id: string
  title: string
  summary: string
  concept: string
  steps: string[]
  mistakes: string[]
}

export type CourseUnit = {
  id: string
  title: string
  description: string
  points: KnowledgePoint[]
  questions: Question[]
}

export type Semester = {
  id: string
  label: string
  units: CourseUnit[]
}

export const semesterOptions = [
  { id: 'grade-3-fall', label: '三上', available: true },
  { id: 'grade-3-spring', label: '三下', available: false },
  { id: 'grade-4-fall', label: '四上', available: false },
  { id: 'grade-4-spring', label: '四下', available: false },
  { id: 'grade-5-fall', label: '五上', available: false },
  { id: 'grade-5-spring', label: '五下', available: false },
  { id: 'grade-6-fall', label: '六上', available: false },
  { id: 'grade-6-spring', label: '六下', available: false },
] as const

const unitOnePoints: KnowledgePoint[] = [
  {
    id: 'g3-fall-time-second',
    title: '秒的认识',
    summary: '知道 1 分 = 60 秒，会结合钟面读出秒针的位置。',
    concept: '秒是比分更小的时间单位，秒针走 1 小格是 1 秒，秒针走 1 圈是 60 秒，也就是 1 分。',
    steps: ['先看题目问的是秒还是分。', '根据 1 分 = 60 秒进行换算。', '再结合钟面判断经过了多少秒。'],
    mistakes: ['把分和秒混写', '忘记 1 分 = 60 秒', '只看时针不看秒针'],
  },
  {
    id: 'g3-fall-time-convert',
    title: '时间单位换算',
    summary: '会进行时、分、秒之间的简单换算。',
    concept: '时间单位换算通常用乘法或除法：大单位化小单位用乘法，小单位化大单位用除法。',
    steps: ['找清楚已知单位和目标单位。', '判断是化大还是化小。', '按 1 时 = 60 分，1 分 = 60 秒换算。'],
    mistakes: ['方向判断错', '漏写单位', '把 60 误写成 100'],
  },
  {
    id: 'g3-fall-time-duration',
    title: '经过时间',
    summary: '会根据开始时刻和结束时刻求经过时间。',
    concept: '求经过时间时，可以按整点分段算，也可以用结束时刻减去开始时刻。',
    steps: ['先写出开始时刻和结束时刻。', '按时和分分别计算。', '检查是否需要借位或分段。'],
    mistakes: ['把结束时刻减反', '忽略跨整点', '把时和分直接相减'],
  },
]

const unitTwoPoints: KnowledgePoint[] = [
  {
    id: 'g3-fall-add-hundreds',
    title: '整百整千加减法',
    summary: '掌握整百、整千数的口算方法。',
    concept: '整百整千加减法可以先看几个百、几个千，再直接合并或减少。',
    steps: ['先去掉末尾的 0 看核心数字。', '算出结果后再补回相同个数的 0。', '最后检查大小是否合理。'],
    mistakes: ['0 的个数补错', '加减方向看错', '把百和千混淆'],
  },
  {
    id: 'g3-fall-add-estimation',
    title: '三位数加减法估算',
    summary: '会把三位数看作整百数进行估算。',
    concept: '估算时，常把一个数看成与它接近的整百数，再进行加减。',
    steps: ['先看每个数更接近哪个整百。', '把原数改成便于计算的整百数。', '说明估算结果是大约多少。'],
    mistakes: ['估算成精确值', '进位方向判断错', '没有写大约'],
  },
  {
    id: 'g3-fall-add-application',
    title: '实际问题应用',
    summary: '会从生活情境中提取数量关系并列式。',
    concept: '应用题要先找条件和问题，再判断用加法还是减法，最后带单位作答。',
    steps: ['圈出已知条件。', '确定问题求总数还是相差多少。', '列式计算并写完整答语。'],
    mistakes: ['条件漏看', '单位没带', '该减写成加'],
  },
]

const unitOneQuestions: Question[] = [
  {
    id: 'q-time-1',
    unitId: 'g3-fall-unit-1',
    pointId: 'g3-fall-time-second',
    kind: 'single',
    kindLabel: '选择题',
    difficulty: '基础',
    stem: '秒针从 12 走到 1，经过了多少秒？',
    prompt: '观察钟面时，秒针每走 1 个大格就是 5 秒。',
    answer: 'A',
    answerLabel: 'A. 5 秒',
    explanation: '钟面一圈有 12 个大格，秒针走 1 个大格就是 5 秒，所以从 12 到 1 经过 5 秒。',
    tags: ['秒的认识', '钟面观察'],
    options: [
      { value: 'A', label: '5 秒' },
      { value: 'B', label: '1 秒' },
      { value: 'C', label: '10 秒' },
      { value: 'D', label: '60 秒' },
    ],
  },
  {
    id: 'q-time-2',
    unitId: 'g3-fall-unit-1',
    pointId: 'g3-fall-time-convert',
    kind: 'fill',
    kindLabel: '填空题',
    difficulty: '基础',
    stem: '2 分 =（  ）秒',
    prompt: '直接输入数字即可。',
    answer: '120',
    answerLabel: '120',
    explanation: '1 分 = 60 秒，2 分就是 2 个 60 秒，所以是 120 秒。',
    placeholder: '例如：120',
    tags: ['时间单位换算', '分化秒'],
  },
  {
    id: 'q-time-3',
    unitId: 'g3-fall-unit-1',
    pointId: 'g3-fall-time-duration',
    kind: 'calc',
    kindLabel: '计算题',
    difficulty: '提升',
    stem: '小明 7:35 开始写作业，7:55 写完，一共用了多少分钟？',
    prompt: '输入数字和单位，或只输入数字。',
    answer: '20',
    answerLabel: '20 分钟',
    acceptedAnswers: ['20分钟'],
    explanation: '7:55 比 7:35 多 20 分钟，所以一共用了 20 分钟。',
    placeholder: '例如：20 分钟',
    tags: ['经过时间', '结束减开始'],
  },
  {
    id: 'q-time-4',
    unitId: 'g3-fall-unit-1',
    pointId: 'g3-fall-time-duration',
    kind: 'judge',
    kindLabel: '判断题',
    difficulty: '基础',
    stem: '求经过时间时，只要把结束时刻的分减开始时刻的分就一定可以。',
    prompt: '判断对错。',
    answer: 'B',
    answerLabel: 'B. 错',
    explanation: '如果跨整点或需要借位，不能只减分钟，还要结合小时一起算，所以这句话是错的。',
    tags: ['经过时间', '易错判断'],
    options: [
      { value: 'A', label: '对' },
      { value: 'B', label: '错' },
    ],
  },
]

const unitTwoQuestions: Question[] = [
  {
    id: 'q-add-1',
    unitId: 'g3-fall-unit-2',
    pointId: 'g3-fall-add-hundreds',
    kind: 'calc',
    kindLabel: '口算题',
    difficulty: '基础',
    stem: '700 + 500 = ?',
    prompt: '直接输入结果。',
    answer: '1200',
    answerLabel: '1200',
    explanation: '7 个百加 5 个百等于 12 个百，也就是 1200。',
    placeholder: '例如：1200',
    tags: ['整百整千加减法', '口算'],
  },
  {
    id: 'q-add-2',
    unitId: 'g3-fall-unit-2',
    pointId: 'g3-fall-add-estimation',
    kind: 'single',
    kindLabel: '选择题',
    difficulty: '提升',
    stem: '398 + 204 的结果大约是下面哪一个？',
    prompt: '估算时先把三位数看成整百数。',
    answer: 'C',
    answerLabel: 'C. 600',
    explanation: '398 约等于 400，204 约等于 200，所以 398 + 204 大约是 600。',
    tags: ['三位数加减法估算', '整百估算'],
    options: [
      { value: 'A', label: '500' },
      { value: 'B', label: '550' },
      { value: 'C', label: '600' },
      { value: 'D', label: '700' },
    ],
  },
  {
    id: 'q-add-3',
    unitId: 'g3-fall-unit-2',
    pointId: 'g3-fall-add-application',
    kind: 'fill',
    kindLabel: '应用题',
    difficulty: '提升',
    stem: '图书角上午借出 256 本书，下午借出 178 本书，这一天一共借出多少本？',
    prompt: '输入最终数量。',
    answer: '434',
    answerLabel: '434 本',
    acceptedAnswers: ['434本'],
    explanation: '要求一天一共借出多少本，是把上午和下午借出的本数合起来，列式 256 + 178 = 434。',
    placeholder: '例如：434 本',
    tags: ['实际问题应用', '求总数'],
  },
  {
    id: 'q-add-4',
    unitId: 'g3-fall-unit-2',
    pointId: 'g3-fall-add-application',
    kind: 'judge',
    kindLabel: '判断题',
    difficulty: '基础',
    stem: '解决相差多少的问题，一般用加法。',
    prompt: '判断对错。',
    answer: 'B',
    answerLabel: 'B. 错',
    explanation: '相差多少通常是比较两个数量之间的差，常用减法，所以这句话是错的。',
    tags: ['实际问题应用', '数量关系'],
    options: [
      { value: 'A', label: '对' },
      { value: 'B', label: '错' },
    ],
  },
]

export const courseCatalog: Semester[] = [
  {
    id: 'grade-3-fall',
    label: '三年级上册',
    units: [
      {
        id: 'g3-fall-unit-1',
        title: '第一单元 时、分、秒',
        description: '围绕秒的认识、时间换算和经过时间建立时间观念。',
        points: unitOnePoints,
        questions: unitOneQuestions,
      },
      {
        id: 'g3-fall-unit-2',
        title: '第二单元 万以内的加法和减法（一）',
        description: '从整百整千口算过渡到估算和生活应用。',
        points: unitTwoPoints,
        questions: unitTwoQuestions,
      },
    ],
  },
]