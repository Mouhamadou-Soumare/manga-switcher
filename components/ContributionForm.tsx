"use client";

import { useState } from "react";
import { X, BookOpen, Tv, Loader2, Plus, PlusCircle } from "lucide-react";
import { addCheckpoint } from "@/app/actions";
import type { CheckpointType } from "@/lib/types";

interface Props {
  malId: number;
  animeTitle: string;
  animeImage: string;
  variant?: "hero" | "small"; 
}

export default function ContributionForm({ malId, animeTitle, animeImage, variant = "hero" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for checkpoint type system
  const [type, setType] = useState<CheckpointType>('SEASON');
  const [isCanon, setIsCanon] = useState(true);
  const [arcName, setArcName] = useState('');
  const [volume, setVolume] = useState('');

  const clientAction = async (formData: FormData) => {
    setIsSubmitting(true);
    formData.append("malId", malId.toString());
    formData.append("title", animeTitle);
    formData.append("image", animeImage);

    const result = await addCheckpoint(formData);
    
    setIsSubmitting(false);
    if (result.success) {
      setIsOpen(false);
    } else {
      alert("Erreur: " + result.message);
    }
  };

  return (
    <>
      {/* Affichage conditionnel du bouton */}
      {variant === "hero" ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Indiquer le chapitre</span>
        </button>
      ) : (
        /* Style "+ Manquant ?" de la maquette */
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1 text-primary font-bold text-xs uppercase tracking-wide hover:underline transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Manquant ?</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md lg:max-w-xl rounded-3xl p-6 lg:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>

            <form action={clientAction} className="space-y-5">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-gray-900">Nouveau point d'arrêt</h3>
                <p className="text-sm text-gray-500">{animeTitle}</p>
              </div>

              {/* Type selector */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Type de contenu</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    { value: 'SEASON', label: 'Saison', emoji: '📺' },
                    { value: 'MOVIE', label: 'Film', emoji: '🎬' },
                    { value: 'ARC', label: 'Arc', emoji: '📖' },
                    { value: 'SPECIAL', label: 'OVA/Spécial', emoji: '⭐' }
                  ].map(({ value, label, emoji }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value as CheckpointType)}
                      className={`p-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                        type === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <span className="mr-1.5">{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional: Season number (only for SEASON type) */}
              {type === 'SEASON' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Numéro de saison</label>
                  <input
                    name="season"
                    type="number"
                    min="1"
                    placeholder="Ex: 2"
                    className="w-full p-3 rounded-xl border-2 border-gray-200 text-center focus:border-primary outline-none"
                    required
                  />
                </div>
              )}

              {/* Conditional: Arc name (only for ARC type) */}
              {type === 'ARC' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Nom de l'arc</label>
                  <input
                    name="arcName"
                    type="text"
                    value={arcName}
                    onChange={(e) => setArcName(e.target.value)}
                    placeholder="Ex: Marineford, Wano..."
                    className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none"
                    required
                  />
                </div>
              )}

              {/* Episode number (always shown) */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Tv className="w-4 h-4 text-primary" />
                  Dernier épisode {type === 'MOVIE' && '(équivalent)'}
                </label>
                <input
                  name="episode"
                  type="number"
                  min="1"
                  placeholder={type === 'MOVIE' ? 'Ex: 45 (optionnel)' : 'Ex: 12'}
                  className="w-full p-3 rounded-xl border-2 border-gray-200 text-center focus:border-primary outline-none"
                />
              </div>

              {/* Conditional: Canon checkbox (for MOVIE and SPECIAL) */}
              {(type === 'MOVIE' || type === 'SPECIAL') && (
                <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border-2 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={isCanon}
                    onChange={(e) => setIsCanon(e.target.checked)}
                    className="w-5 h-5 accent-primary"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-sm text-amber-900 block">Contenu canon</span>
                    <p className="text-xs text-amber-700">
                      Fait partie de l'histoire principale du manga
                    </p>
                  </div>
                </label>
              )}

              {/* Chapitre (always shown) */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-primary flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Reprendre au Chapitre
                </label>
                <input
                  name="chapter"
                  type="number"
                  min="1"
                  placeholder="Ex: 138"
                  className="w-full p-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary font-bold text-xl text-center focus:border-primary outline-none"
                  required
                />
              </div>

              {/* Volume (always shown - NEW!) */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tome (optionnel)</label>
                <input
                  name="volume"
                  type="number"
                  min="1"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="Ex: 15"
                  className="w-full p-3 rounded-xl border-2 border-gray-200 text-center focus:border-primary outline-none"
                />
              </div>

              {/* Note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Note (Optionnel)</label>
                <textarea
                  name="note"
                  placeholder="Ex: Le film couvre ce chapitre..."
                  className="w-full p-3 rounded-xl border-2 border-gray-200 text-sm resize-none focus:border-primary outline-none"
                  rows={2}
                />
              </div>

              {/* Hidden inputs for type and isCanon */}
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="isCanon" value={isCanon.toString()} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl transition-all shadow-lg flex justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Valider et Publier"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}