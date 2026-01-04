"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Loader2, Shield } from "lucide-react";
import { voteForCheckpoint } from "@/app/actions";
import { getVisitorFingerprint } from "@/lib/fingerprint";
import { useTranslations } from 'next-intl';

interface Props {
  checkpointId: string;
  initialUpvotes: number;
  initialDownvotes: number;
}

export default function VoteButtons({ checkpointId, initialUpvotes, initialDownvotes }: Props) {
  const t = useTranslations('votes');
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);

  // Générer fingerprint au montage du composant
  useEffect(() => {
    getVisitorFingerprint()
      .then(setFingerprint)
      .catch(err => {
        console.error('Failed to generate fingerprint:', err);
      });
  }, []);

  // Récupérer le vote existant depuis le serveur
  useEffect(() => {
    if (!fingerprint) return;

    fetch(`/api/votes/${checkpointId}?fingerprint=${fingerprint}`)
      .then(res => res.json())
      .then(data => {
        if (data.vote) setUserVote(data.vote);
      })
      .catch(err => {
        console.error('Failed to fetch existing vote:', err);
      });
  }, [checkpointId, fingerprint]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!fingerprint || isLoading || cooldownSeconds > 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    // Sauvegarder l'état actuel pour rollback si erreur
    const oldVote = userVote;
    const oldUpvotes = upvotes;
    const oldDownvotes = downvotes;

    // Calculer le nouvel état (Optimistic UI)
    let newUpvotes = upvotes;
    let newDownvotes = downvotes;
    let newVote: 'up' | 'down' | null = type;

    if (oldVote === null) {
      // Nouveau vote
      if (type === 'up') newUpvotes++;
      else newDownvotes++;
    } else if (oldVote === type) {
      // Annulation (même type cliqué)
      if (type === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
      else newDownvotes = Math.max(0, newDownvotes - 1);
      newVote = null;
    } else {
      // Changement de vote (up ↔ down)
      if (type === 'up') {
        newUpvotes++;
        newDownvotes = Math.max(0, newDownvotes - 1);
      } else {
        newDownvotes++;
        newUpvotes = Math.max(0, newUpvotes - 1);
      }
    }

    // Appliquer optimistic update
    setUpvotes(newUpvotes);
    setDownvotes(newDownvotes);
    setUserVote(newVote);

    // Appel serveur
    const result = await voteForCheckpoint(checkpointId, type, fingerprint);

    if (!result.success) {
      // Rollback en cas d'erreur
      setUpvotes(oldUpvotes);
      setDownvotes(oldDownvotes);
      setUserVote(oldVote);

      // Gérer les différents types d'erreurs
      if (result.errorCode === 'RATE_LIMIT_EXCEEDED') {
        setErrorMessage(t('rateLimit'));
      } else if (result.errorCode === 'COOLDOWN_ACTIVE') {
        setCooldownSeconds(3);
        setErrorMessage(t('cooldown'));
      } else if (result.errorCode === 'CAPTCHA_REQUIRED') {
        setShowCaptcha(true);
        setErrorMessage(t('captchaRequired'));
      } else {
        setErrorMessage(result.message || t('error'));
      }
    } else {
      // Succès - activer cooldown préventif
      setCooldownSeconds(3);
    }

    setIsLoading(false);
  };

  // Afficher loader pendant génération du fingerprint
  if (!fingerprint) {
    return (
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        <span className="text-xs text-gray-400">{t('loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* BOUTON UPVOTE */}
        <button
          onClick={() => handleVote('up')}
          disabled={isLoading || cooldownSeconds > 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
            userVote === 'up'
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading && userVote === 'up' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ThumbsUp className={`w-4 h-4 ${userVote === 'up' ? 'fill-current' : ''}`} />
          )}
          <span>{upvotes}</span>
        </button>

        {/* BOUTON DOWNVOTE */}
        <button
          onClick={() => handleVote('down')}
          disabled={isLoading || cooldownSeconds > 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
            userVote === 'down'
              ? 'bg-red-100 text-red-700 border-2 border-red-300'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading && userVote === 'down' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ThumbsDown className={`w-4 h-4 ${userVote === 'down' ? 'fill-current' : ''}`} />
          )}
          <span>{downvotes}</span>
        </button>

        {/* Indicateur de cooldown */}
        {cooldownSeconds > 0 && (
          <span className="text-xs text-gray-400">
            {cooldownSeconds}s
          </span>
        )}
      </div>

      {/* Message d'erreur */}
      {errorMessage && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          {errorMessage}
        </p>
      )}

      {/* CAPTCHA modal (placeholder - intégrer hCaptcha ou reCAPTCHA) */}
      {showCaptcha && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800 mb-2">{t('captchaTitle')}</p>
          <p className="text-xs text-amber-600">
            {t('captchaDescription')}
          </p>
        </div>
      )}
    </div>
  );
}
