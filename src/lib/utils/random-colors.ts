/* eslint-disable prefer-const */
/**
 * Generates a random vibrant color in hexadecimal format.
 * The color will have high saturation and a mid-range lightness to ensure vibrancy.
 *
 * @returns {string} A hexadecimal color string (e.g., "#RRGGBB").
 */
function getRandomVibrantColor() {
  // 1. Generate a random hue (0-360 degrees)
  const hue = Math.floor(Math.random() * 361); // 0 to 360

  // 2. Set saturation to a high value for vibrancy (e.g., 70-100%)
  //    A value of 80% is a good starting point.
  const saturation = Math.floor(Math.random() * 31) + 70; // 70 to 100

  // 3. Set lightness to a mid-range value to avoid very dark or very pastel colors (e.g., 50-70%)
  //    A value of 60% is a good starting point.
  const lightness = Math.floor(Math.random() * 21) + 50; // 50 to 70

  // 4. Convert HSL to RGB. This helper function is needed.
  //    hslToRgb(h, s, l) - h, s, l are percentages/degrees
  function hslToRgb(h: number, s: number, l: number) {
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2,
      r = 0,
      g = 0,
      b = 0;

    if (0 <= h && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (60 <= h && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (120 <= h && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (180 <= h && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (240 <= h && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (300 <= h && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return [r, g, b];
  }

  const [r, g, b] = hslToRgb(hue, saturation, lightness);

  // 5. Convert RGB to hexadecimal string
  //    .toString(16) converts to hex, .padStart(2, '0') ensures two digits (e.g., 9 -> "09")
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

// --- Examples of usage ---
console.log("Generating 5 random vibrant colors:");
for (let i = 0; i < 5; i++) {
  const color = getRandomVibrantColor();
  console.log(`Color ${i + 1}: ${color}`);

  // You can also visualize them in a browser console if it supports styling output
  // console.log(`%c${color}`, `background: ${color}; padding: 2px 5px; border-radius: 3px; color: ${
  //   (parseInt(color.substring(1,3), 16)*0.299 + parseInt(color.substring(3,5), 16)*0.587 + parseInt(color.substring(5,7), 16)*0.114) > 186 ? 'black' : 'white'
  // }`);
}

// Example of how you might use it in a React component or similar:
/*
import React from 'react';

const MyColorfulComponent = () => {
  const [randomColor, setRandomColor] = React.useState('');

  React.useEffect(() => {
    setRandomColor(getRandomVibrantColor());
  }, []); // Generate once on mount

  const changeColor = () => {
    setRandomColor(getRandomVibrantColor());
  };

  return (
    <div style={{ backgroundColor: randomColor, padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
      <h2 style={{ color: (parseInt(randomColor.substring(1,3), 16)*0.299 + parseInt(randomColor.substring(3,5), 16)*0.587 + parseInt(randomColor.substring(5,7), 16)*0.114) > 186 ? 'black' : 'white' }}>
        This is a vibrant color!
      </h2>
      <button onClick={changeColor}>Change Color</button>
    </div>
  );
};

export default MyColorfulComponent;
*/