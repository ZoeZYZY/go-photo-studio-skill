<div align="center">

# GO Photo Studio Skill

> レイヤー解析・本人性保持・品質ゲート・自動リトライを備えた、本人性重視のポートレート生成 Skill。

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Skill](https://img.shields.io/badge/Codex-Skill-7c3aed)](./skills/go-photo-studio/SKILL.md)
[![Pipeline](https://img.shields.io/badge/Pipeline-A%E2%86%92E-0ea5e9)](./skills/go-photo-studio/references/pipeline.md)

**Languages**: [简体中文](./README.md) · [English](./README.en.md) · [日本語](./README.ja.md) · [Español](./README.es.md)

</div>

---

## 概要

GO Photo Studio Skill は「セルフィー + 曖昧な要望」を、監査可能で再利用可能なプロ品質の人物写真ワークフローに変換します。

## 手法

1. 自由入力より構造化入力を優先
2. 5段階パイプライン: A レイヤー解析 -> B 本人性抽出 -> C 制御スタイライズ -> D 出力計画 -> E 検証/再試行
3. 二重検証: モデル評価 + ローカル決定論スコア
4. 生成前に制約をサニタイズ
5. 品質ゲート失敗時は制約を強化して再試行

## 公開プリセット

- `studio-classic`
- `tech-founder`
- `resume-modern`
- `id-standard`

## クイックスタート

```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input request.json
node skills/go-photo-studio/scripts/compose_prompt.cjs --input request.json
node skills/go-photo-studio/scripts/run-pipeline.cjs --request request.json --generated output.png --provider gemini
```

## ライセンス

MIT. [LICENSE](./LICENSE)
