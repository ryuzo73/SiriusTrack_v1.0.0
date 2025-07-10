import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { RoutineEvent } from '../utils/database';

interface CircularTimelineProps {
  events: RoutineEvent[];
  onEventClick?: (event: RoutineEvent) => void;
  onTimeClick?: (hour: number, minute: number) => void;
  timeRanges?: TimeRange[];
  onColorSettingsClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

interface TimeRange {
  start: number;
  end: number;
  color: string;
  label: string;
}

const CircularTimeline: React.FC<CircularTimelineProps> = ({ 
  events, 
  onEventClick, 
  onTimeClick, 
  timeRanges = [
    { start: 6, end: 12, color: '#FEF3C7', label: '朝' },
    { start: 12, end: 18, color: '#DBEAFE', label: '昼' },
    { start: 18, end: 22, color: '#FEE2E2', label: '夕方' },
    { start: 22, end: 6, color: '#E5E7EB', label: '夜・深夜' }
  ],
  onColorSettingsClick,
  size = 'large'
}) => {
  // サイズに応じた対応
  const sizeConfig = {
    small: { svgSize: 500, centerX: 250, centerY: 250, radius: 180, innerRadius: 120 },
    medium: { svgSize: 600, centerX: 300, centerY: 300, radius: 220, innerRadius: 140 },
    large: { svgSize: 800, centerX: 400, centerY: 400, radius: 300, innerRadius: 180 }
  };
  
  const { svgSize, centerX, centerY, radius, innerRadius } = sizeConfig[size];
  
  // 時間を角度に変換 (12時が0度、時計回り)
  const timeToAngle = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    // 0時(24時)を0度として、時計回りに角度を計算
    return (totalMinutes / (24 * 60)) * 360 - 90; // -90で12時を上に配置
  };
  
  // 角度から座標を計算
  const angleToCoord = (angle: number, r: number) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(radian),
      y: centerY + r * Math.sin(radian)
    };
  };

  // 座標から角度を計算
  const coordToAngle = (x: number, y: number): number => {
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    // 12時を0度とするために90度を加算
    angle += 90;
    // 負の角度を正の角度に変換
    if (angle < 0) angle += 360;
    return angle;
  };

  // 角度から時間を計算
  const angleToTime = (angle: number): { hour: number; minute: number } => {
    const totalMinutes = (angle / 360) * 24 * 60;
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = Math.floor(totalMinutes % 60);
    return { hour, minute };
  };

  // クリック位置が円の範囲内かどうかを判定
  const isWithinCircle = (x: number, y: number): boolean => {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance >= innerRadius && distance <= radius;
  };
  
  // 時間ラベルの生成
  const generateTimeLabels = () => {
    const labels = [];
    for (let hour = 0; hour < 24; hour++) {
      const angle = (hour / 24) * 360 - 90;
      const coord = angleToCoord(angle, radius + 40);
      labels.push(
        <text
          key={hour}
          x={coord.x}
          y={coord.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm text-apple-gray-600 font-mono font-semibold"
        >
          {hour === 0 ? '24' : hour.toString().padStart(2, '0')}
        </text>
      );
    }
    return labels;
  };
  
  // 時間目盛りの生成
  const generateTimeTicks = () => {
    const ticks = [];
    for (let hour = 0; hour < 24; hour++) {
      const angle = (hour / 24) * 360 - 90;
      const outerCoord = angleToCoord(angle, radius);
      const innerCoord = angleToCoord(angle, radius - 20);
      
      ticks.push(
        <line
          key={hour}
          x1={outerCoord.x}
          y1={outerCoord.y}
          x2={innerCoord.x}
          y2={innerCoord.y}
          stroke="#9CA3AF"
          strokeWidth="2"
        />
      );
    }
    return ticks;
  };
  
  // イベントアークの生成
  const generateEventArcs = () => {
    return events.map((event, index) => {
      const startAngle = timeToAngle(event.start_time);
      const endAngle = timeToAngle(event.end_time);
      
      // 終了時刻が開始時刻より小さい場合（日をまたぐ場合）の処理
      const adjustedEndAngle = endAngle < startAngle ? endAngle + 360 : endAngle;
      
      // アークの座標計算
      const startCoord = angleToCoord(startAngle, innerRadius);
      const endCoord = angleToCoord(adjustedEndAngle, innerRadius);
      const startCoordOuter = angleToCoord(startAngle, radius - 30);
      const endCoordOuter = angleToCoord(adjustedEndAngle, radius - 30);
      
      const largeArcFlag = adjustedEndAngle - startAngle > 180 ? 1 : 0;
      
      // アークパスの生成
      const pathData = [
        `M ${startCoord.x} ${startCoord.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endCoord.x} ${endCoord.y}`,
        `L ${endCoordOuter.x} ${endCoordOuter.y}`,
        `A ${radius - 30} ${radius - 30} 0 ${largeArcFlag} 0 ${startCoordOuter.x} ${startCoordOuter.y}`,
        'Z'
      ].join(' ');
      
      // イベントの色を決定（時間帯に応じて）
      const getEventColor = (startTime: string) => {
        const hour = parseInt(startTime.split(':')[0]);
        
        for (const range of timeRanges) {
          if (range.start <= range.end) {
            // 通常の時間帯（例：6-12）
            if (hour >= range.start && hour < range.end) {
              return range.color;
            }
          } else {
            // 日をまたぐ時間帯（例：22-6）
            if (hour >= range.start || hour < range.end) {
              return range.color;
            }
          }
        }
        
        return '#E5E7EB'; // デフォルト色
      };
      
      const getBorderColor = (startTime: string) => {
        const backgroundColor = getEventColor(startTime);
        // 背景色を基に、より濃い色の境界線を生成
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        };
        
        const rgb = hexToRgb(backgroundColor);
        if (rgb) {
          // 色を40%程度暗くする
          const darkerR = Math.max(0, Math.floor(rgb.r * 0.6));
          const darkerG = Math.max(0, Math.floor(rgb.g * 0.6));
          const darkerB = Math.max(0, Math.floor(rgb.b * 0.6));
          return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
        }
        
        return '#6B7280'; // デフォルト境界色
      };
      
      // イベントタイトルの位置計算
      const midAngle = (startAngle + adjustedEndAngle) / 2;
      const textRadius = (innerRadius + radius - 30) / 2;
      const textCoord = angleToCoord(midAngle, textRadius);
      
      return (
        <g key={event.id}>
          <path
            d={pathData}
            fill={getEventColor(event.start_time)}
            stroke={getBorderColor(event.start_time)}
            strokeWidth="2"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onEventClick?.(event);
            }}
          />
          <text
            x={textCoord.x}
            y={textCoord.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm font-medium pointer-events-none"
            fill={getBorderColor(event.start_time)}
          >
            {event.title.length > 10 ? event.title.substring(0, 10) + '...' : event.title}
          </text>
        </g>
      );
    });
  };
  
  // SVGクリックハンドラー
  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = svgSize / rect.width;
    const scaleY = svgSize / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (isWithinCircle(x, y)) {
      const angle = coordToAngle(x, y);
      const time = angleToTime(angle);
      onTimeClick?.(time.hour, time.minute);
    }
  };

  return (
    <div className="flex justify-center relative">
      <svg 
        width={svgSize} 
        height={svgSize} 
        viewBox={`0 0 ${svgSize} ${svgSize}`} 
        className="border rounded-lg bg-white max-w-full h-auto cursor-crosshair"
        style={{ maxWidth: `${svgSize}px`, maxHeight: `${svgSize}px` }}
        onClick={handleSVGClick}
      >
        {/* 外側の円 */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="2"
        />
        
        {/* 内側の円 */}
        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="2"
        />
        
        {/* 時間目盛り */}
        {generateTimeTicks()}
        
        {/* 時間ラベル */}
        {generateTimeLabels()}
        
        {/* イベントアーク */}
        {generateEventArcs()}
        
        {/* 中央の時計アイコン */}
        <circle
          cx={centerX}
          cy={centerY}
          r="12"
          fill="#6B7280"
        />
        
        {/* 中央のテキスト */}
        <text
          x={centerX}
          y={centerY + 50}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-lg font-medium text-apple-gray-600"
        >
          24時間
        </text>
      </svg>
      
      {/* 色分け設定ボタン */}
      <button
        onClick={onColorSettingsClick}
        className="absolute bottom-4 right-4 p-2 bg-white border border-apple-gray-300 rounded-lg hover:bg-apple-gray-50 transition-colors shadow-sm"
        title="色分け設定"
      >
        <Palette size={16} className="text-apple-gray-600" />
      </button>
    </div>
  );
};

export default CircularTimeline;