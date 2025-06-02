import Image from "next/image"

import PemesananForm from "@/components/qurban/pemesanan/pemesanan-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getAllTipeHewan } from "@/services/qurban"

export default async function QurbanHome() {
  const tipeHewan = await getAllTipeHewan()
  console.log(tipeHewan)
  return (
    <>
      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/placeholder.svg?height=800&width=1200"
            alt="Ternak Qurban"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-green-400 mb-4 mt-20">Qurban Yuk</h1>
          <p className="text-xl md:text-2xl text-green-300 mb-8">Berqurban Sambil Bersedekah</p>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-colors"
          >
            <Link href="#menu" >
            Pesan Sekarang
            </Link>
          </Button>
        </div>
      </section>
      
      {/* Menu Section */}
      <section id="menu" className="py-20 bg-gray-900">
        <PemesananForm tipeHewan={tipeHewan} />
      </section>

      {/* Testimoni Section */}
      <section id="testimoni" className="py-20 text-white relative">
        <div className="absolute inset-0 z-0">
          <Image src="/placeholder.svg?height=500&width=1200" alt="Quran Background" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <figure className="max-w-4xl mx-auto">
            <blockquote className="text-lg md:text-xl font-medium mb-6 leading-relaxed">
              &quot;Dan bagi setiap umat telah Kami syariatkan penyembelihan (qurban), agar mereka menyebut nama Allah atas
              rezeki yang dikaruniakan Allah kepada mereka berupa hewan ternak. Maka Tuhanmu adalah Tuhan Yang Maha Esa,
              karena itu berserah dirilah kamu kepada-Nya.&quot;
            </blockquote>
            <figcaption className="text-white font-bold text-xl">(QS: Al-Hajj: 34)</figcaption>
          </figure>
        </div>
      </section>
    </>
  )
}
