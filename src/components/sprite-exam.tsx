// components/CanvasSprite.js (Client Component)
import React, { useRef, useEffect } from 'react';

const SPRITE_WIDTH = 32;
const SPRITE_HEIGHT = 32;

const CanvasSprite = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const currentFrameRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);


  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const image = new Image();
    image.src = '/images/character_spritesheet.png'; // Load your spritesheet

    image.onload = () => {
      imageRef.current = image;
      drawSprite(); // Start drawing once image is loaded
    };

    const drawSprite = () => {
      if (!imageRef.current || !ctx) return;

      // Clear the canvas for the next frame
      ctx.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);

      // Calculate source coordinates based on currentFrame (e.g., for a single row animation)
      const sourceX = (currentFrameRef.current % (image.width / SPRITE_WIDTH)) * SPRITE_WIDTH;
      const sourceY = Math.floor(currentFrameRef.current / (image.width / SPRITE_WIDTH)) * SPRITE_HEIGHT; // For multiple rows

      // Draw the sprite frame
      ctx.drawImage(
        imageRef.current,
        sourceX,
        sourceY,
        SPRITE_WIDTH,
        SPRITE_HEIGHT,
        0, // Destination X on canvas
        0, // Destination Y on canvas
        SPRITE_WIDTH,
        SPRITE_HEIGHT
      );

      currentFrameRef.current = (currentFrameRef.current + 1) % (image.width / SPRITE_WIDTH * (image.height / SPRITE_HEIGHT)); // Cycle through all frames
      animationFrameIdRef.current = requestAnimationFrame(drawSprite); // Loop
    };

    // Initial draw and animation loop
    animationFrameIdRef.current = requestAnimationFrame(drawSprite);

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current!); // Cleanup on unmount
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_WIDTH} // Set canvas size to match one sprite frame
      height={SPRITE_HEIGHT}
      style={{ border: '1px solid black', imageRendering: 'pixelated' }}
    />
  );
};

export default CanvasSprite;