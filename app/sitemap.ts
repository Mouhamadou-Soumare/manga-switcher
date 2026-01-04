import { MetadataRoute } from 'next';
import { getAllSeries } from '@/lib/manga-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://manga-switcher.vercel.app';
  const lastModified = new Date();

  // Page d'accueil
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  // Ajouter toutes les pages de séries dynamiques
  const allSeries = getAllSeries();

  for (const series of allSeries) {
    // Priorité SEO basée sur la priorité de la série et sa popularité
    let priority = 0.8;
    if (series.priority === 'P0') priority = 0.9;
    if (series.priority === 'P1') priority = 0.85;
    if (series.priority === 'P2') priority = 0.7;
    if (series.priority === 'P3') priority = 0.6;

    // Fréquence de mise à jour basée sur le statut
    let changeFrequency: 'weekly' | 'monthly' | 'yearly' = 'monthly';
    if (series.status === 'ongoing') changeFrequency = 'weekly';
    if (series.status === 'completed') changeFrequency = 'yearly';

    routes.push({
      url: `${baseUrl}/series/${series.series_id}`,
      lastModified: series.last_updated ? new Date(series.last_updated) : lastModified,
      changeFrequency,
      priority,
    });
  }

  return routes;
}
