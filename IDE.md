# IDE 适配指南（IDE.md）

适用环境：VS Code、Cursor、Windsurf、Claude Code、Codex CLI 及其他 IDE Agent。

核心原则：把仓库脚本当作稳定接口，不要把复杂 prompt 逻辑硬编码在聊天指令里。

## 最小工作流

1. 准备 `request.json`
2. 校验输入（validation）
3. 生成结构化 prompt payload
4. 执行 A->E 管线
5. 查看 `pipeline-summary.json`

## 命令

```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input request.json
node skills/go-photo-studio/scripts/compose_prompt.cjs --input request.json
node skills/go-photo-studio/scripts/run-pipeline.cjs --request request.json --generated output.png --provider gemini --outdir .pipeline-out
cat .pipeline-out/pipeline-summary.json
```

## 建议 IDE Task 名称

- `skill:validate`
- `skill:compose`
- `skill:run-pipeline`
- `skill:calibrate-thresholds`

## 关键文件约定

- 风格源：`skills/go-photo-studio/references/presets.json`
- 验证阈值：`skills/go-photo-studio/references/verification-thresholds.json`
- 状态记录：`skills/go-photo-studio/references/status.md`

## 跨平台复用建议

- Codex：以 `SKILL.md + scripts/` 为主。
- Claude：以本文件 + `CLAUDE.md` 为落地入口。
- 其他 IDE Agent：复用相同命令序列，重点统一输入输出文件契约。
