import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import heic2any from "heic2any";
import { 
  Upload, 
  Sparkles, 
  Download, 
  RefreshCw, 
  ChevronRight, 
  Image as ImageIcon,
  CheckCircle2,
  Github,
  Palette,
  Wind
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const RUNTIME_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i += 1) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

type SkillPreset = {
  id: string;
  category: string;
  label: string;
  style_prompt: string;
  negative_constraints: string[];
};

type SkillPresetPayload = {
  version: string;
  presets: SkillPreset[];
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "全部风格 | All Styles",
  professional: "职业照 | Professional",
  resume: "简历照片 | Resume/CV",
  id: "证件照 | ID",
  casual: "休闲形象 | Casual",
};

const ASPECT_RATIOS = [
  { id: "9_16", label: "海报/故事 (9:16) | Story/Poster", width: 720, height: 1280, scale: 0.4, yOffset: 0.22 },
  { id: "4_5", label: "专业肖像 (4:5) | Professional", width: 1024, height: 1280, scale: 0.55, yOffset: 0.15 },
  { id: "1_1", label: "社交头像 (1:1) | Social Square", width: 1024, height: 1024, scale: 0.6, yOffset: 0.18 },
  { id: "2_2_visa", label: "美签标准 (2x2) | US Visa", width: 1024, height: 1024, scale: 0.65, yOffset: 0.12 },
];

const QUALITY_SETTINGS = [
  { id: "standard", label: "标准清晰度 | Standard", quality: 0.8 },
  { id: "hd", label: "高清增强 | HD Enhanced", quality: 0.95 },
  { id: "ultra", label: "超清打印 | Ultra Print", quality: 1.0 },
];

interface AnalysisResult {
  hairStyle: string;
  makeupTone: string;
  temperament: string;
}

interface VerificationGate {
  pass: boolean;
  identitySimilarity: number;
  compositionCompliance: number;
  realismScore: number;
  artifactRisk: number;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [presets, setPresets] = useState<SkillPreset[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [style, setStyle] = useState<string>("");
  const [selectedRatio, setSelectedRatio] = useState<string>("9_16");
  const [selectedQuality, setSelectedQuality] = useState<string>("hd");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationGate, setVerificationGate] = useState<VerificationGate | null>(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: "all", label: CATEGORY_LABELS.all },
    ...Array.from(new Set(presets.map((preset) => preset.category))).map((id) => ({
      id,
      label: CATEGORY_LABELS[id] || `${id} | ${id}`,
    })),
  ];

  const filteredStyles = category === "all"
    ? presets
    : presets.filter((preset) => preset.category === category);

  useEffect(() => {
    const loadSkillPresets = async () => {
      try {
        const res = await fetch("/skills/go-photo-studio/references/presets.json");
        if (!res.ok) {
          throw new Error("Failed to load skill presets.");
        }
        const payload = (await res.json()) as SkillPresetPayload;
        setPresets(payload.presets || []);
        if ((payload.presets || []).length > 0) {
          setStyle(payload.presets[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load style presets from skill assets.");
      }
    };

    loadSkillPresets();
  }, []);

  // Reset style if it's no longer in the filtered list
  useEffect(() => {
    if (filteredStyles.length > 0 && !filteredStyles.find((s) => s.id === style)) {
      setStyle(filteredStyles[0]?.id || "");
    }
  }, [category, filteredStyles, style]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    setError(null);

    try {
      let processedFile = file;

      // Check if it's a HEIC file
      if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8
        });
        
        // heic2any can return an array if multiple images are in the HEIC
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        processedFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: "image/jpeg" });
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResultImage(null);
        setAnalysis(null);
        setVerificationGate(null);
        setIsGenerating(false);
      };
      reader.readAsDataURL(processedFile);
    } catch (err) {
      console.error("HEIC conversion error:", err);
      setError("Failed to process image. Please try a standard JPG or PNG.");
      setIsGenerating(false);
    }
  };

  const generateHeadshot = async () => {
    if (!image || !style || presets.length === 0) return;

    setIsGenerating(true);
    setError(null);
    setVerificationGate(null);

    try {
      // --- Pre-processing: Smart Canvas Expansion ---
      const processImageForComposition = async (src: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(src);
              return;
            }

            const ratioConfig = ASPECT_RATIOS.find(r => r.id === selectedRatio) || ASPECT_RATIOS[0];
            const qualityConfig = QUALITY_SETTINGS.find(q => q.id === selectedQuality) || QUALITY_SETTINGS[0];

            // Target dimensions based on selected ratio
            const targetWidth = ratioConfig.width;
            const targetHeight = ratioConfig.height;
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Fill background with a neutral light grey
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // Calculate scaling based on ratio config
            const scaleFactor = ratioConfig.scale; 
            const drawWidth = targetWidth * scaleFactor;
            const drawHeight = (img.height / img.width) * drawWidth;

            // Position based on ratio config
            const x = (targetWidth - drawWidth) / 2;
            const y = targetHeight * ratioConfig.yOffset;

            ctx.drawImage(img, x, y, drawWidth, drawHeight);
            resolve(canvas.toDataURL('image/jpeg', qualityConfig.quality));
          };
          img.onerror = () => resolve(src);
          img.src = src;
        });
      };

      const processedImage = await processImageForComposition(image);
      const base64Data = processedImage.split(",")[1];
      const mimeType = "image/jpeg";

      const selectedStyle = presets.find((preset) => preset.id === style);
      const finalAestheticPrompt = selectedStyle?.style_prompt || "";
      const presetNegativeBlock = (selectedStyle?.negative_constraints || [])
        .map((item) => `- ${item}`)
        .join("\n");

      const buildGenerationPrompt = (extraNegative: string[] = []) => {
        const extraNegativeBlock = extraNegative.length > 0
          ? `\nRETRY NEGATIVE CONSTRAINTS:\n${extraNegative.map((item) => `- ${item}`).join("\n")}`
          : "";
        return `You are an advanced AI Portrait Engine. Your primary goal is to perform a style transformation while strictly preserving the user's facial identity.
        
        CRITICAL IDENTITY LOCK:
        - The person in the output MUST be the exact same individual as in the input image.
        - Maintain 100% fidelity to the original facial structure, bone structure, eye shape, nose shape, lip shape, age, and ethnicity.
        - The face is an immutable reference; only the styling around the face may change.
        
        COMPOSITION & ANATOMICAL COMPLETION:
        - The input image is a centered facial reference placed on an expanded canvas.
        - Your primary task is 'Out-painting': seamlessly generate the missing neck, shoulders, and upper torso to fill the empty space.
        - The head is already positioned at the correct professional scale; do not enlarge it.
        - Infer realistic shoulder width and posture that matches the head's orientation.
        - The final result must be a complete head-and-shoulders portrait with professional breathing room.
        
        SOURCE NORMALIZATION:
        - Treat the input image as a raw identity reference only.
        - Neutralize any harsh color casts (e.g., red, pink, or blue light) to restore natural skin tones.
        - Correct smartphone lens distortions to restore natural facial proportions.
        
        PHOTOGRAPHIC AUTHENTICITY DNA:
        - Prioritize high-end portrait photography over synthetic AI rendering.
        - Preserve natural skin porosity, micro-textures, and subtle facial asymmetries.
        - Maintain realistic eye-light (catchlights) and natural depth of field.
        - Ensure the transition between the subject and background has realistic optical blur, not a digital cutout look.
        
        STYLE INSTRUCTIONS:
        - Target Aesthetic: ${finalAestheticPrompt}
        
        NEGATIVE CONSTRAINTS (STRICTLY FORBIDDEN):
        - No oversized head or extreme close-up framing.
        - No celebrity face replacement or face swapping.
        - No 'plastic' or 'waxy' skin smoothing.
        - No generic 'AI beauty' facial reconstruction.
        - No perfectly symmetrical features.
        - No over-sharpened digital eyes or unnaturally clean hairlines.
        - No glossy, airbrushed fashion-magazine skin textures.
        ${presetNegativeBlock ? `\nPRESET NEGATIVE CONSTRAINTS:\n${presetNegativeBlock}` : ""}${extraNegativeBlock}
        
        MODULAR PROMPT FORMULA:
        [Identity Lock] + [Composition & Out-painting] + [Normalization] + [Aesthetic DNA] + [Realism] + [Negative Constraints]`;
      };

      const callImageGeneration = async (extraNegative: string[] = []) => {
        if (RUNTIME_PROVIDER === "openai") {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is missing for AI_PROVIDER=openai.");
          }
          const prompt = buildGenerationPrompt(extraNegative);
          const imageBlob = base64ToBlob(base64Data, mimeType);
          const formData = new FormData();
          formData.append("model", "gpt-image-1");
          formData.append("image", imageBlob, "source.jpg");
          formData.append("prompt", prompt);
          formData.append("size", "1024x1024");

          const res = await fetch("https://api.openai.com/v1/images/edits", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData,
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`OpenAI image generation failed: ${res.status} ${res.statusText} - ${txt}`);
          }
          const data = await res.json();
          const imageOut = data?.data?.[0]?.b64_json as string | undefined;
          if (!imageOut) {
            throw new Error("OpenAI did not return image data.");
          }
          return { imageBase64: imageOut, text: "" };
        }

        if (RUNTIME_PROVIDER !== "gemini") {
          throw new Error(`AI_PROVIDER=${RUNTIME_PROVIDER} is not supported for frontend image generation. Use gemini or openai.`);
        }

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
              {
                text: buildGenerationPrompt(extraNegative),
              },
            ],
          },
        });

        if (response.candidates?.[0]?.finishReason === "SAFETY") {
          throw new Error("The image could not be generated due to safety filters. Please try a different style or a more standard photo.");
        }

        let imageOut: string | null = null;
        let textOut = "";
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData?.data) {
            imageOut = part.inlineData.data;
          } else if (part.text) {
            textOut += part.text;
          }
        }

        if (!imageOut) {
          throw new Error("No image was generated. This can sometimes happen with complex poses. Please try again or choose a different style.");
        }

        return { imageBase64: imageOut, text: textOut };
      };

      const verifyImageQuality = async (generatedImageBase64: string): Promise<VerificationGate | null> => {
        try {
          if (RUNTIME_PROVIDER === "openai") {
            if (!process.env.OPENAI_API_KEY) return null;
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "gpt-4.1-mini",
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: "Return strict JSON only." },
                  {
                    role: "user",
                    content: [
                      { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
                      { type: "image_url", image_url: { url: `data:image/png;base64,${generatedImageBase64}` } },
                      {
                        type: "text",
                        text: `Return strict JSON:
{
  "identity_similarity": number,
  "composition_compliance": number,
  "realism_score": number,
  "artifact_risk": number
}
All values in [0,1].`,
                      },
                    ],
                  },
                ],
                temperature: 0.1,
              }),
            });
            if (!res.ok) return null;
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            const text = Array.isArray(content) ? content.map((p: any) => p?.text || "").join("\n") : String(content || "");
            const match = text.match(/\{[\s\S]*\}/);
            if (!match) return null;
            const parsed = JSON.parse(match[0]);
            const gate: VerificationGate = {
              identitySimilarity: Number(parsed.identity_similarity ?? 0),
              compositionCompliance: Number(parsed.composition_compliance ?? 0),
              realismScore: Number(parsed.realism_score ?? 0),
              artifactRisk: Number(parsed.artifact_risk ?? 1),
              pass: false,
            };
            gate.pass = gate.identitySimilarity >= 0.82
              && gate.compositionCompliance >= 0.75
              && gate.realismScore >= 0.72
              && gate.artifactRisk <= 0.35;
            return gate;
          }

          if (RUNTIME_PROVIDER !== "gemini") return null;

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { inlineData: { data: generatedImageBase64, mimeType: "image/png" } },
                {
                  text: `You receive two images in order: (1) source portrait, (2) generated portrait.
Return strict JSON only:
{
  "identity_similarity": number,
  "composition_compliance": number,
  "realism_score": number,
  "artifact_risk": number
}
All values must be in [0,1].`,
                },
              ],
            },
          });

          const verifyText = (response.candidates?.[0]?.content?.parts || [])
            .map((part) => part.text || "")
            .join("\n");
          const match = verifyText.match(/\{[\s\S]*\}/);
          if (!match) return null;

          const parsed = JSON.parse(match[0]);
          const gate: VerificationGate = {
            identitySimilarity: Number(parsed.identity_similarity ?? 0),
            compositionCompliance: Number(parsed.composition_compliance ?? 0),
            realismScore: Number(parsed.realism_score ?? 0),
            artifactRisk: Number(parsed.artifact_risk ?? 1),
            pass: false,
          };
          gate.pass = gate.identitySimilarity >= 0.82
            && gate.compositionCompliance >= 0.75
            && gate.realismScore >= 0.72
            && gate.artifactRisk <= 0.35;
          return gate;
        } catch (verifyErr) {
          console.warn("Verification gate unavailable:", verifyErr);
          return null;
        }
      };

      let generation = await callImageGeneration();
      let gate = await verifyImageQuality(generation.imageBase64);

      if (gate && !gate.pass) {
        generation = await callImageGeneration([
          "no facial feature reshaping",
          "no skin over-smoothing",
          "no eye enlargement",
        ]);
        const secondGate = await verifyImageQuality(generation.imageBase64);
        if (secondGate) {
          gate = secondGate;
        }
      }

      setResultImage(`data:image/png;base64,${generation.imageBase64}`);
      setVerificationGate(gate);
      const foundText = generation.text;

      // Try to parse analysis from text
      try {
        const jsonMatch = foundText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setAnalysis({
            hairStyle: parsed.hairStyle || "Professional Styling",
            makeupTone: parsed.makeupTone || "Natural Palette",
            temperament: parsed.temperament || "Confident & Professional"
          });
        } else {
          // Fallback analysis based on style
          setAnalysis({
            hairStyle: "Polished Professional",
            makeupTone: "Studio Balanced",
            temperament: selectedStyle?.label || "Professional"
          });
        }
      } catch (e) {
        console.warn("Failed to parse analysis JSON", e);
      }

    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate headshot. Please ensure your image is clear and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (format: 'png' | 'svg' = 'png') => {
    if (!resultImage) return;
    
    if (format === 'svg') {
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
          <image href="${resultImage}" width="800" height="1000" />
        </svg>
      `;
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lumina-headshot-${style}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const link = document.createElement("a");
      link.href = resultImage;
      link.download = `lumina-headshot-${style}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-comic-white comic-halftone text-comic-black font-sans selection:bg-comic-yellow/30">
      {/* Navigation */}
      <nav className="border-b-4 border-comic-black bg-comic-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-comic-red border-2 border-comic-black rounded-none flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="comic-text text-xl tracking-tighter leading-none">
              GO Photo Studio<br/>
              <span className="text-xs opacity-60">Professional AI Headshot & ID Photo</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden sm:flex gap-2 comic-pop" 
              nativeButton={false}
              render={
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" />
              }
            >
              <Github className="w-4 h-4" />
              <span>Repo</span>
            </Button>
            <Badge className="bg-comic-yellow text-comic-black border-2 border-comic-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">POW!</Badge>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20 relative">
        {/* Speed Lines Background Decoration */}
        <div className="absolute inset-0 comic-speed-lines opacity-10 pointer-events-none" />

        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block bg-comic-yellow border-4 border-comic-black px-8 py-4 mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -rotate-1"
          >
            <h1 className="comic-text text-3xl md:text-5xl text-comic-black leading-tight">
              GO Photo Studio<br/>
              <span className="text-xl md:text-2xl opacity-80">Professional AI Headshot & Identity Photo Generator</span>
            </h1>
          </motion.div>
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="comic-bubble max-w-lg mx-auto mt-4"
          >
            <p className="text-lg font-bold italic">
              "利用先进 AI 将您的生活自拍转换为影棚级职业头像。适用于 LinkedIn、简历和各类专业个人主页！" <br/>
              <span className="text-sm opacity-60">"Transform your casual selfies into studio-quality headshots using advanced AI. Perfect for LinkedIn, resumes, and professional profiles!"</span>
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start relative z-10">
          {/* Left Column: Upload & Config */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <Card className="comic-panel bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="comic-text text-xl">1. 上传照片 | Upload your photo</CardTitle>
                <CardDescription className="text-xs font-bold italic opacity-70 leading-tight">
                  清晰的正脸自拍效果最佳。 | A clear, front-facing selfie works best.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative aspect-[4/3] border-4 border-comic-black transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden
                    ${image ? 'bg-white' : 'bg-comic-blue/5 hover:bg-comic-blue/10'}
                  `}
                >
                  {image ? (
                    <>
                      <img src={image} alt="Original" className="w-full h-full object-contain bg-white" />
                      <div className="absolute inset-0 bg-comic-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="secondary" size="sm" className="gap-2 comic-pop bg-comic-white">
                          <RefreshCw className="w-4 h-4" />
                          更换照片 | Change Photo
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-16 h-16 bg-comic-yellow border-2 border-comic-black rounded-none flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Upload className="w-8 h-8 text-comic-black" />
                      </div>
                      <p className="comic-text text-sm mb-1">点击上传照片 | Click to upload</p>
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">PNG, JPG, HEIC (最大 10MB | Max 10MB)</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*, .heic, .heif" 
                    className="hidden" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="comic-panel bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="comic-text text-xl">2. 选择风格 | Choose your style</CardTitle>
                <CardDescription className="text-xs font-bold italic opacity-70 leading-tight">
                  选择适合您的头像场景。 | Select the environment for your headshot.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="category" className="comic-text text-sm">1. 选择分类 | Select Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`
                          px-3 py-1.5 text-xs font-black uppercase border-2 border-comic-black transition-all
                          ${category === cat.id 
                            ? 'bg-comic-yellow text-comic-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' 
                            : 'bg-white text-comic-black/40 hover:bg-comic-yellow/20'}
                        `}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style" className="comic-text text-sm">2. 背景风格 | Background Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger id="style" className="h-12 border-2 border-comic-black rounded-none w-full">
                      <SelectValue placeholder="选择风格 | Select a style" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-comic-black rounded-none w-full max-w-[calc(100vw-3rem)] md:max-w-[400px]">
                      {filteredStyles.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-bold">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative group pt-6">
                    <Button 
                      onClick={generateHeadshot} 
                      disabled={!image || !style || isGenerating}
                      className="w-full h-14 bg-comic-red text-white comic-pop text-lg font-black tracking-wider"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          生成中... | PROCESSING...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          立即生成 | GENERATE NOW
                        </>
                      )}
                    </Button>
                  <div className="absolute -top-4 -right-4 comic-burst px-3 py-1 text-xs comic-text z-20">
                    BOOM!
                  </div>
                </div>
                
                {error && (
                  <p className="text-sm text-comic-red text-center font-black uppercase mt-4">{error}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column: Result */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="sticky top-28"
          >
            <Card className="comic-panel bg-white min-h-[500px] flex flex-col">
              <CardHeader className="border-b-4 border-comic-black bg-comic-blue/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="comic-text text-xl">生成结果 | Result</CardTitle>
                    <CardDescription className="text-xs font-bold italic opacity-70 leading-tight">
                      您的 AI 职业头像 | Your professional AI headshot
                    </CardDescription>
                  </div>
                  {resultImage && (
                    <Badge className="bg-comic-green text-white border-2 border-comic-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex gap-1 items-center">
                      <CheckCircle2 className="w-3 h-3" />
                      就绪 | READY
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center p-0 bg-comic-black/5">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full p-8 space-y-4"
                    >
                      <Skeleton className={`w-full border-2 border-comic-black bg-white ${selectedRatio === '9_16' ? 'aspect-[9/16]' : 'aspect-[4/5]'}`} />
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-3/4 bg-white border border-comic-black" />
                        <Skeleton className="h-6 w-1/2 bg-white border border-comic-black" />
                      </div>
                    </motion.div>
                  ) : resultImage ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full relative group"
                    >
                      <img 
                        src={resultImage} 
                        alt="Generated Headshot" 
                        className={`w-full h-full object-cover border-b-4 border-comic-black ${selectedRatio === '9_16' ? 'aspect-[9/16]' : 'aspect-[4/5]'}`}
                      />
                      <div className="absolute inset-0 bg-comic-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center p-12"
                    >
                      <div className="w-24 h-24 bg-comic-white border-4 border-comic-black rounded-none flex items-center justify-center mx-auto mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <ImageIcon className="w-12 h-12 text-comic-black/20" />
                      </div>
                      <p className="comic-text text-comic-black/40">杰作等待诞生... | Your masterpiece awaits...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
              {resultImage && !isGenerating && (
                <CardFooter className="p-6 border-t-4 border-comic-black bg-comic-yellow/10 flex flex-col gap-4">
                  {analysis && (
                    <div className="w-full grid grid-cols-1 gap-3 mb-2">
                      <div className="flex items-start gap-3 p-2 bg-white border-2 border-comic-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="p-1.5 bg-comic-blue/10 border border-comic-black">
                          <Wind className="w-4 h-4 text-comic-blue" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase text-comic-black/40 leading-none mb-1">发型风格 | Hair Style</p>
                          <p className="text-xs font-bold leading-tight">{analysis.hairStyle}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-2 bg-white border-2 border-comic-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="p-1.5 bg-comic-red/10 border border-comic-black">
                          <Palette className="w-4 h-4 text-comic-red" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase text-comic-black/40 leading-none mb-1">妆容色调 | Makeup Tone</p>
                          <p className="text-xs font-bold leading-tight">{analysis.makeupTone}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-2 bg-white border-2 border-comic-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="p-1.5 bg-comic-yellow/20 border border-comic-black">
                          <Sparkles className="w-4 h-4 text-comic-yellow" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase text-comic-black/40 leading-none mb-1">气质风格 | Temperament</p>
                          <p className="text-xs font-bold leading-tight">{analysis.temperament}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {verificationGate && (
                    <div className="w-full p-3 bg-white border-2 border-comic-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[10px] font-black uppercase text-comic-black/50 mb-2">Quality Gate</p>
                      <p className="text-xs font-bold">
                        {verificationGate.pass ? "PASS" : "RETRY APPLIED / MANUAL CHECK RECOMMENDED"}
                      </p>
                      <p className="text-[10px] mt-1 font-bold opacity-70">
                        ID {verificationGate.identitySimilarity.toFixed(2)} · COMP {verificationGate.compositionCompliance.toFixed(2)} · REAL {verificationGate.realismScore.toFixed(2)} · ART {verificationGate.artifactRisk.toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  <div className="w-full flex flex-col gap-3">
                    <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                      <DialogTrigger 
                        nativeButton={false}
                        render={
                          <Button 
                            className="w-full h-12 bg-comic-blue text-white comic-pop text-base font-black"
                          />
                        }
                      >
                        <Download className="w-5 h-5 mr-2" />
                        下载照片 | DOWNLOAD
                      </DialogTrigger>
                      <DialogContent className="border-4 border-comic-black rounded-none bg-white max-w-md">
                        <DialogHeader>
                          <DialogTitle className="comic-text text-xl">导出设置 | Export Settings</DialogTitle>
                          <DialogDescription className="font-bold italic">
                            选择您想要的尺寸和质量。 | Choose your desired size and quality.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6 py-4">
                          <div className="space-y-2">
                            <Label className="comic-text text-sm">1. 导出比例 | Aspect Ratio</Label>
                            <Select value={selectedRatio} onValueChange={setSelectedRatio}>
                              <SelectTrigger className="h-12 border-2 border-comic-black rounded-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-2 border-comic-black rounded-none">
                                {ASPECT_RATIOS.map((r) => (
                                  <SelectItem key={r.id} value={r.id} className="font-bold">
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] font-bold text-comic-red uppercase">
                              * 更改比例建议重新生成以获得最佳构图。 | Changing ratio? Re-generate for best composition.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="comic-text text-sm">2. 输出质量 | Quality</Label>
                            <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                              <SelectTrigger className="h-12 border-2 border-comic-black rounded-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-2 border-comic-black rounded-none">
                                {QUALITY_SETTINGS.map((q) => (
                                  <SelectItem key={q.id} value={q.id} className="font-bold">
                                    {q.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row gap-3">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setIsDownloadDialogOpen(false);
                              generateHeadshot();
                            }}
                            className="flex-1 h-12 border-2 border-comic-black rounded-none font-black uppercase hover:bg-comic-yellow/20"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            应用并重新生成 | Apply & Re-gen
                          </Button>
                          <Button 
                            onClick={() => {
                              downloadImage('png');
                              setIsDownloadDialogOpen(false);
                            }}
                            className="flex-1 h-12 bg-comic-blue text-white rounded-none font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            立即下载 | Download Now
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button 
                      onClick={() => downloadImage('svg')}
                      variant="outline"
                      className="w-full h-12 border-2 border-comic-black bg-white comic-pop text-base font-black"
                    >
                      <ImageIcon className="w-5 h-5 mr-2" />
                      导出矢量图 | EXPORT AS SVG
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            {/* Tips Section */}
            <div className="mt-8 p-6 bg-comic-yellow border-4 border-comic-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h4 className="comic-text text-lg mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                专业建议 | PRO TIPS!
              </h4>
              <ul className="text-sm font-bold italic space-y-2">
                <li className="flex gap-2">
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  <span>使用面部光线良好的照片。 | Use a photo with good lighting on your face.</span>
                </li>
                <li className="flex gap-2">
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  <span>直视摄像头。 | Look directly at the camera.</span>
                </li>
                <li className="flex gap-2">
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  <span>避免杂乱的背景或照片中出现其他人。 | Avoid busy backgrounds or other people in the shot.</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-comic-black py-12 mt-20 bg-comic-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-comic-red" />
            <span className="comic-text text-lg tracking-tight">Lumina AI © 2026</span>
          </div>
          <div className="flex gap-8 comic-text text-sm">
            <a href="#" className="hover:text-comic-red transition-colors">隐私政策 | Privacy</a>
            <a href="#" className="hover:text-comic-red transition-colors">服务条款 | Terms</a>
            <a href="#" className="hover:text-comic-red transition-colors">联系我们 | Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
