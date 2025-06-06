import type { Metadata } from 'next'

interface MetadataConfig {
  [key: string]: Metadata
}

export const METADATA: MetadataConfig = {
  global: {
    title: {
      template: '%s | As-SalamJs',
      default: 'Masjid As-Salam Jakasampurna - Bekasi',
    },
    description: 'Masjid As-Salam Jakasampurna, a muslim place of worship located in Bekasi, Indonesia, offering daily prayers, Quranic education, community events, and social services. Join us for prayers, spiritual growth and community outreach.',
    keywords: ['Masjid As-Salam', 'Jakasampurna', 'Bekasi', 'mosque', 'Islam', 'prayer', 'community', 'Indonesia', 'Quran Classes', 'Muslim Community Indonesia', 'Mosque Events'],
    authors: [{ name: 'Masjid As-Salam Jakasampurna' }],
    creator: 'Masjid As-Salam Jakasampurna',
    publisher: 'Masjid As-Salam Jakasampurna',
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
    },
    openGraph: {
      title: 'Masjid As Salam Jakasampurna | Islamic Community Hub in Bekasi',
      description: 'Explore spiritual programs, daily prayers, and community services at Masjid As Salam Jakasampurna. Located in Bekasi, Indonesia.',
      url: 'https://as-salamjs.online',
      siteName: 'Masjid As-Salam Jakasampurna',
      images: [
        {
          url: 'https://as-salamjs.online/images/alquran.jpg',
          width: 1200,
          height: 630,
          alt: 'Masjid As-Salam Jakasampurna Building',
        },
      ],
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Masjid As-Salam Jakasampurna | Community & Worship',
      description: 'Join our vibrant Islamic community in Bekasi for prayers, education, and social initiatives.',
      images: ['https://as-salamjs.online/images/masjid-as-salam.jpg'],
      site: '@assalam_jakasampurna',
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_VERIFICATION || '',
    },
    alternates: {
      canonical: 'https://as-salamjs.online',
    },
    other: {
      'geo.region': 'ID-JB',
      'geo.placename': 'Bekasi',
      'msvalidate.01': process.env.BING_VERIFICATION || '',
    },
    formatDetection: {
      email: false,
      address: true,
      telephone: true,
    },
  },
  default: {
    title: 'Masjid As-Salam Jakasampurna',
    description: 'A welcoming mosque in Bekasi, Indonesia, offering prayer services, community events, and religious programs.',
    keywords: [
      'Itikaf',
      'Qurban',
      'Dakwah Online',
      'Mosque Bekasi',
      'Religious Activities',
      'Muslim Community',
      'Islamic Education'
    ],
    openGraph: {
      images: [
        {
          url: 'https://as-salamjs.online/images/mosque-interior.jpg',
          width: 800,
          height: 600,
          alt: 'Prayer Hall of Masjid As-Salam',
        },
      ],
    },
  },
  events: {
    title: 'Community Events | Masjid As-Salam',
    description: 'Join our upcoming community events and religious programs at Masjid As-Salam Jakasampurna.',
    keywords: ['Mosque Events', 'Community Programs', 'Islamic Lectures'],
  },
  education: {
    title: 'Islamic Education | Masjid As-Salam',
    description: 'Quranic classes and Islamic education programs for all age groups at our Bekasi mosque.',
  }
};