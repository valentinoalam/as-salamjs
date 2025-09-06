/* eslint-disable @typescript-eslint/no-unused-vars */
// components/Sprite.js
import React, { useState, useEffect } from 'react';
import styles from '../styles/Sprite.module.css';

const SPRITE_WIDTH = 32; // Width of a single sprite frame
const SPRITE_HEIGHT = 32; // Height of a single sprite frame
const SPRITESHEET_COLS = 4; // Number of columns in your spritesheet grid
const SPRITESHEET_ROWS = 2; // Number of rows in your spritesheet grid (if applicable for vertical animations)

// You can define a mapping for your animations
const animations = {
  idle: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 0, col: 3 },
  ],
  walk: [
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
  ],
  // Add more animations as needed
};

const Sprite = ({ animationName = 'idle' as const, frameRate = 10 }) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const currentAnimation = animations[animationName] || animations.idle;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrameIndex(prevIndex =>
        (prevIndex + 1) % currentAnimation.length
      );
    }, 1000 / frameRate); // 1000ms / frameRate = delay per frame

    return () => clearInterval(interval); // Cleanup on unmount
  }, [animationName, frameRate, currentAnimation]);

  const { row, col } = currentAnimation[currentFrameIndex];

  // Calculate background-position
  const backgroundPositionX = -(col * SPRITE_WIDTH);
  const backgroundPositionY = -(row * SPRITE_HEIGHT);

  return (
    <div
      className={styles.spriteContainer}
      style={{
        width: SPRITE_WIDTH,
        height: SPRITE_HEIGHT,
        backgroundImage: 'url(/images/character_spritesheet.png)', // Path to your spritesheet
        backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
        // If your spritesheet has a fixed overall size and you want to scale the background for specific effects:
        // backgroundSize: `${SPRITE_WIDTH * SPRITESHEET_COLS}px ${SPRITE_HEIGHT * SPRITESHEET_ROWS}px`,
      }}
    />
  );
};

export default Sprite;