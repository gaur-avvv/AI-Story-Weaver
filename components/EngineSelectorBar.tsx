import React, { useState, useEffect } from 'react';
import { 
  BookText, 
  Paintbrush, 
  Volume2, 
  ChevronDown, 
  Sparkles, 
  Cpu, 
  Settings2,
  Check
} from 'lucide-react';
import { 
  ModelRegistryService, 
  RegisteredModel, 
  CapabilityType 
} from '../services/modelRegistry';

interface EngineSelectorBarProps {
  onOpenCustomModal?: () => void;
  onEngineChange?: (type: 'text' | 'vision' | 'audio', model: RegisteredModel) => void;
  className?: string;
}

export const EngineSelectorBar: React.FC<EngineSelectorBarProps> = ({
  onEngineChange,
  className = '',
}) => {
  const [activeTextId, setActiveTextId] = useState<string>('gemini:gemini-2.5-flash');
  const [activeVisionId, setActiveVisionId] = useState<string>('gemini:gemini-2.5-flash-image');
  const [activeAudioId, setActiveAudioId] = useState<string>('gemini:gemini-tts-puck');

  const [textModels, setTextModels] = useState<RegisteredModel[]>([]);
  const [visionModels, setVisionModels] = useState<RegisteredModel[]>([]);
  const [audioModels, setAudioModels] = useState<RegisteredModel[]>([]);

  // Refresh available models and active selections
  const syncRegistry = () => {
    setTextModels(ModelRegistryService.getModelsByCapability('text'));
    setVisionModels(ModelRegistryService.getModelsByCapability('image'));
    setAudioModels(ModelRegistryService.getModelsByCapability('audio'));

    setActiveTextId(ModelRegistryService.getActiveEngine('text'));
    setActiveVisionId(ModelRegistryService.getActiveEngine('image'));
    setActiveAudioId(ModelRegistryService.getActiveEngine('audio'));
  };

  useEffect(() => {
    syncRegistry();
    const unsubscribe = ModelRegistryService.subscribe(() => {
      syncRegistry();
    });
    return () => unsubscribe();
  }, []);

  const handleSelect = (capability: 'text' | 'vision' | 'audio', modelId: string) => {
    if (capability === 'text') {
      setActiveTextId(modelId);
      ModelRegistryService.setActiveEngine('text', modelId);
    } else if (capability === 'vision') {
      setActiveVisionId(modelId);
      ModelRegistryService.setActiveEngine('image', modelId);
    } else {
      setActiveAudioId(modelId);
      ModelRegistryService.setActiveEngine('audio', modelId);
    }

    const model = ModelRegistryService.getModelById(modelId);
    if (model && onEngineChange) {
      onEngineChange(capability, model);
    }
  };

  const activeTextModel = textModels.find((m) => m.id === activeTextId) || textModels[0];
  const activeVisionModel = visionModels.find((m) => m.id === activeVisionId) || visionModels[0];
  const activeAudioModel = audioModels.find((m) => m.id === activeAudioId) || audioModels[0];

  return (
    <div className={`flex flex-wrap items-center gap-2 py-1.5 px-2 bg-slate-950/70 border border-white/10 rounded-2xl backdrop-blur-md shadow-md no-print ${className}`}>
      {/* 1. TEXT ENGINE SELECTOR */}
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1 relative group hover:border-purple-500/40 transition-colors">
        <BookText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-purple-300/80 leading-none">
            Text Engine
          </span>
          <div className="relative flex items-center">
            <select
              value={activeTextId}
              onChange={(e) => handleSelect('text', e.target.value)}
              className="appearance-none bg-transparent text-xs font-bold text-white pr-4 py-0.5 cursor-pointer focus:outline-none max-w-[130px] sm:max-w-[160px] truncate"
              title={`Active Text Engine: ${activeTextModel?.name || 'Default'}`}
            >
              <optgroup label="Built-in Flagship Models">
                {textModels.filter(m => !m.isCustom).map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                    {m.name} ({m.provider})
                  </option>
                ))}
              </optgroup>
              {textModels.some(m => m.isCustom) && (
                <optgroup label="Custom Endpoints">
                  {textModels.filter(m => m.isCustom).map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-purple-300">
                      ★ {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
          </div>
        </div>
      </div>

      {/* 2. VISION ENGINE SELECTOR */}
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1 relative group hover:border-cyan-500/40 transition-colors">
        <Paintbrush className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-cyan-300/80 leading-none">
            Vision Engine
          </span>
          <div className="relative flex items-center">
            <select
              value={activeVisionId}
              onChange={(e) => handleSelect('vision', e.target.value)}
              className="appearance-none bg-transparent text-xs font-bold text-white pr-4 py-0.5 cursor-pointer focus:outline-none max-w-[130px] sm:max-w-[160px] truncate"
              title={`Active Vision Engine: ${activeVisionModel?.name || 'Default'}`}
            >
              <optgroup label="Built-in Vision Models">
                {visionModels.filter(m => !m.isCustom).map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                    {m.name} ({m.provider})
                  </option>
                ))}
              </optgroup>
              {visionModels.some(m => m.isCustom) && (
                <optgroup label="Custom Endpoints">
                  {visionModels.filter(m => m.isCustom).map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-cyan-300">
                      ★ {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
          </div>
        </div>
      </div>

      {/* 3. AUDIO ENGINE SELECTOR */}
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1 relative group hover:border-emerald-500/40 transition-colors">
        <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-emerald-300/80 leading-none">
            Audio Engine
          </span>
          <div className="relative flex items-center">
            <select
              value={activeAudioId}
              onChange={(e) => handleSelect('audio', e.target.value)}
              className="appearance-none bg-transparent text-xs font-bold text-white pr-4 py-0.5 cursor-pointer focus:outline-none max-w-[130px] sm:max-w-[160px] truncate"
              title={`Active Audio Engine: ${activeAudioModel?.name || 'Default'}`}
            >
              <optgroup label="Built-in Voice Models">
                {audioModels.filter(m => !m.isCustom).map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                    {m.name} ({m.provider})
                  </option>
                ))}
              </optgroup>
              {audioModels.some(m => m.isCustom) && (
                <optgroup label="Custom Endpoints">
                  {audioModels.filter(m => m.isCustom).map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-emerald-300">
                      ★ {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
          </div>
        </div>
      </div>
    </div>
  );
};

