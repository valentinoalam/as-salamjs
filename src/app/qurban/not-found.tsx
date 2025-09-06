"use client"
import { countHewanQurban } from '#@/lib/server/repositories/qurban.ts';
import { useState, useEffect } from 'react';

export default function NotFound() {
  const [farmData, setFarmData] = useState({ cows: 0, goats: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data fetching with error handling
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        const [cows, goats] = await Promise.all([
          countHewanQurban("sapi"),
          countHewanQurban("domba")
        ]);
        
        if (isMounted) {
          setFarmData({ cows, goats });
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError('Gagal memuat data hewan');
          console.error("Fetch error:", err);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    // const dataInterval = setInterval(fetchData, 8000);
    
    return () => {
      isMounted = false;
      // clearInterval(dataInterval);
    };
  }, []);

  // Animation effect
  // useEffect(() => {
  //   const animationInterval = setInterval(() => {
  //     setAnimationFrame(prev => (prev + 1) % 4);
  //   }, 500);
    
  //   return () => clearInterval(animationInterval);
  // }, []);
  
  // Fixed array creation using Array.from()
  const cowEmojis = Array.from({ length: farmData.cows }, (_, i) => 
    ['🐄', '🐄 ', ' 🐄', '🐄'][(i) % 4]
  );
  
  const goatEmojis = Array.from({ length: farmData.goats }, (_, i) => 
    ['🐐', '🐐 ', ' 🐐', '🐐'][(i) % 4]
  );
  
  // Calculate enclosure size with constraints
  const getEnclosureSize = (animalCount: number) => {
    const baseSize = 12;
    const extraSize = Math.ceil(animalCount / 5) * 2;
    return Math.min(baseSize + extraSize, 24); // Max size 24
  };
  
  const cowEnclosureSize = getEnclosureSize(farmData.cows);
  const goatEnclosureSize = getEnclosureSize(farmData.goats);
  
  // Animal enclosure component
  const AnimalEnclosure = ({ 
    title, 
    emojis, 
    animalCount,
    size,
    bgColor = "bg-green-100"
  }: {
    title: string;
    emojis: string[];
    animalCount: number;
    size: number;
    bgColor?: string;
  }) => (
    <div className="mb-8 w-max">
      <h2 className="text-xl font-semibold mb-2 text-center">{title}</h2>
      <div className={`${bgColor} p-2 rounded-lg border-4 border-amber-800 relative transition-all duration-500 mx-auto`}
          style={{
             minHeight: `${size * 8}px`,
             width: `${size * 16}px`,
             maxWidth: '90vw'
          }}>
        {/* Fence - Top */}
        <div className="absolute top-0 left-0 right-0 flex justify-center">
          {Array.from({ length: Math.ceil(size - 2) }, (_, idx) => (
            <span key={`top-${idx}`} className="text-amber-800">⌗</span>
          ))}
        </div>
        
        {/* Fence - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
          {Array.from({ length: Math.ceil(size - 2) }, (_, idx) => (
            <span key={`bottom-${idx}`} className="text-amber-800">⌗</span>
          ))}
        </div>
        
        {/* Fence - Sides */}
        <div className="absolute top-0 bottom-0 left-0 flex flex-col justify-between">
          {Array.from({ length: Math.floor(size/2) }, (_, idx) => (
            <span key={`left-${idx}`} className="text-amber-800">⌗</span>
          ))}
        </div>
        
        <div className="absolute top-0 bottom-0 right-0 flex flex-col justify-between">
          {Array.from({ length: Math.floor(size/2) }, (_, idx) => (
            <span key={`right-${idx}`} className="text-amber-800">⌗</span>
          ))}
        </div>
        
        {/* Content Area */}
        <div className="py-6 px-6 flex flex-col h-full">
          <div className="flex-grow flex flex-wrap gap-2 justify-center items-center min-h-[120px]">
            {isLoading ? (
              <div className="text-lg animate-pulse">Memuat hewan...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : emojis.length === 0 ? (
              <div className="text-gray-500 italic">Tidak ada hewan</div>
            ) : (
              emojis.map((emoji, index) => (
                <span 
                  key={`${title}-${index}`} 
                  className="text-2xl transform transition-transform hover:scale-110"
                >
                  {emoji}
                </span>
              ))
            )}
          </div>
          
          <div className="mt-auto">
            <p className="text-right font-bold">
              Total: {animalCount}
            </p>
            <p className="text-xs text-gray-500 text-right">
              Ukuran kandang: {size}x{size}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center pt-10 pb-2 px-4 bg-gray-100">
      <div className="w-full container bg-white rounded-lg shadow-md p-6">
        {/* 404 Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-600">404 - Tidak Ditemukan Transaksi</h1>
          <p className="mt-4 text-lg">Anda belum melakukan pemesanan.</p>
          <div className="mt-6 border-t pt-4">
            <p className="text-gray-600">
              Silakan Kembali ke halaman utama untuk melakukan pemesanan
            </p>
          </div>
        </div>

        {/* Farm Visualization */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2">🏡 Rumah qurban</h2>
          <p className="text-sm text-gray-500 mb-4">
            {isLoading 
              ? 'Memuat data...' 
              : error 
                ? 'Para hewan sedang di luar kandang' 
                : 'qurbanmu belum bergabung'}
          </p>
        </div>
        
        {/* Animal Enclosures */}
        <div className="justify-items-center block md:flex md:justify-around">
          <AnimalEnclosure 
            title="🐄 Kandang Sapi 🐄"
            emojis={cowEmojis}
            animalCount={farmData.cows}
            size={cowEnclosureSize}
            bgColor="bg-green-50"
          />
          
          <AnimalEnclosure 
            title="🐐 Kandang Kambing 🐐"
            emojis={goatEmojis}
            animalCount={farmData.goats}
            size={goatEnclosureSize}
            bgColor="bg-yellow-50"
          />
        </div>
      </div>
    </div>
  );
}