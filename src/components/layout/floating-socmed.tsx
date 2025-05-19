"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube, 
  MessageCircle, 
  Share2, 
  Mail
} from "lucide-react";
// Floating widget social links
const floatingSocialLinks = [
  { name: "Facebook", icon: <Facebook className="text-blue-600" />, url: "#" },
  { name: "Twitter", icon: <Twitter className="text-blue-400" />, url: "#" },
  { name: "Instagram", icon: <Instagram className="text-purple-500" />, url: "#" },
  { name: "YouTube", icon: <Youtube className="text-red-600" />, url: "#" },
  { name: "WhatsApp", icon: <MessageCircle className="text-green-500" />, url: "#" },
  { name: "Email", icon: <Mail className="text-gray-600" />, url: "#" }
];
const FloatingSocialMedia = () => {
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-bounce-slow">
      <div 
        className="bg-white rounded-full shadow-xl p-3 cursor-pointer relative"
        onMouseEnter={() => setShowFloatingMenu(true)}
        onMouseLeave={() => setShowFloatingMenu(false)}
      >
        <div className="relative">
          <Share2 className="text-green-600 h-6 w-6" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            6
          </span>
        </div>
        
        {/* Expanded Menu */}
        {showFloatingMenu && (
          <div className="absolute bottom-full right-0 mb-3">
            <Card className="bg-white rounded-lg shadow-lg p-2 w-48">
              {floatingSocialLinks.map((link, index) => (
                <a 
                  key={index} 
                  href={link.url} 
                  className="flex items-center py-2 px-3 hover:bg-gray-100 rounded"
                >
                  <span className="mr-2">{link.icon}</span>
                  <span>{link.name}</span>
                </a>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default FloatingSocialMedia