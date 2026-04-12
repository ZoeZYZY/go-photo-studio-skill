# GitHub Sharing Skill

This skill provides a guide on how to share your AI Studio project as a GitHub repository.

## Overview
Sharing your project on GitHub allows for version control, collaboration, and public showcasing of your AI-powered applications.

## Steps to Share

1. **Open Settings**: In the AI Studio interface, locate the **Settings** (gear icon) in the top-right or sidebar.
2. **Export to GitHub**: Look for the "Export" or "GitHub" section.
3. **Authenticate**: You will be prompted to connect your GitHub account if you haven't already.
4. **Select Repository**:
   - Choose "Create new repository".
   - Give it a name (e.g., `lumina-ai-headshots`).
   - Set visibility (Public/Private).
5. **Push Code**: Click "Export" or "Push". AI Studio will automatically create the repo and push all your current files.

## Best Practices
- **README.md**: Ensure your project has a clear README explaining what the app does.
- **Environment Variables**: Never commit real API keys. Use `.env.example` to document required keys. AI Studio handles this by default by excluding `.env` from exports.
- **License**: Choose an appropriate license (e.g., Apache-2.0 or MIT).

## Why use this Skill?
- **Portability**: Take your code outside of AI Studio.
- **Deployment**: Easily deploy to platforms like Vercel, Netlify, or Cloud Run.
- **Portfolio**: Show off your AI engineering skills to potential employers or clients.
