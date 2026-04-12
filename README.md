# GO Photo Studio 📸

**Professional AI Headshot & Identity Photo Generator**

GO Photo Studio is a high-end AI-powered portrait studio that transforms casual selfies into professional, studio-quality headshots. Built with a focus on **Identity Integrity** and **Photographic Realism**, it ensures that you look like *you*—only in a professional setting.

## 🚀 Key Features

- **Smart Canvas Expansion**: Automatically corrects tight selfie framing by expanding the canvas and using AI out-painting to generate missing shoulders and torso.
- **Executive Realism**: Specialized "Studio Classic" mode designed for corporate leadership profiles, legal, and finance professionals.
- **Reusable Preset Library**: Skill-driven presets for professional, resume, and ID-style output with explicit negative constraints.
- **Post-Generation Customization**: Generate first, then choose your download dimensions (4:5, 1:1, 9:16, 2x2 Visa) and quality (HD, Ultra Print).
- **Identity Preservation**: Advanced prompt engineering ensures natural skin textures, believable pores, and zero "AI plastic" look.

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS (Comic Pop Aesthetic)
- **UI Components**: Shadcn/UI + Framer Motion
- **AI Engine**: Gemini / OpenAI (provider-switchable)
- **Image Processing**: Browser Canvas API for pre-processing and composition correction.

## 🧩 Reusable Skill Package

This repository now includes a reusable skill package at:

- `skills/go-photo-studio/SKILL.md`
- `skills/go-photo-studio/references/` (presets, policy, integration notes)
- `skills/go-photo-studio/scripts/` (request validation + prompt composition)

Example usage:

```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input request.json
node skills/go-photo-studio/scripts/compose_prompt.cjs --input request.json
node skills/go-photo-studio/scripts/run-pipeline.cjs --request request.json --generated output.png
```

The frontend reads style presets from `skills/go-photo-studio/references/presets.json` so skill and UI stay in sync.

## 📖 How to Use

1. **Upload**: Select a clear photo of your face (selfies are fine!).
2. **Select Style**: Choose from Professional, Resume, or ID categories.
3. **Generate**: Click "GENERATE NOW" to see your transformation.
4. **Download**: Click "DOWNLOAD", select your desired aspect ratio and quality, and save your new professional portrait.

## 🛡️ Privacy & Security

- **Identity First**: We prioritize maintaining your real facial features.
- **Safety by Default**: The skill attaches fixed negative constraints to reduce over-retouching and unsafe transformations.

## 📸 Examples & Results

| Category | Style | Key Visual |
| :--- | :--- | :--- |
| **Professional** | Studio Classic | Clean grey gradient, executive framing, natural skin. |
| **Professional** | Tech Founder | Bright workspace bokeh, modern approachable profile. |
| **Resume** | Modern Resume | Bright, approachable, high-end corporate feel. |
| **ID** | ID Standard | Plain background, centered framing, neutral expression. |

## 🎨 Available Styles

The style source of truth is:
- `skills/go-photo-studio/references/presets.json`

Current preset listing:

| Preset ID | Label | Category | Best For | Negative Constraint Focus |
| :--- | :--- | :--- | :--- | :--- |
| `studio-classic` | Studio Classic | professional | Corporate leadership, LinkedIn | No extreme close-up, no waxy skin |
| `tech-founder` | Tech Founder | professional | Startup/founder profile | No noir look, no heavy boardroom staging |
| `resume-modern` | Modern Resume | resume | CV / job applications | No fashionized output, no cartoon rendering |
| `id-standard` | ID Standard | id | Neutral ID-style portrait | No dramatic shadows, no creative color cast |

## ⚙️ How It Works (The Master Strategy)

GO Photo Studio uses a **9:16 Master Expansion Strategy** to ensure perfect composition across all formats:

1.  **Image Analysis**: The system analyzes the uploaded face for hair style, makeup, and temperament.
2.  **Canvas Out-painting**: Instead of a tight crop, the system generates a full **9:16 vertical portrait**. It intentionally scales the face down (approx. 40% of frame) and generates missing shoulders and background.
3.  **Modular Prompting**: Prompts are assembled using four layers: `Base Style` + `Composition Correction` + `Realism Protection` + `Negative Constraints`.
4.  **Dynamic Re-cropping**: When you download a 4:5 or 1:1 photo, the system crops it from the 9:16 "Master" image. Because we generated "extra" body and background, the subject remains perfectly framed without "chopped shoulders."

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ for professionals who need a better headshot.*
