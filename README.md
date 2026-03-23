# Math Knowledge Tool

一个基于 Vite + React + TypeScript 的小学数学知识点学习工具原型。

## 在线访问

- 公网页面：<https://peihan-banana.github.io/Math_Knowledge/>
- 网页二维码：`public/math-knowledge-pages-qr.png`

## 当前版本

当前已实现首版 MVP：

- 三年级上册
- 2 个单元示例内容
- 知识点目录浏览
- 知识卡片与解题步骤
- 知识点练习
- 单元闯关
- 错题复习
- 薄弱标签统计
- 本地学习记录保存（localStorage）

## 项目结构

- `src/App.tsx`：主界面与练习逻辑
- `src/data/mathContent.ts`：课程、知识点与题目数据
- `src/App.css`：页面布局与视觉样式
- `src/index.css`：全局样式与主题变量

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 后续扩展方向

- 补充 3-6 年级完整教材目录
- 增加题库导入功能
- 增加学生账号与学习计划
- 增加家长/老师视角统计
- 封装为桌面版离线工具