/** @type {import('next-sitemap').IConfig} */
module.exports = {
  // Met ton vrai domaine ici une fois déployé
  siteUrl: process.env.SITE_URL || 'https://mangaswitcher.vercel.app', 
  generateRobotsTxt: true, // Génère le robots.txt pour Google
  generateIndexSitemap: false, // Utile si tu as moins de 5000 pages (plus simple pour Google)
}