<div align="center">

# GO Photo Studio Skill

> Skill de retrato profesional con preservación de identidad, análisis por capas, compuerta de calidad y reintento automático.

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Skill](https://img.shields.io/badge/Codex-Skill-7c3aed)](./skills/go-photo-studio/SKILL.md)
[![Pipeline](https://img.shields.io/badge/Pipeline-A%E2%86%92E-0ea5e9)](./skills/go-photo-studio/references/pipeline.md)

**Languages**: [简体中文](./README.md) · [English](./README.en.md) · [日本語](./README.ja.md) · [Español](./README.es.md)

</div>

---

## Resumen

GO Photo Studio Skill convierte “selfie + solicitud ambigua” en un flujo de retrato profesional reutilizable, auditable y portable entre proveedores.

Ya no necesitas ir al estudio: evitar una sola sesión puede ahorrar el equivalente a un mes de gasto en tokens. Las fotos tipo documento pasan a ser bajo demanda y de bajo costo, para que cualquiera pueda construir un perfil profesional de nivel emprendedor.

## Metodología

1. Entradas estructuradas en lugar de prompts libres
2. Pipeline de 5 etapas: A análisis por capas -> B extracción de identidad -> C estilización guiada -> D plan de exportación -> E verificación/reintento
3. Doble validación: métricas del modelo + puntuación local de identidad
4. Sanitización de constraints antes de generar
5. Reintento con constraints más estrictos si falla la compuerta de calidad

## Presets públicos

Fuente: `skills/go-photo-studio/references/presets.json` (14 presets)

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

## Comandos (NPM Scripts)

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

## Ejemplos y datos de evaluación

- Requests: `skills/go-photo-studio/examples/requests/`
- Outputs: `skills/go-photo-studio/examples/outputs/`
- Eval sets:
  - `skills/go-photo-studio/references/eval/eval.json`
  - `skills/go-photo-studio/references/eval/eval.fixture.112.json`

## Soporte de Provider

Scripts de análisis/verificación: `gemini`, `openai`, `anthropic`

Generación CLI: `gemini`, `openai`
- Script: `skills/go-photo-studio/scripts/generate-with-provider.cjs`

## Dependencias de Python (opcional)

Para scoring local de identidad (deterministic + embedding):

```bash
pip install -r skills/go-photo-studio/scripts/requirements.txt
```

- `skills/go-photo-studio/scripts/deterministic-identity-score.py`
- `skills/go-photo-studio/scripts/embedding-identity-score.py`

## Dashboard de calidad

- Historial: `.pipeline-history/runs.ndjson`
- Construcción:

```bash
npm run skill:dashboard
```

- Salidas:
  - `skills/go-photo-studio/monitoring/dashboard.json`
  - `skills/go-photo-studio/monitoring/dashboard.md`

## Brechas restantes (evaluación honesta)

- `eval.fixture.112.json` sirve para regresión/calibración inicial; los umbrales productivos aún requieren datos reales continuos.
- `skill:e2e:mock` valida la cadena técnica, no la calidad real del modelo.
- El parámetro `language` en scripts aún soporta `en|zh`.

## Comunidad

- Guía de contribución: `CONTRIBUTING.md`
- Código de conducta: `CODE_OF_CONDUCT.md`
- Plantillas de issue: `.github/ISSUE_TEMPLATE/`
- Plantilla de PR: `.github/pull_request_template.md`
- Feedback de calidad de generación: `.github/ISSUE_TEMPLATE/generation_feedback.yml`

## Licencia

MIT. [LICENSE](./LICENSE)
