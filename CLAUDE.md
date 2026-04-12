# Claude 适配指南（CLAUDE.md）

本仓库是 `Codex-first` 的技能实现，但已提供可直接在 Claude 工作流中复用的稳定入口。

## 推荐入口

1. 技能规范：`skills/go-photo-studio/SKILL.md`
2. 管线脚本：
- `skills/go-photo-studio/scripts/validate_request.cjs`
- `skills/go-photo-studio/scripts/compose_prompt.cjs`
- `skills/go-photo-studio/scripts/run-pipeline.cjs`

## Claude 可直接使用的任务描述（复制即用）

Use the GO Photo Studio skill pipeline.
Input request JSON is at `request.json`.
Run validation, build payload, execute A->E pipeline, and report pass/fail with key metrics.
If Stage E fails, retry with stronger constraints once.

## 建议命令序列

```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input request.json
node skills/go-photo-studio/scripts/compose_prompt.cjs --input request.json
node skills/go-photo-studio/scripts/run-pipeline.cjs --request request.json --generated output.png --provider anthropic
```

## Provider 说明

- `--provider gemini|openai|anthropic` 可用于分析/验证类脚本。
- 前端实时生图目前支持 `gemini` 与 `openai`。
- 若走 Claude/Anthropic 作为主代理，建议仍使用本仓库脚本做编排与验证门控。

## 合规边界

拒绝如下请求：
- 换脸（face swap）
- 冒充他人（impersonation）
- 欺骗性身份变更（deceptive identity changes）
