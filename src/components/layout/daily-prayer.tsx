"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Clock, Loader2 } from "lucide-react"
import { IconShubuh, IconSuruq, IconDhuha, IconDhuhur, IconAshar, IconMagrib, IconIsya } from "@/components/layout/icons/pray-time-icons"
import { CityAutocomplete } from "@/components/layout/city-autocomplete"
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from "../ui/button"
import { cn } from "@/lib/utils"
import AnalogClock from "./clock"

interface PrayerTime {
  title: string
  time: string
  passedPray: boolean
  currentPray: boolean
  nextPray: number
  icon: React.ComponentType
}

interface CityOption {
  value: string
  label: string
}

interface PrayerCache {
  jadwal: Record<string, string>;
  lokasi: string;
  daerah: string;
  expiration: number;
}

const getPrayerIcon = (prayerName: string): React.ComponentType => {
  const icons: Record<string, React.ComponentType> = {
    subuh: IconShubuh,
    terbit: IconSuruq,
    dhuha: IconDhuha,
    dzuhur: IconDhuhur,
    ashar: IconAshar,
    maghrib: IconMagrib,
    isya: IconIsya,
  };
  return icons[prayerName.toLowerCase()] || IconShubuh;
};

export default function DailyPrayer() {
  const [open, setOpen] = useState(false);
  const [waktu, setWaktu] = useState<PrayerTime[]>([])
  const [idKota, setIdKota] = useState("1221")
  const [namaKota, setNamaKota] = useState("")
  const [namaPropinsi, setNamaPropinsi] = useState("")
  const [pilihanKota, setPilihanKota] = useState<CityOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const urlKota = 'https://api.myquran.com/v2/sholat/kota/semua';
  const [currentTime, setCurrentTime] = useState("");

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);
  const fetchDailyTimes = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentDate = new Date();
      const tahun = currentDate.getFullYear();
      const bulan = currentDate.getMonth() + 1;
      const tanggal = currentDate.getDate();
      
      const cacheKey = `prayerTimes-${idKota}-${tahun}-${bulan}-${tanggal}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        const parsedCache: PrayerCache = JSON.parse(cachedData);
        if (Date.now() < parsedCache.expiration) {
          updatePrayerStates(parsedCache);
          return;
        }
        localStorage.removeItem(cacheKey);
      }

      const response = await fetch(
        `https://api.myquran.com/v2/sholat/jadwal/${idKota}/${tahun}/${bulan}/${tanggal}`
      );
      const { data } = await response.json();

      const expirationDate = new Date(tahun, bulan - 1, tanggal + 1);
      const cacheData: PrayerCache = {
        jadwal: data.jadwal,
        lokasi: data.lokasi,
        daerah: data.daerah,
        expiration: expirationDate.getTime()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      updatePrayerStates(cacheData);
    } catch (error) {
      console.error("Error fetching prayer times:", error);
    } finally {
      setIsLoading(false);
    }
  }, [idKota]);

  const fetchKota = useCallback(async () => {
    try {
      const cacheKey = 'cities-list';
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        setPilihanKota(JSON.parse(cachedData));
        return;
      }

      const response = await fetch(urlKota);
      const data = await response.json();

      if (data.status) {
        const cities = data.data.map((item: { id: string; lokasi: string }) => ({
          value: item.id,
          label: item.lokasi
        }));
        localStorage.setItem(cacheKey, JSON.stringify(cities));
        setPilihanKota(cities);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  }, []);

  const updatePrayerStates = (data: PrayerCache) => {
    const { jadwal, lokasi, daerah } = data;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayerOrder = [
      'subuh', 'terbit', 'dhuha', 'dzuhur', 
      'ashar', 'maghrib', 'isya'
    ] as const;

    const passedPray = prayerOrder.reduce<string[]>((acc, prayerName) => {
      const [hours, minutes] = jadwal[prayerName].split(':').map(Number);
      const prayerMinutes = hours * 60 + minutes;
      const passedTime = prayerMinutes <= currentMinutes ? [...acc, jadwal[prayerName]] : acc;
      return passedTime
      .filter(time => time !== jadwal.isya)
    }, []);

    const currentPray = passedPray.pop();
    const nextPray = prayerOrder.indexOf(currentPray as typeof prayerOrder[number]);
    console.log(passedPray)
    setWaktu(prayerOrder.map(prayerName => ({
      title: `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} `,
      time: jadwal[prayerName],
      passedPray: passedPray.includes(jadwal[prayerName]),
      currentPray: jadwal[prayerName] === currentPray,
      nextPray: nextPray,
      icon: getPrayerIcon(prayerName),
    })));

    setNamaKota(lokasi);
    setNamaPropinsi(daerah);
  };

  useEffect(() => {
    fetchDailyTimes();
  }, [fetchDailyTimes]);

  useEffect(() => {
    fetchKota();
  }, [fetchKota]);
  
  // Get next prayer for drawer trigger display
  const getNextPrayer = () => {
    if (waktu.length === 0) return { title: "Loading...", time: "" };
    
    for (let i = 0; i < waktu.length; i++) {
      if (!waktu[i].passedPray) {
        return { title: waktu[i].title.replace(': ', ''), time: waktu[i].time };
      }
    }
    
    // If all prayers passed, return first prayer of tomorrow
    return { title: waktu[0].title.replace(': ', ''), time: "Tomorrow" };
  };

  const nextPrayer = getNextPrayer();

  return (
    <div className="absolute z-20 gap-2 left-0 right-10 top-5 w-full max-w-md mx-auto">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline"  className="w-max max-w-full px-3 sm:px-4 pt-1 mx-auto sm:w-max bg-white/30 backdrop-blur-sm rounded-lg shadow-sm py-6 flex items-center justify-between">
            <div className="flex text-right justify-between">
              <span className="items-center mr-2 font-bold">{nextPrayer.title} </span> {nextPrayer.time}
                <div className="text-sm flex text-muted-foreground">
                <Clock className="ml-2 h-5 w-5" />
                  
                </div>
            </div>
          </Button>
        </DrawerTrigger>
        <DrawerOverlay className="bg-green-600/40" />
        <DrawerContent className="px-3 sm:px-4 pt-1 mx-auto sm:w-max bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
          <DrawerHeader className="text-center border-b pb-4">
            <div className="flex md:flex-row md:items-center md:justify-between gap-1 sm:gap-2 py-1 sm:py-2">
            <div className="flex-1">
              <CityAutocomplete
                options={pilihanKota}
                value={idKota}
                onValueChange={setIdKota}
                placeholder="Pilih kota..."
                emptyMessage="Kota tidak ditemukan"
              />
            </div>
            <div className="inline-flex gap-1 sm:gap-2 items-center text-sm sm:text-base">
              <h1 className="font-medium">{namaKota},</h1>
              <h1 className="text-gray-600">{namaPropinsi}</h1>
            </div>
          </div>
          </DrawerHeader>


          {isLoading ? (
            <div className="flex justify-center items-center h-10 sm:h-12 border rounded-lg sm:rounded-xl border-zinc-200/50 px-2 my-1 sm:my-2 text-xs sm:text-sm">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
              <span className="ml-2">Loading prayer times...</span>
            </div>
          ) : (
            <ol className="flex flex-wrap justify-around px-1 sm:px-2 py-1 sm:py-2 gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1 my-1 sm:my-2 text-xs sm:text-sm">
              {waktu.map((item, index) => (
                <li
                  key={index}
                  className={cn(
                    "flex text-md items-center px-1 py-0.5",
                    item.passedPray ? "opacity-40 font-light" : "font-medium",
                    item.currentPray ? "text-red-500 text-lg border-b border-red-800 font-bold" : "text-gray-700",
                )}
                >
                  {item.icon && <item.icon />}
                  <span className="mr-1">{item.title}</span>
                  <span>{item.time}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="w-1/3 h-1/3">
            <AnalogClock />
          </div>

          <DrawerFooter className="pt-0 relative">
            {/* <p className="text-muted-foreground absolute ml-2 left-2.5"></p> */}
            <DrawerClose asChild>
              <Button className="text-muted-foreground font-oswald text-xl" variant="ghost">{currentTime}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

