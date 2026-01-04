import { useTranslations } from 'next-intl';
import SearchAnime from "../components/SearchAnime";
import TrendingAnimes from "../components/TrendingAnimes";
import Logo from "@/components/Logo";

export default function Home() {
  const t = useTranslations('home');

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center space-y-8">

      <div className="flex items-center gap-3 animate-fade-in-down">
        <div className=" p-2 rounded-xl ">
          <Logo className="w-10 h-10" color="text-primary" />
        </div>

        <span className="text-xl font-bold text-text-main tracking-tight">
          MangaSwitcher
        </span>
      </div>

      <div className="space-y-4 max-w-2xl lg:max-w-3xl xl:max-w-4xl">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-text-main">
          {t('title')} <br />
          <span className="text-primary">{t('titleHighlight')}</span>
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl text-text-secondary">
          {t('subtitle')}
        </p>
      </div>

      <SearchAnime />

      <TrendingAnimes />



    </div>
  );
}