import { useEffect, useState } from 'react';

const AnalogClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  // Generate hour and minute marks programmatically
  const renderMarks = (count: number, isHour: boolean) => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = i * (360 / count);
      const length = isHour ? 20 : 10;
      const y1 = isHour ? 50 : 55;
      const y2 = y1 + length;
      
      return (
        <line
          key={angle}
          x1="200"
          y1={y1.toString()}
          x2="200"
          y2={y2.toString()}
          stroke={isHour ? "#333" : "#777"}
          strokeWidth={isHour ? 2 : 1}
          strokeLinecap="round"
          transform={`rotate(${angle}, 200, 200)`}
        />
      );
    });
  };

  // Clock numbers positions
  const numbers = Array.from({ length: 12 }).map((_, i) => {
    const angle = i * 30 - 60;
    const radius = 160;
    const x = 200 + Math.cos((angle * Math.PI) / 180) * radius;
    const y = 200 + Math.sin((angle * Math.PI) / 180) * radius;
    
    return (
      <text
        key={i}
        x={x.toFixed(1)}
        y={y.toFixed(1)}
        fontFamily="Arial, sans-serif"
        fontSize="20"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {i === 0 ? 12 : i}
      </text>
    );
  });

  return (
    <svg viewBox="0 0 400 400">
      {/* Clock Shadow */}
      <circle cx="204" cy="204" r="180" fill="rgba(0, 0, 0, 0.1)" filter="blur(5px)" />
      
      {/* Clock Face */}
      <circle cx="200" cy="200" r="180" fill="#f5f5f5" stroke="#333" strokeWidth="2" />
      
      {/* Hour Marks */}
      <g>{renderMarks(12, true)}</g>
      
      {/* Minute Marks */}
      <g>{renderMarks(60, false)}</g>
      
      {/* Numbers */}
      <g>{numbers}</g>
      
      {/* Hour Hand */}
      <line
        x1="200"
        y1="200"
        x2="200"
        y2="130"
        stroke="#333"
        strokeWidth="6"
        strokeLinecap="round"
        transform={`rotate(${hourAngle}, 200, 200)`}
      />
      
      {/* Minute Hand */}
      <line
        x1="200"
        y1="200"
        x2="200"
        y2="100"
        stroke="#555"
        strokeWidth="4"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle}, 200, 200)`}
      />
      
      {/* Second Hand */}
      <line
        x1="200"
        y1="200"
        x2="200"
        y2="80"
        stroke="#cc0000"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${secondAngle}, 200, 200)`}
      />
      
      {/* Center Dot */}
      <circle cx="200" cy="200" r="5" fill="#cc0000" />
      
      {/* Clock Rim */}
      <circle cx="200" cy="200" r="180" fill="none" stroke="#222" strokeWidth="4" />
    </svg>
  );
};

export default AnalogClock;