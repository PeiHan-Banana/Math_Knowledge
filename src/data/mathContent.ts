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

type PointDraft = Omit<KnowledgePoint, 'id'> & { slug: string }
type QuestionDraft = Omit<Question, 'id' | 'unitId' | 'pointId'> & { slug: string; pointSlug: string }
type UnitDraft = { slug: string; title: string; description: string; points: PointDraft[]; questions: QuestionDraft[] }
type SemesterDraft = { id: string; label: string; shortLabel: string; units: UnitDraft[] }

function buildUnitId(semesterId: string, unitSlug: string) {
  return `${semesterId}-${unitSlug}`
}

function buildPointId(semesterId: string, unitSlug: string, pointSlug: string) {
  return `${semesterId}-${unitSlug}-${pointSlug}`
}

function buildUnit(semesterId: string, unit: UnitDraft): CourseUnit {
  const unitId = buildUnitId(semesterId, unit.slug)
  const pointIdMap = Object.fromEntries(
    unit.points.map((point) => [point.slug, buildPointId(semesterId, unit.slug, point.slug)]),
  ) as Record<string, string>

  return {
    id: unitId,
    title: unit.title,
    description: unit.description,
    points: unit.points.map(({ slug, ...point }) => ({ id: pointIdMap[slug], ...point })),
    questions: unit.questions.map(({ slug, pointSlug, ...question }) => ({
      id: `${unitId}-${slug}`,
      unitId,
      pointId: pointIdMap[pointSlug],
      ...question,
    })),
  }
}

function point(
  slug: string,
  title: string,
  summary: string,
  concept: string,
  steps: string[],
  mistakes: string[],
): PointDraft {
  return { slug, title, summary, concept, steps, mistakes }
}

function question(
  slug: string,
  pointSlug: string,
  kind: Question['kind'],
  kindLabel: string,
  difficulty: Question['difficulty'],
  stem: string,
  prompt: string,
  answer: string,
  answerLabel: string,
  explanation: string,
  tags: string[],
  extra: Partial<Pick<QuestionDraft, 'acceptedAnswers' | 'placeholder' | 'options'>> = {},
): QuestionDraft {
  return {
    slug,
    pointSlug,
    kind,
    kindLabel,
    difficulty,
    stem,
    prompt,
    answer,
    answerLabel,
    explanation,
    tags,
    ...extra,
  }
}

const semesterDrafts: SemesterDraft[] = [
  {
    id: 'grade-3-fall',
    label: '三年级上册',
    shortLabel: '三上',
    units: [
      {
        slug: 'time',
        title: '第一单元 时、分、秒',
        description: '认识时间单位，能进行简单换算和经过时间计算。',
        points: [
          point('second', '秒的认识', '知道时、分、秒之间的关系。', '1 分等于 60 秒，1 时等于 60 分。', ['先认清单位。', '再判断换算方向。', '按 60 进率换算。'], ['把分和秒混淆', '忘记进率是 60', '结果漏单位']),
          point('duration', '经过时间', '会根据开始和结束时刻求经过时间。', '经过时间等于结束时刻减去开始时刻。', ['先找开始时刻。', '再找结束时刻。', '按顺序计算相差多少。'], ['前后时刻看反', '跨整时不会拆分', '漏写单位']),
        ],
        questions: [
          question('q1', 'second', 'fill', '填空题', '基础', '2 分 =（  ）秒', '输入数字。', '120', '120 秒', '1 分等于 60 秒，所以 2 分等于 120 秒。', ['时间换算', '时分秒'], { placeholder: '例如：120' }),
          question('q2', 'duration', 'calc', '计算题', '提升', '一节课 8:10 开始，8:50 结束，经过了多少分钟？', '输入数字。', '40', '40 分钟', '从 8:10 到 8:50 一共经过 40 分钟。', ['经过时间', '时间计算'], { placeholder: '例如：40' }),
        ],
      },
      {
        slug: 'addition',
        title: '第二单元 万以内的加法和减法',
        description: '掌握整百整千口算和三位数加减法的基础应用。',
        points: [
          point('mental', '口算方法', '会用凑整和分解的方法口算。', '整百整十数相加减时，可以先算数位再合并。', ['先看数位。', '再拆分或凑整。', '最后检验结果是否合理。'], ['数位对不齐', '进位漏算', '结果数量级错误']),
          point('application', '加减法应用', '会根据题意选择加法或减法。', '求一共用加法，求相差和剩余常用减法。', ['先读题。', '找已知和问题。', '判断用加法还是减法。'], ['见到数字就相加', '单位漏写', '算式与题意不符']),
        ],
        questions: [
          question('q1', 'mental', 'calc', '计算题', '基础', '700 + 500 = ?', '输入结果。', '1200', '1200', '7 个百加 5 个百等于 12 个百，也就是 1200。', ['口算', '整百整千'], { placeholder: '例如：1200' }),
          question('q2', 'application', 'fill', '应用题', '提升', '图书角有 235 本故事书，又买来 164 本，现在一共有（  ）本。', '输入数字。', '399', '399 本', '求一共用加法，235 加 164 等于 399。', ['应用题', '加法'], { placeholder: '例如：399' }),
        ],
      },
      {
        slug: 'measure',
        title: '第三单元 测量',
        description: '认识长度和质量单位，能做基础换算。',
        points: [
          point('length', '长度单位换算', '会在毫米、厘米、分米之间进行换算。', '1 厘米等于 10 毫米，1 分米等于 10 厘米。', ['先看原单位。', '再判断化大还是化小。', '按进率换算。'], ['10 写成 100', '方向判断错误', '单位混淆']),
          point('mass', '千克与克', '知道千克和克的实际意义。', '1 千克等于 1000 克，较轻物体常用克。', ['先判断轻重。', '选择合适单位。', '按 1000 进率换算。'], ['克和千克混淆', '生活经验不足', '结果漏单位']),
        ],
        questions: [
          question('q1', 'length', 'fill', '填空题', '基础', '4 厘米 =（  ）毫米', '输入数字。', '40', '40 毫米', '1 厘米等于 10 毫米，所以 4 厘米等于 40 毫米。', ['长度换算', '毫米厘米'], { placeholder: '例如：40' }),
          question('q2', 'mass', 'fill', '填空题', '提升', '2 千克 =（  ）克', '输入数字。', '2000', '2000 克', '1 千克等于 1000 克，所以 2 千克等于 2000 克。', ['质量换算', '千克克'], { placeholder: '例如：2000' }),
        ],
      },
      {
        slug: 'rectangle',
        title: '第四单元 长方形和正方形',
        description: '认识图形特征，会求简单周长。',
        points: [
          point('feature', '图形特征', '知道长方形和正方形都有 4 个直角。', '长方形对边相等，正方形四条边都相等。', ['先看边。', '再看角。', '比较两种图形。'], ['把长方形和正方形混淆', '对边概念不清', '直角判断错误']),
          point('perimeter', '周长计算', '会用公式求长方形和正方形周长。', '长方形周长等于长加宽的和再乘 2，正方形周长等于边长乘 4。', ['找长和宽或边长。', '代入公式。', '检查单位。'], ['把周长和面积混淆', '少乘 2 或 4', '漏写单位']),
        ],
        questions: [
          question('q1', 'feature', 'judge', '判断题', '基础', '正方形一定有 4 个直角。', '判断对错。', 'A', 'A. 对', '正方形的四个角都是直角，所以这句话是对的。', ['图形特征', '正方形'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'perimeter', 'calc', '计算题', '提升', '一个长方形长 6 厘米，宽 4 厘米，它的周长是多少？', '输入数字。', '20', '20 厘米', '周长等于（6 加 4）乘 2，结果是 20。', ['周长', '长方形'], { placeholder: '例如：20', acceptedAnswers: ['20厘米'] }),
        ],
      },
    ],
  },
  {
    id: 'grade-3-spring',
    label: '三年级下册',
    shortLabel: '三下',
    units: [
      {
        slug: 'division',
        title: '第一单元 除法',
        description: '理解平均分和有余数除法的基础意义。',
        points: [
          point('meaning', '平均分', '会把平均分问题和除法联系起来。', '求每份多少或求分成几份都可以用除法。', ['先看是不是平均分。', '再判断谁做被除数。', '列出除法算式。'], ['平均分条件没看见', '被除数和除数颠倒', '不会解释结果']),
          point('table', '乘除关系', '知道乘法口诀可以帮助做除法。', '除法和乘法互相关联，可以用口诀想商。', ['先看除数。', '想相关口诀。', '写出商并验算。'], ['口诀不熟', '商写错', '不会验算']),
        ],
        questions: [
          question('q1', 'meaning', 'fill', '填空题', '基础', '18 个苹果平均分给 6 个小朋友，每人分到（  ）个。', '输入数字。', '3', '3 个', '18 平均分成 6 份，每份是 18 除以 6，结果是 3。', ['除法', '平均分'], { placeholder: '例如：3' }),
          question('q2', 'table', 'calc', '计算题', '基础', '56  8 = ?', '输入结果。', '7', '7', '想口诀七八五十六，所以 56 除以 8 等于 7。', ['除法计算', '口诀'], { placeholder: '例如：7' }),
        ],
      },
      {
        slug: 'area',
        title: '第二单元 面积',
        description: '建立面积概念，会求长方形和正方形面积。',
        points: [
          point('meaning', '面积意义', '知道面积表示物体表面的大小。', '比较面积时看覆盖面的大小，不是看边长。', ['先明确比较的是表面大小。', '再观察谁占的面更大。', '联系方格理解面积。'], ['把面积和周长混淆', '只看一条边', '不会用方格数面积']),
          point('formula', '面积公式', '会求长方形和正方形面积。', '长方形面积等于长乘宽，正方形面积等于边长乘边长。', ['先找长和宽。', '选对公式。', '写上面积单位。'], ['面积单位漏写', '把乘法写成加法', '公式选错']),
        ],
        questions: [
          question('q1', 'meaning', 'judge', '判断题', '基础', '面积表示的是图形表面的大小。', '判断对错。', 'A', 'A. 对', '面积就是表示物体表面或封闭图形大小的量。', ['面积意义', '基础概念'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'formula', 'calc', '计算题', '提升', '一个长方形长 7 厘米，宽 3 厘米，面积是多少？', '输入数字。', '21', '21 平方厘米', '面积等于长乘宽，也就是 7 乘 3 等于 21。', ['面积公式', '长方形面积'], { placeholder: '例如：21', acceptedAnswers: ['21平方厘米'] }),
        ],
      },
      {
        slug: 'calendar',
        title: '第三单元 年、月、日',
        description: '认识年月日和常见月份天数，会看简单日历。',
        points: [
          point('month', '年月日关系', '知道一年有 12 个月。', '大月 31 天，小月 30 天，2 月比较特殊。', ['记住 12 个月。', '再分大月小月。', '联系日历判断。'], ['月份顺序错', '大月小月记混', '2 月天数混淆']),
          point('week', '日历推算', '会根据日期推算前后时间。', '连续日期每天加 1，星期按固定顺序循环。', ['先看当天日期。', '再往前或往后推。', '注意跨月情况。'], ['跨月不会推', '星期顺序错误', '前后关系看反']),
        ],
        questions: [
          question('q1', 'month', 'fill', '填空题', '基础', '1 年有（  ）个月。', '输入数字。', '12', '12 个月', '一年固定有 12 个月。', ['年月日', '基础概念'], { placeholder: '例如：12' }),
          question('q2', 'week', 'single', '选择题', '提升', '4 月一共有多少天？', '选择正确答案。', 'B', 'B. 30 天', '4 月是小月，有 30 天。', ['月份天数', '日历'], { options: [{ value: 'A', label: '28 天' }, { value: 'B', label: '30 天' }, { value: 'C', label: '31 天' }, { value: 'D', label: '29 天' }] }),
        ],
      },
      {
        slug: 'statistics',
        title: '第四单元 数据整理',
        description: '会按标准整理数据，并从简单统计图中读信息。',
        points: [
          point('collect', '数据分类', '会按统一标准整理数据。', '统计前先分类，能让数据更清楚。', ['先确定分类标准。', '逐个归类。', '最后统计数量。'], ['标准混乱', '漏数', '重复统计']),
          point('chart', '简单统计图', '会从统计图中读出数量信息。', '统计图可以直观地比较各类数据的多少。', ['看横轴和纵轴。', '找对应项目。', '读出数量并比较。'], ['横纵轴看反', '刻度读错', '项目对应错']),
        ],
        questions: [
          question('q1', 'collect', 'judge', '判断题', '基础', '整理数据前先分类，会更方便统计。', '判断对错。', 'A', 'A. 对', '先分类再统计，数据会更清楚。', ['数据整理', '分类'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'chart', 'single', '选择题', '提升', '统计图最适合做什么？', '选择最合适的说法。', 'C', 'C. 直观比较数量多少', '统计图的主要作用是直观地表示和比较数据。', ['统计图', '读图'], { options: [{ value: 'A', label: '写作文' }, { value: 'B', label: '背口诀' }, { value: 'C', label: '直观比较数量多少' }, { value: 'D', label: '测量长度' }] }),
        ],
      },
    ],
  },
  {
    id: 'grade-4-fall',
    label: '四年级上册',
    shortLabel: '四上',
    units: [
      {
        slug: 'large-numbers',
        title: '第一单元 大数的认识',
        description: '认识更大的计数单位，会读写和比较大数。',
        points: [
          point('read', '读写大数', '会按数级读写多位数。', '读数时从高位到低位，写数时注意数位占位。', ['先分级。', '再按级读写。', '检查零的处理。'], ['漏读零', '数位写错', '把级名读错']),
          point('compare', '大小比较', '会比较多位数大小。', '先比位数，位数相同比最高位。', ['先看位数。', '位数相同比最高位。', '依次往后比较。'], ['位数判断错', '比较顺序错误', '忽略高位']),
        ],
        questions: [
          question('q1', 'read', 'fill', '填空题', '基础', '6003000 读作（  ）。', '输入完整读法。', '六百万三千', '六百万三千', '6003000 先读六百万，再读零三千，规范写作六百万三千。', ['读数', '大数'], { placeholder: '例如：六百万三千' }),
          question('q2', 'compare', 'single', '选择题', '提升', '下面哪个数最大？', '选择正确答案。', 'D', 'D. 980000', '比较这些数时，980000 的最高位更大，所以最大。', ['大数比较', '大小关系'], { options: [{ value: 'A', label: '908000' }, { value: 'B', label: '890000' }, { value: 'C', label: '98000' }, { value: 'D', label: '980000' }] }),
        ],
      },
      {
        slug: 'angles',
        title: '第二单元 角的度量',
        description: '认识角和角的分类，会用量角器读角。',
        points: [
          point('classify', '角的分类', '会区分锐角、直角、钝角和平角。', '比 90 度小的是锐角，等于 90 度的是直角，大于 90 度小于 180 度的是钝角。', ['先估计角大小。', '再和 90 度比较。', '判断类型。'], ['锐角钝角混淆', '平角概念不清', '只看开口方向']),
          point('measure', '量角方法', '知道量角器中心要对准顶点。', '量角时顶点对中心，一边对零刻度，另一边看刻度。', ['顶点对中心。', '一边对零刻度。', '读另一边刻度。'], ['量角器放歪', '内外圈看反', '零刻度没对准']),
        ],
        questions: [
          question('q1', 'classify', 'single', '选择题', '基础', '120 度的角是（  ）。', '按角的大小分类。', 'C', 'C. 钝角', '120 度大于 90 度，小于 180 度，所以是钝角。', ['角的分类'], { options: [{ value: 'A', label: '锐角' }, { value: 'B', label: '直角' }, { value: 'C', label: '钝角' }, { value: 'D', label: '平角' }] }),
          question('q2', 'measure', 'judge', '判断题', '提升', '量角时，量角器的中心应对准角的顶点。', '判断对错。', 'A', 'A. 对', '量角器中心不对准顶点，就不能正确读数。', ['量角器', '读角'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
        ],
      },
      {
        slug: 'area-units',
        title: '第三单元 公顷和平方千米',
        description: '认识较大的面积单位，并会在生活中合理选择。',
        points: [
          point('hectare', '公顷', '知道 1 公顷等于 10000 平方米。', '公顷适合表示较大的土地面积。', ['先判断面积对象。', '再选择是否用公顷。', '按 10000 进率换算。'], ['当成长度单位', '和平方米换算错误', '场景判断不准']),
          point('square-km', '平方千米', '知道平方千米适合表示更大的区域面积。', '城市、湖泊、森林等较大区域常用平方千米。', ['先看范围大小。', '区分公顷和平方千米。', '联系生活经验。'], ['单位选得过大或过小', '不会估计大小', '与平方米混淆']),
        ],
        questions: [
          question('q1', 'hectare', 'fill', '填空题', '基础', '1 公顷 =（  ）平方米', '输入数字。', '10000', '10000 平方米', '1 公顷固定等于 10000 平方米。', ['面积单位', '公顷'], { placeholder: '例如：10000' }),
          question('q2', 'square-km', 'single', '选择题', '提升', '表示一个城市的面积，通常更适合用哪个单位？', '选择最合适的单位。', 'D', 'D. 平方千米', '城市面积较大，通常用平方千米表示。', ['面积单位', '平方千米'], { options: [{ value: 'A', label: '厘米' }, { value: 'B', label: '平方米' }, { value: 'C', label: '公顷' }, { value: 'D', label: '平方千米' }] }),
        ],
      },
      {
        slug: 'parallel',
        title: '第四单元 平行与垂直',
        description: '认识平行线和垂线，能结合生活实例判断直线关系。',
        points: [
          point('parallel-line', '平行线', '知道同一平面内不相交的两条直线叫平行线。', '平行线之间的距离处处相等。', ['先看是不是直线。', '再看会不会相交。', '判断是否平行。'], ['线段和直线混淆', '看着不交就算平行', '忽略同一平面']),
          point('vertical-line', '垂线', '知道相交成直角的两条直线互相垂直。', '关键是相交并且形成 90 度。', ['先看是否相交。', '再看是否成直角。', '判断是否垂直。'], ['只要相交就算垂直', '直角判断不准', '关系判断错']),
        ],
        questions: [
          question('q1', 'parallel-line', 'judge', '判断题', '基础', '铁轨两条边通常可以看成互相平行。', '判断对错。', 'A', 'A. 对', '铁轨两边保持固定距离，不相交，可以看作平行。', ['平行线', '生活实例'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'vertical-line', 'single', '选择题', '提升', '两条直线相交形成 4 个直角，这两条直线是什么关系？', '选择正确关系。', 'B', 'B. 互相垂直', '相交后形成直角，说明这两条直线互相垂直。', ['垂线', '直线关系'], { options: [{ value: 'A', label: '互相平行' }, { value: 'B', label: '互相垂直' }, { value: 'C', label: '没有关系' }, { value: 'D', label: '重合' }] }),
        ],
      },
    ],
  },
  {
    id: 'grade-4-spring',
    label: '四年级下册',
    shortLabel: '四下',
    units: [
      {
        slug: 'decimals',
        title: '第一单元 小数的意义和性质',
        description: '理解小数与分数的联系，会比较和改写简单小数。',
        points: [
          point('meaning', '小数意义', '知道小数是十分之几、百分之几等的另一种写法。', '0.1 表示十分之一，0.01 表示百分之一。', ['先看小数位数。', '联系分数意义。', '判断每一位表示什么。'], ['只会读不会理解', '十分位和百分位混淆', '把小数点看漏']),
          point('compare', '小数比较', '会比较位数不同或位数相同的小数。', '比较小数大小时，先比整数部分，再比十分位、百分位。', ['先比整数部分。', '再逐位比较。', '必要时末尾补零。'], ['只看位数多少', '忽略整数部分', '小数点后比较顺序错误']),
        ],
        questions: [
          question('q1', 'meaning', 'fill', '填空题', '基础', '0.3 表示（  ）分之三。', '输入数字。', '10', '十分之三', '0.3 表示 3 个十分之一，所以是十分之三。', ['小数意义', '十分位'], { placeholder: '例如：10' }),
          question('q2', 'compare', 'single', '选择题', '提升', '下面哪个数最大？', '选择正确答案。', 'C', 'C. 1.08', '比较 1.8、1.08、0.98 和 1.007 时，1.8 实际上是 1.80，最大的是 1.80。', ['小数比较'], { options: [{ value: 'A', label: '0.98' }, { value: 'B', label: '1.007' }, { value: 'C', label: '1.8' }, { value: 'D', label: '1.08' }] }),
        ],
      },
      {
        slug: 'operations',
        title: '第二单元 四则运算',
        description: '理解四则混合运算顺序，会结合括号正确计算。',
        points: [
          point('order', '运算顺序', '知道同级运算从左往右，有括号先算括号。', '先括号，后乘除，再加减。', ['先看有没有括号。', '再看乘除。', '最后算加减。'], ['顺序错', '跳步太快', '括号内漏算']),
          point('check', '验算意识', '会用逆运算或估算检查结果。', '算完后做检验，可以减少粗心错误。', ['先观察结果大小。', '再用逆运算检验。', '确认与题意一致。'], ['只求结果不检验', '逆运算用错', '估算范围不合理']),
        ],
        questions: [
          question('q1', 'order', 'calc', '计算题', '基础', '18 - 6  3 = ?', '输入结果。', '16', '16', '先算除法 6 除以 3 等于 2，再算 18 减 2 等于 16。', ['四则运算', '顺序'], { placeholder: '例如：16' }),
          question('q2', 'check', 'judge', '判断题', '提升', '计算混合运算时，算完后检查结果是否合理是好习惯。', '判断对错。', 'A', 'A. 对', '验算和估算能帮助发现错误，所以这是对的。', ['验算', '学习习惯'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
        ],
      },
      {
        slug: 'triangle',
        title: '第三单元 三角形',
        description: '认识三角形特征，会按角分类并用内角和求角。',
        points: [
          point('classify', '按角分类', '会把三角形分为锐角、直角和钝角三角形。', '按角分类时，关键是看最大角。', ['找最大的角。', '判断角的类型。', '确定三角形名称。'], ['不会抓最大角', '直角和钝角混淆', '分类标准混乱']),
          point('sum', '内角和', '知道三角形内角和是 180 度。', '任意三角形的 3 个内角和都等于 180 度。', ['写出已知角。', '先求已知角和。', '再用 180 减去它。'], ['把 180 写成 360', '加法算错', '求错未知角']),
        ],
        questions: [
          question('q1', 'classify', 'single', '选择题', '基础', '一个三角形中有一个角是 90 度，它是（  ）。', '选择正确答案。', 'B', 'B. 直角三角形', '有一个角是 90 度的三角形叫直角三角形。', ['三角形分类'], { options: [{ value: 'A', label: '锐角三角形' }, { value: 'B', label: '直角三角形' }, { value: 'C', label: '钝角三角形' }, { value: 'D', label: '等边三角形' }] }),
          question('q2', 'sum', 'calc', '计算题', '提升', '一个三角形的两个角分别是 50 度和 60 度，第三个角是多少度？', '输入数字。', '70', '70 度', '三角形内角和是 180 度，所以第三个角是 180 减 50 再减 60，结果是 70。', ['内角和', '求角'], { placeholder: '例如：70' }),
        ],
      },
      {
        slug: 'average',
        title: '第四单元 平均数',
        description: '理解平均数表示整体水平，会求简单平均数。',
        points: [
          point('meaning', '平均数意义', '知道平均数表示一组数据的一般水平。', '平均数是把总量平均分后的结果。', ['先求总和。', '再找份数。', '用总和除以份数。'], ['只取中间的数', '总和算错', '份数看错']),
          point('application', '平均数应用', '会用平均数解释几天或几次的平均情况。', '平均数应用的本质是总数除以份数。', ['找总量。', '找份数。', '列式并检查结果范围。'], ['总量和份数弄反', '平均数比最大值还大', '单位漏写']),
        ],
        questions: [
          question('q1', 'meaning', 'calc', '计算题', '基础', '6、8、10 这三个数的平均数是多少？', '输入结果。', '8', '8', '总和是 24，24 除以 3 等于 8。', ['平均数', '基础计算'], { placeholder: '例如：8' }),
          question('q2', 'application', 'fill', '应用题', '提升', '小红 4 天一共看了 36 页书，平均每天看（  ）页。', '输入数字。', '9', '9 页', '平均每天看 36 除以 4，结果是 9。', ['平均数', '应用题'], { placeholder: '例如：9' }),
        ],
      },
    ],
  },
  {
    id: 'grade-5-fall',
    label: '五年级上册',
    shortLabel: '五上',
    units: [
      {
        slug: 'decimal-multiply',
        title: '第一单元 小数乘法',
        description: '掌握小数乘整数和小数乘小数的基础方法。',
        points: [
          point('rule', '小数乘法法则', '会先按整数乘法计算，再点小数点。', '积中小数位数等于两个因数小数位数之和。', ['先去掉小数点按整数算。', '数出小数位数。', '点上小数点。'], ['小数位数数错', '小数点点错', '结果不合理不检查']),
          point('estimate', '积的估算', '会用近似数估计积的大小。', '估算可以帮助判断计算结果是否合理。', ['先把因数看成整十整百。', '再计算近似积。', '和精确结果比较。'], ['只估一个数', '近似太离谱', '不会用估算检验']),
        ],
        questions: [
          question('q1', 'rule', 'calc', '计算题', '基础', '1.2  3 = ?', '输入结果。', '3.6', '3.6', '12 乘 3 等于 36，因为原来有一位小数，所以结果是 3.6。', ['小数乘法'], { placeholder: '例如：3.6' }),
          question('q2', 'estimate', 'judge', '判断题', '提升', '估算可以帮助我们检查小数乘法的结果是否合理。', '判断对错。', 'A', 'A. 对', '先估算再核对，是检查结果是否合理的常用方法。', ['估算', '检验'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
        ],
      },
      {
        slug: 'decimal-divide',
        title: '第二单元 小数除法',
        description: '理解商的小数点位置，会解决简单小数除法问题。',
        points: [
          point('point', '商的小数点', '知道商的小数点要和被除数的小数点对齐。', '被除数和除数同时扩大相同倍数后再除，商不变。', ['先化成整数除法。', '再按笔算求商。', '点上商的小数点。'], ['小数点位置错误', '不会同时扩大', '商写错']),
          point('application', '小数除法应用', '会用除法求单价、速度等平均量。', '总量除以份数，常常对应小数除法。', ['先找总量。', '再看平均分几份。', '列除法算式。'], ['把除法写成乘法', '数量关系混乱', '单位不对应']),
        ],
        questions: [
          question('q1', 'point', 'calc', '计算题', '基础', '4.8  2 = ?', '输入结果。', '2.4', '2.4', '48 除以 2 等于 24，再点回一位小数，结果是 2.4。', ['小数除法'], { placeholder: '例如：2.4' }),
          question('q2', 'application', 'fill', '应用题', '提升', '一根绳子长 7.5 米，平均分成 3 段，每段长（  ）米。', '输入结果。', '2.5', '2.5 米', '7.5 除以 3 等于 2.5。', ['小数除法', '应用题'], { placeholder: '例如：2.5' }),
        ],
      },
      {
        slug: 'polygon-area',
        title: '第三单元 多边形面积',
        description: '掌握三角形和梯形面积的基础计算。',
        points: [
          point('triangle-area', '三角形面积', '知道三角形面积等于底乘高再除以 2。', '两个完全相同的三角形可以拼成一个平行四边形。', ['找底和高。', '先算底乘高。', '再除以 2。'], ['忘记除以 2', '高找错', '单位漏写']),
          point('trapezoid-area', '梯形面积', '知道梯形面积要先把两底相加。', '梯形面积等于上底加下底的和再乘高，最后除以 2。', ['找上底下底和高。', '先求两底和。', '乘高后除以 2。'], ['忘记加底', '忘记除以 2', '高和腰混淆']),
        ],
        questions: [
          question('q1', 'triangle-area', 'calc', '计算题', '基础', '一个三角形底是 8 厘米，高是 6 厘米，面积是多少？', '输入数字。', '24', '24 平方厘米', '8 乘 6 等于 48，再除以 2，结果是 24。', ['三角形面积'], { placeholder: '例如：24', acceptedAnswers: ['24平方厘米'] }),
          question('q2', 'trapezoid-area', 'single', '选择题', '提升', '下面哪个是梯形面积公式？', '选择正确公式。', 'D', 'D.（上底 + 下底） 高  2', '梯形面积要先把上底和下底相加，再乘高，最后除以 2。', ['梯形面积', '公式'], { options: [{ value: 'A', label: '底  高' }, { value: 'B', label: '边长  4' }, { value: 'C', label: '底  高  2' }, { value: 'D', label: '（上底 + 下底） 高  2' }] }),
        ],
      },
      {
        slug: 'possibility',
        title: '第四单元 可能性',
        description: '会用一定、可能、不可能描述事件，并比较简单可能性大小。',
        points: [
          point('meaning', '一定、可能、不可能', '会根据条件判断事件发生情况。', '有的事件一定发生，有的可能发生，有的不可能发生。', ['先看条件。', '再想结果会不会出现。', '判断属于哪一类。'], ['一定和可能混淆', '忽视条件', '靠感觉乱猜']),
          point('compare', '可能性大小', '会比较简单事件发生的可能性大小。', '数量越多，一般可能性越大。', ['看每种情况数量。', '比较多少。', '判断谁更容易发生。'], ['不看数量直接猜', '相等情况判断错', '题意看漏']),
        ],
        questions: [
          question('q1', 'meaning', 'judge', '判断题', '基础', '太阳每天都会从东方升起，这是一定会发生的。', '判断对错。', 'A', 'A. 对', '这是确定事件，所以是一定发生。', ['可能性', '生活实例'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'compare', 'single', '选择题', '提升', '盒子里有 5 个红球和 1 个蓝球，摸一次，摸到哪种球更可能？', '选择正确答案。', 'A', 'A. 红球', '红球数量更多，所以摸到红球的可能性更大。', ['可能性大小'], { options: [{ value: 'A', label: '红球' }, { value: 'B', label: '蓝球' }, { value: 'C', label: '一样大' }, { value: 'D', label: '无法判断' }] }),
        ],
      },
    ],
  },
  {
    id: 'grade-5-spring',
    label: '五年级下册',
    shortLabel: '五下',
    units: [
      {
        slug: 'fraction-meaning',
        title: '第一单元 分数的意义和性质',
        description: '理解单位1和分数的基本意义，会比较简单分数。',
        points: [
          point('unit-one', '单位一', '知道分数表示把单位1平均分后的若干份。', '分数中的1不一定是一个物体，也可以是一个整体。', ['先确定谁是单位1。', '再看平均分成几份。', '判断取了几份。'], ['单位1找错', '平均分条件忽略', '分子分母混淆']),
          point('compare', '分数比较', '会比较同分母或同分子分数大小。', '同分母比分子，同分子比分母。', ['先看分母是否相同。', '选对比较方法。', '必要时画图验证。'], ['规则混淆', '只看数字大小', '不会联系分数单位']),
        ],
        questions: [
          question('q1', 'unit-one', 'judge', '判断题', '基础', '分数一定表示把一个物体平均分。', '判断对错。', 'B', 'B. 错', '分数也可以表示把一些物体组成的整体平均分。', ['分数意义', '单位一'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'compare', 'single', '选择题', '提升', '在 3/5 和 4/5 中，哪个更大？', '选择正确答案。', 'B', 'B. 4/5', '同分母分数比较大小时，分子大的分数更大。', ['分数比较'], { options: [{ value: 'A', label: '3/5' }, { value: 'B', label: '4/5' }, { value: 'C', label: '一样大' }, { value: 'D', label: '无法比较' }] }),
        ],
      },
      {
        slug: 'factor-multiple',
        title: '第二单元 因数与倍数',
        description: '理解因数和倍数关系，会判断奇偶数与整除。',
        points: [
          point('relation', '因数和倍数', '知道因数和倍数是相互依存的关系。', '如果 a  b = c，那么 a 和 b 是 c 的因数，c 是 a 和 b 的倍数。', ['先看乘法关系。', '找谁能整除谁。', '再说谁是谁的因数或倍数。'], ['只说一半关系', '方向说反', '把加法关系当因数关系']),
          point('parity', '奇数和偶数', '会根据个位判断奇数偶数。', '能被 2 整除的是偶数，不能被 2 整除的是奇数。', ['看个位。', '判断能否被 2 整除。', '归类为奇数或偶数。'], ['个位判断错误', '0 的性质不清楚', '和质数概念混淆']),
        ],
        questions: [
          question('q1', 'relation', 'judge', '判断题', '基础', '6 是 3 的倍数，也可以说 3 是 6 的因数。', '判断对错。', 'A', 'A. 对', '因为 3 乘 2 等于 6，所以 6 是 3 的倍数，3 是 6 的因数。', ['因数与倍数'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'parity', 'single', '选择题', '提升', '下面哪个数是偶数？', '选择正确答案。', 'D', 'D. 28', '偶数能被 2 整除，28 是偶数。', ['奇数偶数'], { options: [{ value: 'A', label: '15' }, { value: 'B', label: '19' }, { value: 'C', label: '31' }, { value: 'D', label: '28' }] }),
        ],
      },
      {
        slug: 'fraction-add',
        title: '第三单元 分数加减法',
        description: '掌握同分母和异分母分数加减法。',
        points: [
          point('same', '同分母分数加减法', '会保持分母不变，只计算分子。', '同分母说明分数单位相同，可以直接相加减。', ['先看分母是否相同。', '分母保持不变。', '分子相加减并化简。'], ['把分母也相加减', '结果不化简', '符号看错']),
          point('different', '异分母分数加减法', '会先通分再计算。', '分母不同，分数单位不同，必须先通分。', ['先找公分母。', '再通分。', '最后计算并化简。'], ['没通分就算', '公分母找错', '通分后抄错']),
        ],
        questions: [
          question('q1', 'same', 'calc', '计算题', '基础', '1/4 + 2/4 = ?', '输入结果。', '3/4', '3/4', '同分母分数相加时，分母不变，分子相加，所以结果是 3/4。', ['分数加法', '同分母'], { placeholder: '例如：3/4' }),
          question('q2', 'different', 'calc', '计算题', '提升', '1/2 + 1/3 = ?', '输入结果。', '5/6', '5/6', '先把 1/2 和 1/3 通分成 3/6 和 2/6，再相加得 5/6。', ['分数加法', '通分'], { placeholder: '例如：5/6' }),
        ],
      },
      {
        slug: 'line-chart',
        title: '第四单元 折线统计图',
        description: '会读折线统计图，并判断数量变化趋势。',
        points: [
          point('read', '读图方法', '会从折线统计图中读出各时间点的数据。', '折线统计图既能表示数量多少，也能表示变化趋势。', ['先看横轴和纵轴。', '找对应点。', '读出具体数据。'], ['横纵轴看反', '刻度读错', '点和时间对应错']),
          point('trend', '变化趋势', '会判断上升、下降和不变。', '折线向上表示增加，向下表示减少，水平表示不变。', ['先找前后两个点。', '比较高低。', '描述变化趋势。'], ['只看一个点', '趋势判断反了', '忽略时间顺序']),
        ],
        questions: [
          question('q1', 'read', 'judge', '判断题', '基础', '折线统计图不仅能看出数量多少，还能看出变化情况。', '判断对错。', 'A', 'A. 对', '折线统计图的特点之一就是能反映数量变化。', ['折线统计图', '读图'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'trend', 'single', '选择题', '提升', '如果折线从左到右越来越高，通常表示什么？', '选择正确说法。', 'B', 'B. 数量在增加', '折线越来越高，一般表示数量在增加。', ['折线统计图', '趋势'], { options: [{ value: 'A', label: '数量不变' }, { value: 'B', label: '数量在增加' }, { value: 'C', label: '数量在减少' }, { value: 'D', label: '无法判断' }] }),
        ],
      },
    ],
  },
  {
    id: 'grade-6-fall',
    label: '六年级上册',
    shortLabel: '六上',
    units: [
      {
        slug: 'fraction-multiply',
        title: '第一单元 分数乘法',
        description: '掌握分数乘整数和分数乘分数的基础算法。',
        points: [
          point('rule', '分数乘法法则', '会用分子乘分子、分母乘分母的方法计算。', '能约分的要先约分，再计算更简便。', ['先看能否约分。', '再按法则相乘。', '最后化成最简分数。'], ['不会约分', '分子分母乘错', '结果不化简']),
          point('application', '分数乘法应用', '会求一个数的几分之几是多少。', '求一个数的几分之几，通常用乘法。', ['先找单位一。', '再看求几分之几。', '列乘法算式。'], ['单位一找错', '乘法写成除法', '题意理解反了']),
        ],
        questions: [
          question('q1', 'rule', 'calc', '计算题', '基础', '2/3  3/4 = ?', '输入结果。', '1/2', '1/2', '分子乘分子得 6，分母乘分母得 12，化简后是 1/2。', ['分数乘法'], { placeholder: '例如：1/2' }),
          question('q2', 'application', 'single', '选择题', '提升', '18 米的 1/3 是多少米？', '选择正确算式。', 'A', 'A. 18  1/3', '求 18 米的三分之一，就是 18 乘 1/3。', ['分数乘法应用'], { options: [{ value: 'A', label: '18  1/3' }, { value: 'B', label: '18  3  1' }, { value: 'C', label: '18 + 1/3' }, { value: 'D', label: '1/3  18' }] }),
        ],
      },
      {
        slug: 'circle-percent',
        title: '第二单元 圆与百分数',
        description: '整理圆的基本公式，理解百分数的常见生活应用。',
        points: [
          point('circle', '圆的周长和面积', '会根据半径或直径求圆的周长和面积。', '圆的周长等于 2 乘圆周率乘半径，圆的面积等于圆周率乘半径的平方。', ['先找半径或直径。', '判断求周长还是面积。', '代入公式计算。'], ['周长和面积公式混淆', '半径直径弄错', '平方漏写']),
          point('percent', '百分数应用', '会理解折扣、合格率等常见百分数问题。', '八折就是 80%，九折就是 90%。', ['先把百分数意思看懂。', '再联系原价或总数。', '列式计算。'], ['折扣理解错', '百分数和分数混淆', '单位一找错']),
        ],
        questions: [
          question('q1', 'circle', 'calc', '计算题', '基础', '一个圆的半径是 2 厘米，面积约是多少平方厘米？', '取圆周率 3.14，输入结果。', '12.56', '12.56 平方厘米', '面积等于 3.14 乘 2 再乘 2，结果是 12.56。', ['圆', '面积'], { placeholder: '例如：12.56' }),
          question('q2', 'percent', 'single', '选择题', '提升', '商品打八折，表示现价是原价的多少？', '选择正确答案。', 'B', 'B. 80%', '八折表示现价是原价的 80%。', ['百分数', '折扣'], { options: [{ value: 'A', label: '20%' }, { value: 'B', label: '80%' }, { value: 'C', label: '8%' }, { value: 'D', label: '108%' }] }),
        ],
      },
      {
        slug: 'fraction-divide',
        title: '第三单元 分数除法',
        description: '掌握分数除法基本法则，会解决简单应用题。',
        points: [
          point('rule', '分数除法法则', '知道除以一个数等于乘这个数的倒数。', '分数除法可以转化成分数乘法来计算。', ['先看除数。', '把除法改成乘法。', '乘除数的倒数。'], ['不会找倒数', '除号没改乘号', '结果不化简']),
          point('application', '分数除法应用', '会解决已知几分之几是多少求整体的问题。', '已知单位一的几分之几是多少，求单位一，常用除法。', ['先找已知量。', '判断单位一。', '列除法算式。'], ['单位一找错', '题意看反', '算式方向错']),
        ],
        questions: [
          question('q1', 'rule', 'calc', '计算题', '基础', '3/4  3 = ?', '输入结果。', '1/4', '1/4', '3/4 除以 3 等于 3/4 乘 1/3，结果是 1/4。', ['分数除法'], { placeholder: '例如：1/4' }),
          question('q2', 'application', 'single', '选择题', '提升', '已知一个数的 1/4 是 6，求这个数，应该怎么列式？', '选择正确算式。', 'C', 'C. 6  1/4', '已知一个数的四分之一是 6，求整体要用 6 除以 1/4。', ['分数除法应用'], { options: [{ value: 'A', label: '6  1/4' }, { value: 'B', label: '6 + 1/4' }, { value: 'C', label: '6  1/4' }, { value: 'D', label: '1/4  6' }] }),
        ],
      },
      {
        slug: 'fan-chart',
        title: '第四单元 扇形统计图',
        description: '认识扇形统计图，会比较各部分占整体的比例。',
        points: [
          point('meaning', '扇形统计图意义', '知道扇形统计图适合表示部分与整体的关系。', '整个圆表示整体，各扇形表示整体中的一部分。', ['先看整体。', '再看各部分大小。', '比较占比。'], ['把扇形图当变化图', '不理解整体和部分', '只看颜色不看大小']),
          point('compare', '比例比较', '会比较不同扇形所占比例。', '扇形越大，表示所占比例通常越大。', ['观察扇形大小。', '比较比例。', '结合题意判断。'], ['比例判断错', '不会联系整体', '只看名称不看图形']),
        ],
        questions: [
          question('q1', 'meaning', 'judge', '判断题', '基础', '扇形统计图适合表示各部分占整体的多少。', '判断对错。', 'A', 'A. 对', '扇形统计图就是用来表示部分与整体关系的。', ['扇形统计图'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'compare', 'single', '选择题', '提升', '同一张扇形统计图中，最大扇形通常说明什么？', '选择正确说法。', 'B', 'B. 这一部分占整体最多', '最大扇形一般表示这一部分所占比例最大。', ['扇形统计图', '比例比较'], { options: [{ value: 'A', label: '这一部分最少' }, { value: 'B', label: '这一部分占整体最多' }, { value: 'C', label: '整体变小了' }, { value: 'D', label: '无法判断' }] }),
        ],
      },
    ],
  },
  {
    id: 'grade-6-spring',
    label: '六年级下册',
    shortLabel: '六下',
    units: [
      {
        slug: 'proportion',
        title: '第一单元 比例',
        description: '理解比和比例，会判断成正比例或反比例的关系。',
        points: [
          point('ratio', '比和比例', '知道两个比相等可以组成比例。', '比例表示两个比相等，可以写成等式形式。', ['先写出两个比。', '再比较是否相等。', '判断能否组成比例。'], ['把比和比例混淆', '前后项对应错误', '化简不准确']),
          point('relation', '正比例和反比例', '会根据数量变化判断关系类型。', '一种量随着另一种量同向变化且比值一定，通常是正比例。', ['先看两个量怎么变。', '再看比值或积是否一定。', '判断关系类型。'], ['只看同增同减', '比值和积分不清', '关系判断错']),
        ],
        questions: [
          question('q1', 'ratio', 'judge', '判断题', '基础', '如果两个比相等，就可以组成比例。', '判断对错。', 'A', 'A. 对', '比例的定义就是表示两个比相等。', ['比例', '定义'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'relation', 'single', '选择题', '提升', '路程一定时，速度和时间是什么关系？', '选择正确答案。', 'C', 'C. 反比例', '路程一定时，速度越快，时间越少，它们的积保持不变，所以是反比例。', ['比例关系', '反比例'], { options: [{ value: 'A', label: '正比例' }, { value: 'B', label: '没有关系' }, { value: 'C', label: '反比例' }, { value: 'D', label: '无法判断' }] }),
        ],
      },
      {
        slug: 'solid-review',
        title: '第二单元 圆柱与圆锥',
        description: '整理圆柱和圆锥的底面、高、体积等基础知识。',
        points: [
          point('cylinder', '圆柱体积', '知道圆柱体积等于底面积乘高。', '圆柱体积公式是底面积乘高。', ['先求底面积。', '再找高。', '代入公式。'], ['把体积和表面积混淆', '高找错', '单位漏写']),
          point('cone', '圆锥体积', '知道同底同高圆锥体积是圆柱的三分之一。', '圆锥体积等于底面积乘高再除以 3。', ['先求底面积乘高。', '再除以 3。', '检查单位。'], ['忘记除以 3', '与圆柱公式混淆', '数量关系不清']),
        ],
        questions: [
          question('q1', 'cylinder', 'calc', '计算题', '基础', '一个圆柱底面积是 10 平方厘米，高是 3 厘米，体积是多少？', '输入结果。', '30', '30 立方厘米', '圆柱体积等于底面积乘高，10 乘 3 等于 30。', ['圆柱', '体积'], { placeholder: '例如：30', acceptedAnswers: ['30立方厘米'] }),
          question('q2', 'cone', 'judge', '判断题', '提升', '同底同高的圆锥体积是圆柱体积的三分之一。', '判断对错。', 'A', 'A. 对', '这是圆锥和圆柱体积关系的重要结论。', ['圆锥', '体积关系'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
        ],
      },
      {
        slug: 'scale',
        title: '第三单元 比例尺',
        description: '理解比例尺意义，会做图上距离和实际距离换算。',
        points: [
          point('meaning', '比例尺意义', '知道比例尺表示图上距离和实际距离的比。', '比例尺前项通常是图上距离，后项通常是实际距离。', ['分清图上距离和实际距离。', '看比例尺前后项。', '判断缩小关系。'], ['前后项看反', '单位没统一', '把比例尺当普通比']),
          point('convert', '比例尺换算', '会根据比例尺求图上或实际距离。', '换算时要先统一单位，再按比例关系求。', ['先统一单位。', '写出比例关系。', '计算并检查结果。'], ['单位不统一', '比例关系写错', '数量级不合理']),
        ],
        questions: [
          question('q1', 'meaning', 'judge', '判断题', '基础', '比例尺 1:500000 表示图上 1 厘米代表实际 500000 厘米。', '判断对错。', 'A', 'A. 对', '比例尺 1:500000 的意思就是图上 1 厘米对应实际 500000 厘米。', ['比例尺'], { options: [{ value: 'A', label: '对' }, { value: 'B', label: '错' }] }),
          question('q2', 'convert', 'fill', '应用题', '提升', '在比例尺 1:200000 的地图上，2 厘米表示实际（  ）千米。', '输入数字。', '4', '4 千米', '2 厘米对应实际 400000 厘米，也就是 4 千米。', ['比例尺', '换算'], { placeholder: '例如：4' }),
        ],
      },
      {
        slug: 'review-math',
        title: '第四单元 数与图形总复习',
        description: '综合整理百分数、比例、面积和体积等常见知识。',
        points: [
          point('number', '数的互化整理', '会把小数、分数、百分数联系起来理解。', '不同形式的数可以表示同一个数量。', ['先看数的形式。', '尝试互化。', '比较大小是否相等。'], ['只看形式不看大小', '互化规则混淆', '百分号处理错误']),
          point('geometry', '图形公式整理', '会区分周长、面积和体积公式。', '做题前先判断求的是长度、面积还是体积。', ['先看问题求什么。', '选择对应公式。', '代入数据检查单位。'], ['面积和体积混淆', '公式选错', '单位不统一']),
        ],
        questions: [
          question('q1', 'number', 'single', '选择题', '基础', '下面哪组数相等？', '选择正确答案。', 'A', 'A. 0.25、1/4、25%', '0.25、1/4 和 25% 表示的是同一个数量。', ['数的互化'], { options: [{ value: 'A', label: '0.25、1/4、25%' }, { value: 'B', label: '0.3、1/3、30%' }, { value: 'C', label: '0.5、1/4、50%' }, { value: 'D', label: '0.8、4/5、8%' }] }),
          question('q2', 'geometry', 'calc', '综合题', '提升', '一个圆柱底面积是 10 平方厘米，高是 3 厘米，体积是多少？', '输入结果。', '30', '30 立方厘米', '圆柱体积等于底面积乘高，10 乘 3 等于 30。', ['图形公式', '体积'], { placeholder: '例如：30', acceptedAnswers: ['30立方厘米'] }),
        ],
      },
    ],
  },
]

export const semesterOptions = semesterDrafts.map(({ id, shortLabel }) => ({
  id,
  label: shortLabel,
  available: true,
}))

export const courseCatalog: Semester[] = semesterDrafts.map((semester) => ({
  id: semester.id,
  label: semester.label,
  units: semester.units.map((unit) => buildUnit(semester.id, unit)),
}))