'use client'

import React, { useEffect, useRef } from 'react'
import { Mail, Send } from 'lucide-react'
import { gsap } from "gsap"
import { Input } from './ui/input'
import { Button } from './ui/button'

const EmailBox = () => {
    const boxRef = useRef<HTMLDivElement>(null)
    const iconRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
  
    useEffect(() => {
      if (boxRef.current && iconRef.current && inputRef.current && buttonRef.current) {
        gsap.set(boxRef.current, { width: "0.5rem", borderRadius: "100%" })
        gsap.set([iconRef.current, inputRef.current, buttonRef.current], { opacity: 0, y: 20 })
  
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: boxRef.current,
            start: "top bottom",
            end: "bottom top",
            toggleActions: "play none none reverse",
          },
        })
  
        tl.to(boxRef.current, {
          width: "100%",
          borderRadius: "999px",
          duration: 1,
          ease: "power3.out",
          // repeat: -1,
          // yoyo: true,
        })
          .to(iconRef.current, { opacity: 1, y: 0, duration: 0.5 }, "-=0.5")
          .to(inputRef.current, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3")
          .to(buttonRef.current, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3")
      }
    }, [])
  
    return (
      <div ref={boxRef} className="w-full">
        <div className='inline-flex items-center mb-3' ref={iconRef}>
          <Mail size={30} className="text-gray-400 mr-2" />
          <h3 className="font-medium text-gray-700">Ikuti Perkembangan Kami</h3> 
          
        </div>
        <div className="flex">
          <Input ref={inputRef}
            type="email" 
            placeholder="Your email address" 
            className="rounded-r-none focus:ring-green-500"
          />
          <Button ref={buttonRef} className="bg-green-600 hover:bg-green-700 rounded-l-none">
            Subscribe <Send  className="text-green-600 h-6 w-6"/>
          </Button>
        </div>
      </div>
    )
  }

export default EmailBox
