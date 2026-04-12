<div align="center">

# GO Photo Studio Skill

<img src="./assets/logo/logo-main-240.png" width="120" alt="GO Photo Studio Skill logo" />

> レイヤー解析・本人性保持・品質ゲート・自動リトライを備えた、本人性重視のポートレート生成 Skill。

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Skill](https://img.shields.io/badge/Codex-Skill-7c3aed)](./skills/go-photo-studio/SKILL.md)
[![Pipeline](https://img.shields.io/badge/Pipeline-A%E2%86%92E-0ea5e9)](./skills/go-photo-studio/references/pipeline.md)

**Languages**: [简体中文](./README.md) · [English](./README.en.md) · [日本語](./README.ja.md) · [Español](./README.es.md)

</div>

---

## 概要

GO Photo Studio Skill は「セルフィー + 曖昧な要望」を、監査可能で再利用可能なプロ品質の人物写真ワークフローに変換します。

もう写真館に行かなくても大丈夫です。1回分を省くだけで、1か月分のトークン費用を節約できる可能性があります。証明写真はより手軽に、誰でも低コストで起業家レベルのプロフィールを作れます。

## 手法

1. 自由入力より構造化入力を優先
2. 5段階パイプライン: A レイヤー解析 -> B 本人性抽出 -> C 制御スタイライズ -> D 出力計画 -> E 検証/再試行
3. 二重検証: モデル評価 + ローカル本人性スコア
4. 生成前に制約をサニタイズ
5. 品質ゲート失敗時は制約を強化して再試行

## 公開プリセット

ソース: `skills/go-photo-studio/references/presets.json`（14 preset）

- `studio-classic`
- `tech-founder`
- `elite-leadership`
- `creative-studio`
- `medical-professional`
- `academic-scholar`
- `resume-modern`
- `resume-premium`
- `resume-creative`
- `id-standard`
- `id-schengen`
- `id-blue-premium`
- `casual-outdoor`
- `casual-cafe`

## 実行コマンド（NPM Scripts）

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

## サンプル / 評価データ

- リクエスト例: `skills/go-photo-studio/examples/requests/`
- 出力例: `skills/go-photo-studio/examples/outputs/`
- 評価セット:
  - `skills/go-photo-studio/references/eval/eval.json`
  - `skills/go-photo-studio/references/eval/eval.fixture.112.json`

## Provider サポート

分析/検証スクリプト: `gemini`, `openai`, `anthropic`

CLI 生画像生成: `gemini`, `openai`
- 生成スクリプト: `skills/go-photo-studio/scripts/generate-with-provider.cjs`

## Python 依存（任意）

ローカル本人性スコア（deterministic + embedding）で使用:

```bash
pip install -r skills/go-photo-studio/scripts/requirements.txt
```

- `skills/go-photo-studio/scripts/deterministic-identity-score.py`
- `skills/go-photo-studio/scripts/embedding-identity-score.py`

## 品質モニタリング

- 実行履歴: `.pipeline-history/runs.ndjson`
- ダッシュボード生成:

```bash
npm run skill:dashboard
```

- 出力:
  - `skills/go-photo-studio/monitoring/dashboard.json`
  - `skills/go-photo-studio/monitoring/dashboard.md`

## 現在の残課題（正直な評価）

- `eval.fixture.112.json` は回帰用のフィクスチャです。運用閾値は実ユーザーデータで継続調整が必要です。
- `skill:e2e:mock` は配線確認向けで、実モデル品質の証明ではありません。
- スクリプトの `language` は現在 `en|zh` のみ対応です。

## コミュニティ

- 参加ガイド: `CONTRIBUTING.md`
- 行動規範: `CODE_OF_CONDUCT.md`
- Issue templates: `.github/ISSUE_TEMPLATE/`
- PR template: `.github/pull_request_template.md`
- 生成品質フィードバック: `.github/ISSUE_TEMPLATE/generation_feedback.yml`

## ライセンス

MIT. [LICENSE](./LICENSE)
