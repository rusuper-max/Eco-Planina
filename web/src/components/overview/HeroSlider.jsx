import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { useAuth } from '../../context';

// Supabase Storage URL for assets bucket
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// Try multiple naming conventions for slides
const getSlideUrls = (num) => [
  `${SUPABASE_URL}/storage/v1/object/public/assets/slides/Slide${num}.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/assets/slides/Slide${num}.png`,
  `${SUPABASE_URL}/storage/v1/object/public/assets/slides/slide${num}.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/assets/slider/slide${num}.jpg`,
];

const HeroSlider = ({ pendingCount = 0 }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const { user, companyName } = useAuth();

  // Try to load images with fallback URLs
  useEffect(() => {
    [1, 2, 3, 4].forEach(num => {
      const urls = getSlideUrls(num);
      const tryLoad = (index) => {
        if (index >= urls.length) return;
        const img = new Image();
        img.onload = () => setLoadedImages(prev => ({ ...prev, [num]: urls[index] }));
        img.onerror = () => tryLoad(index + 1);
        img.src = urls[index];
      };
      tryLoad(0);
    });
  }, []);

  const slides = [
    {
      id: 1,
      image: loadedImages[1],
      fallbackGradient: 'from-emerald-800 to-slate-900',
      title: `Dobrodošli, ${user?.name?.split(' ')[0] || 'Menadžeru'}!`,
      subtitle: pendingCount > 0
        ? `Trenutno imate ${pendingCount} novih zahteva za obradu.`
        : 'Svi zahtevi su obrađeni. Sistem funkcioniše optimalno.',
    },
    {
      id: 2,
      image: loadedImages[2],
      fallbackGradient: 'from-blue-800 to-slate-900',
      title: 'Efikasnost na delu',
      subtitle: 'Pratite rad vašeg tima u realnom vremenu.',
    },
    {
      id: 3,
      image: loadedImages[3],
      fallbackGradient: 'from-green-800 to-slate-900',
      title: 'Čuvamo prirodu zajedno',
      subtitle: 'Hvala što pomažete da naše planine ostanu čiste i zelene.',
    },
    {
      id: 4,
      image: loadedImages[4],
      fallbackGradient: 'from-teal-800 to-slate-900',
      title: 'Vaš tim, vaša snaga',
      subtitle: 'Zajedno gradimo održivu budućnost.',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative h-[280px] w-full shrink-0 overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Background Image with Fallback Gradient */}
          <div
            className={`absolute inset-0 bg-cover bg-center bg-gradient-to-r ${slide.fallbackGradient}`}
            style={slide.image ? {
              backgroundImage: `url(${slide.image})`,
            } : undefined}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-900/40" />

          {/* Content */}
          <div className="absolute inset-0 flex items-center px-6 lg:px-10 text-white">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider mb-3 border border-white/30">
                <Building2 size={12} /> {companyName || 'Eco-Planina'}
              </span>
              <h1 className="text-3xl lg:text-4xl font-bold mb-2 leading-tight">
                {slide.title}
              </h1>
              <p className="text-base text-slate-100 opacity-90 max-w-lg">
                {slide.subtitle}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Slider Indicators */}
      <div className="absolute bottom-4 left-6 lg:left-10 flex gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentSlide
                ? 'w-8 bg-white'
                : 'w-2 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
