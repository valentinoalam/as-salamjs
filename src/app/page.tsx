import { 
  Card, 
  CardContent, 
  CardHeader, 
  // CardFooter 
} from "@/components/ui/card";
// import { 
//   Facebook, 
//   Instagram, 
//   Youtube, 
// } from "lucide-react";
import Logo from '@/components/layout/logo';
// import FloatingSocialMedia from "@/components/layout/floating-socmed";

// Other features array
// const otherFeatures = [
//   {
//     name: "Blog",
//     icon: <Facebook className="text-3xl mb-2" />,
//     bgColor: "bg-green-500",
//     text: "Like & Follow",
//     tooltip: "Facebook",
//     url: "#"
//   },
//   {
//     name: "Tausiah",
//     icon: <Youtube className="text-3xl mb-2" />,
//     bgColor: "bg-red-600",
//     text: "Subscribe",
//     tooltip: "Tausiyah",
//     url: "#"
//   },
//   {
//     name: "Instagram",
//     icon: <Instagram className="text-3xl mb-2" />,
//     bgColor: "bg-gradient-to-r from-purple-500 to-pink-500",
//     text: "Follow Us",
//     tooltip: "Instagram",
//     url: "#"
//   },
// ];

// Featured content links with background images
const featuredLinks = [
  {
    name: "Itikaf",
    description: "Registrasi dan Absensi Itikaf",
    backgroundImage: "/images/itikaf-bg.png",
    url: "/itikaf"
  },
  {
    name: "Qurban",
    description: "Informasi dan Pemesanan Qurban",
    backgroundImage: "/images/qurban-bg.png",
    url: "/qurban"
  }
];



export default function Home() {
  return (
    <main className="bg-gray-100 min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <CardHeader className="relative bg-green-600 p-6 text-center">
          <div className="absolute inset-0 h-full opacity-20  bg-cover bg-[url(/images/cover.jpg)]"></div>
          <Logo width={64} height={64} withName={false} />
          <h2 className="text-2xl font-bold text-black">Assalamualaikum Warahmatullah</h2>
          <p className="text-green-100 mt-1">Mari Eratkan Persaudaraan Dengan Keimanan di atas Keilmuan</p>
        </CardHeader>
        

        <CardContent className="p-6 space-y-5">
          {/* Featured Links (Itikaf and Qurban) */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            {featuredLinks.map((link, index) => (
              <a 
                key={index} 
                href={link.url}
                className="group relative overflow-hidden rounded-lg h-32"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-bottom transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundImage: `url(${link.backgroundImage})` }}
                />
                <div className="absolute inset-0 bg-black opacity-50 group-hover:opacity-30 transition-all duration-300 shadow-md hover:shadow-lg"></div>
                <div className="relative z-10 h-full flex flex-col justify-end p-4">
                  <h3 className="text-white font-bold text-lg">{link.name}</h3>
                  <p className="text-white text-sm opacity-90">{link.description}</p>
                </div>
              </a>
            ))}
          </div>
          
        </CardContent>
        
        {/* Newsletter Signup */}
        {/* <CardFooter className="bg-gray-50 p-6 border-t flex-col"> */}
          {/* Social Icons Grid */}
          {/* <div className="grid grid-cols-3 gap-4">
            {otherFeatures.map((link, index) => (
              <a 
                key={index} 
                href={link.url} 
                className="relative group"
                aria-label={link.name}
              >
                <div className={`${link.bgColor} text-white rounded-lg p-4 flex flex-col items-center justify-center h-24 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1`}>
                  {link.icon}
                  <span className="text-sm">{link.text}</span>
                </div>
                <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 mb-3 pointer-events-none">
                  {link.tooltip}
                </span>
              </a>
            ))}
          </div>
        </CardFooter> */}
      </Card>

      {/* Floating Widget */}
      {/* <FloatingSocialMedia /> */}
    </main>
  );
}