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

## Metodología

1. Entradas estructuradas en lugar de prompts libres
2. Pipeline de 5 etapas: A análisis por capas -> B extracción de identidad -> C estilización guiada -> D plan de exportación -> E verificación/reintento
3. Doble validación: métricas del modelo + puntuación determinística local
4. Sanitización de constraints antes de generar
5. Reintento con constraints más estrictos si falla la compuerta de calidad

## Presets públicos

- `studio-classic`
- `tech-founder`
- `resume-modern`
- `id-standard`

## Inicio rápido

```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input request.json
node skills/go-photo-studio/scripts/compose_prompt.cjs --input request.json
node skills/go-photo-studio/scripts/run-pipeline.cjs --request request.json --generated output.png --provider gemini
```

## Licencia

MIT. [LICENSE](./LICENSE)
