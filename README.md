<div align="center">

# GO Photo Studio Skill

> 以身份保真为核心的专业人像生成 Skill：分层解析、身份锚定、受控风格化、验证门与自动重试。

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Skill](https://img.shields.io/badge/Codex-Skill-7c3aed)](./skills/go-photo-studio/SKILL.md)
[![Pipeline](https://img.shields.io/badge/Pipeline-A%E2%86%92E-0ea5e9)](./skills/go-photo-studio/references/pipeline.md)
[![Status](https://img.shields.io/badge/Status-Public%20%2F%20Active-22c55e)](./skills/go-photo-studio/references/status.md)

**语言 / Languages**：
[简体中文](./README.md) · [English](./README.en.md) · [日本語](./README.ja.md) · [Español](./README.es.md)

</div>

---

## 项目简介

GO Photo Studio Skill 是一套可复用的人像生成方法论和工具链，用于把“随意自拍 + 模糊需求”转成“可迁移、可审计、可验证”的专业头像生成流程。

不用再去专业相馆了：少去一次就可能省下一个月的 token 费用。以后证件照更自由，人人都能低成本打造自己的专业形象。

核心目标：
- 身份保真（不改脸型骨相，不漂年龄线索）
- 风格可控（preset + negative constraints）
- 质量可验（Stage E 验证门）
- 工程化复用（脚本化 pipeline + 多 provider 适配）

## 方法论（Methodology）

1. 结构化优先：先把风格和限制结构化，而不是直接自由 prompt。
2. 五阶段管线：A 分层解析 → B 身份提取 → C 受控风格化 → D 导出计划 → E 验证与重试。
3. 双轨验证：AI 评分 + 本地确定性身份分数并行。
4. 风险前置：用户 constraints 先清洗，再进入生成。
5. 失败可恢复：验证不通过时自动升级负面约束重试。

## 风格列表（当前公开版）

风格源文件：`skills/go-photo-studio/references/presets.json`（当前共 14 个非明星 preset）

### Professional（6）

| Preset ID | Label | 用途 |
| :--- | :--- | :--- |
| `studio-classic` | Studio Classic | 管理层 / 领英商务头像 |
| `tech-founder` | Tech Founder | 创业者 / 科技职业形象 |
| `elite-leadership` | Elite Leadership | 高级管理者 / 董事会风格 |
| `creative-studio` | Creative Studio | 设计/创意职业资料照 |
| `medical-professional` | Medical Professional | 医疗行业专业头像 |
| `academic-scholar` | Academic Scholar | 学术/研究人员头像 |

### Resume（3）

| Preset ID | Label | 用途 |
| :--- | :--- | :--- |
| `resume-modern` | Modern Resume | 通用简历/求职平台 |
| `resume-premium` | Premium Resume | 高级商务简历头像 |
| `resume-creative` | Creative Resume | 创意岗位求职头像 |

### ID（3）

| Preset ID | Label | 用途 |
| :--- | :--- | :--- |
| `id-standard` | ID Standard | 标准证件风格 |
| `id-schengen` | Schengen Style ID | 申根风格证件照 |
| `id-blue-premium` | Premium Blue ID | 轻风格化高端证件照 |

### Casual（2）

| Preset ID | Label | 用途 |
| :--- | :--- | :--- |
| `casual-outdoor` | Outdoor Natural | 户外自然光职业形象 |
| `casual-cafe` | Casual Cafe | 轻商务社交头像 |

## 目录结构

- Skill 入口：`skills/go-photo-studio/SKILL.md`
- 参考规范：`skills/go-photo-studio/references/`
- 可执行脚本：`skills/go-photo-studio/scripts/`
- 示例输入输出：`skills/go-photo-studio/examples/`
- 冒烟测试：`skills/go-photo-studio/tests/smoke.cjs`
- 架构说明：`ARCHITECTURE.md`
- 状态追踪：`skills/go-photo-studio/references/status.md`
- Claude 适配：`CLAUDE.md`
- IDE 适配：`IDE.md`

## 快速开始（CLI）

1) 校验请求

```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input request.json
```

2) 生成标准 prompt payload

```bash
node skills/go-photo-studio/scripts/compose_prompt.cjs --input request.json
```

3) 跑完整 A→E 管线（含验证门）

```bash
node skills/go-photo-studio/scripts/run-pipeline.cjs \
  --request request.json \
  --generated output.png \
  --provider gemini
```

4) 使用标注样本校准阈值

```bash
node skills/go-photo-studio/scripts/calibrate-thresholds.cjs \
  --input skills/go-photo-studio/references/eval/eval.json \
  --output skills/go-photo-studio/references/verification-thresholds.json
```

## 一键执行环境（NPM Scripts）

```bash
npm run skill:validate:example
npm run skill:compose:example
npm run skill:pipeline:dryrun
npm run skill:e2e:mock
npm run skill:e2e:online:gemini
npm run skill:e2e:online:openai
npm run skill:eval:fixture
npm run skill:calibrate
npm run skill:calibrate:fixture
npm run skill:dashboard
npm run skill:test
```

说明：
- `skill:pipeline:dryrun` 在无 API Key 或无生成图时也能产出结构化阶段结果与 `pipeline-summary.json`，用于联调执行链路。
- `skill:test` 会运行冒烟测试，并自动产出示例 `compose` 结果文件。

## 示例用例与测试数据

- 示例请求：
  - `skills/go-photo-studio/examples/requests/resume-modern.zh.json`
  - `skills/go-photo-studio/examples/requests/id-standard.en.json`
  - `skills/go-photo-studio/examples/requests/invalid-missing-ratio.json`
  - `skills/go-photo-studio/examples/requests/e2e-mock.en.json`（离线端到端链路）
  - `skills/go-photo-studio/examples/requests/e2e-online.template.json`（真实在线端到端模板）
- 示例输出：
  - `skills/go-photo-studio/examples/outputs/compose.resume-modern.zh.json`
- 评估数据：
  - `skills/go-photo-studio/references/eval/eval.json`
  - `skills/go-photo-studio/references/eval/eval.fixture.112.json`（14 个 preset × 每个 8 条）

## Provider 支持

分析与验证脚本支持：
- `gemini`
- `openai`
- `anthropic`

前端运行时生图当前支持：
- `gemini`
- `openai`

CLI 在线生图脚本支持：
- `gemini`
- `openai`
- 入口：`skills/go-photo-studio/scripts/generate-with-provider.cjs`

环境变量参考：`.env.example`

Python（可选，仅本地确定性身份评分）：

```bash
pip install -r skills/go-photo-studio/scripts/requirements.txt
```

Embedding 身份相似度评分（可选）：
- 评分脚本：`skills/go-photo-studio/scripts/embedding-identity-score.py`
- Stage E 会尝试读取该分数并参与放行阈值判断（无依赖时自动退化为仅 deterministic 评分）。

## 生成质量监控面板

- 运行历史：`.pipeline-history/runs.ndjson`（由 `run-pipeline.cjs` 自动追加）
- 构建面板：

```bash
npm run skill:dashboard
```

- 输出：
  - `skills/go-photo-studio/monitoring/dashboard.json`
  - `skills/go-photo-studio/monitoring/dashboard.md`

指标覆盖：总运行数、失败率、平均重试次数、按 provider 分组统计。
并支持按 preset 的失败率与重试统计。

## 诚实的剩余问题（当前）

- 已提供 `eval.fixture.112.json` 用于分层联调与回归；但生产阈值仍需真实用户样本持续回灌。
- `skill:e2e:mock` 提供的是链路级演示（request -> staged JSON -> output.png），不是真实模型生图质量基准。
- `skill:e2e:online:*` 是最小真实链路示例，质量仍受 provider 模型版本与源图质量影响。
- 文档有多语言版本，但脚本请求参数 `language` 目前只支持 `en|zh`，其余语言是文档层可读性支持。
- 无 API key 时 A/B/E 走 fallback，能验证编排与契约，不代表在线质量结果。
- 根目录 `person_style_transformer_integration.py` 为历史研究代码，不参与当前公开 Skill 主链路。

## 语言标记说明

- GitHub 语言统计不使用“Node.js”标签，而是显示为 `JavaScript`。
- 本仓库核心执行层为 Node.js（`*.cjs`）+ JSON 数据文件。
- 已通过 `.gitattributes` 对演示前端（TS/TSX）做 `linguist-vendored`，避免其主导仓库语言标记。

## 合规说明

- 默认公开 preset 不包含实名明星风格。
- 支持通过独立 preset 文件做私有扩展，但建议与公开版隔离。

## 许可证

MIT，见 [LICENSE](./LICENSE)。

## 社区协作

- 贡献指南：`CONTRIBUTING.md`
- 行为准则：`CODE_OF_CONDUCT.md`
- Issue 模板：`.github/ISSUE_TEMPLATE/`
- PR 模板：`.github/pull_request_template.md`
- 生成质量反馈模板：`.github/ISSUE_TEMPLATE/generation_feedback.yml`
