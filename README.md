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

风格源文件：`skills/go-photo-studio/references/presets.json`

| Preset ID | Label | Category | 用途 | 约束重点 |
| :--- | :--- | :--- | :--- | :--- |
| `studio-classic` | Studio Classic | professional | 领英/管理层商务头像 | 禁止特写过近、蜡皮感 |
| `tech-founder` | Tech Founder | professional | 创业者/科技职业头像 | 禁止 noir 风、禁止厚重布景 |
| `resume-modern` | Modern Resume | resume | 简历/求职平台头像 | 禁止时尚化过度、卡通化 |
| `id-standard` | ID Standard | id | 中性证件风格头像 | 禁止戏剧光影、创意色偏 |

## 目录结构

- Skill 入口：`skills/go-photo-studio/SKILL.md`
- 参考规范：`skills/go-photo-studio/references/`
- 可执行脚本：`skills/go-photo-studio/scripts/`
- 状态追踪：`skills/go-photo-studio/references/status.md`

## 快速开始

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

## Provider 支持

分析与验证脚本支持：
- `gemini`
- `openai`
- `anthropic`

前端运行时生图当前支持：
- `gemini`
- `openai`

环境变量参考：`.env.example`

## 合规说明

- 默认公开 preset 不包含实名明星风格。
- 支持通过独立 preset 文件做私有扩展，但建议与公开版隔离。

## 许可证

MIT，见 [LICENSE](./LICENSE)。
