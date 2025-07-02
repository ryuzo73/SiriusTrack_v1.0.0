import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { BarChart3, TrendingUp, Target, Users, Trophy, Medal, Award } from 'lucide-react';
import { database } from '../utils/database';

interface EvaluationDashboardProps {
  segmentId?: number;
}

export interface EvaluationDashboardHandle {
  refreshEvaluationData: () => Promise<void>;
}

interface EvaluationData {
  date: string;
  achievement_score: number; // milestone achievement rate
  goal_design_score: number; // daily todo achievement rate  
  consistency_score: number; // weekly todo achievement rate
  total_todos: number; // activity volume (points * 100)
  completed_todos: number; // task validity * 100
  achieved_todos: number;
}

interface SegmentRankingData {
  id: number;
  name: string;
  totalActivityPoints: number;
  achievement_score: number;
  goal_design_score: number;
  consistency_score: number;
  rank: number;
}

const EvaluationDashboard = forwardRef<EvaluationDashboardHandle, EvaluationDashboardProps>(({ segmentId }, ref) => {
  const [evaluationData, setEvaluationData] = useState<EvaluationData[]>([]);
  const [allSegmentsData, setAllSegmentsData] = useState<SegmentRankingData[]>([]);
  const [periodDays, setPeriodDays] = useState<number>(30); // Default to 30 days

  useEffect(() => {
    loadEvaluationData();
  }, [segmentId, periodDays]);

  useImperativeHandle(ref, () => ({
    refreshEvaluationData: async () => {
      await loadEvaluationData();
    }
  }));

  const loadEvaluationData = async () => {
    if (segmentId) {
      // Load specific segment data
      console.log('Loading evaluation data for segment:', segmentId);
      const data = await database.getEvaluationData(segmentId, 30);
      console.log('Evaluation data received:', data);
      setEvaluationData(data);
    } else {
      // Load all segments ranking data
      const segments = await database.getSegments();
      const segmentStats = await Promise.all(
        segments.map(async (segment: any) => {
          const data = await database.getEvaluationData(segment.id, periodDays);
          
          // Use the latest evaluation's total points (same as segment page display)
          let totalActivityPoints = 0;
          
          if (data.length > 0) {
            const latest = data[data.length - 1];
            totalActivityPoints = (latest?.total_todos || 0) / 100;
          }
          
          return {
            id: segment.id,
            name: segment.name,
            totalActivityPoints: totalActivityPoints,
            achievement_score: 0,
            goal_design_score: 0,
            consistency_score: 0,
            rank: 0 // Will be assigned after sorting
          };
        })
      );
      
      // Sort by activity points and assign ranks
      const sortedStats = segmentStats.sort((a, b) => b.totalActivityPoints - a.totalActivityPoints);
      sortedStats.forEach((stat, index) => {
        stat.rank = index + 1;
      });
      
      setAllSegmentsData(sortedStats);
    }
  };

  const ScoreCard: React.FC<{ 
    title: string; 
    score: number; 
    icon: React.ReactNode; 
    color: string;
    description: string;
    unit?: string;
    customValue?: string;
  }> = ({ title, score, icon, color, description, unit = '%', customValue }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <h3 className="font-medium text-gray-700">{title}</h3>
      </div>
      <div className="mb-2">
        <span className="text-3xl font-light text-gray-800">
          {customValue || Math.round(score * 100)}
        </span>
        <span className="text-lg text-gray-500 ml-1">{unit}</span>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );

  const RadarChart: React.FC<{ data: { achievement: number; design: number; consistency: number } }> = ({ data }) => {
    const size = 200;
    const center = size / 2;
    const radius = 60;
    
    // 4軸のレーダーチャート (マイルストーン、日次Todo、週次Todo、タスク妥当性)
    const angles = [0, 90, 180, 270].map(deg => (deg - 90) * Math.PI / 180);
    const taskValidity = evaluationData.length > 0 ? evaluationData[evaluationData.length - 1].completed_todos / 100 : 0;
    const points = [
      data.achievement * radius,    // マイルストーン達成度
      data.design * radius,         // 日次Todo達成度  
      data.consistency * radius,    // 週次Todo達成度
      taskValidity * radius         // タスク妥当性
    ];
    
    const polygonPoints = angles.map((angle, i) => {
      const x = center + Math.cos(angle) * points[i];
      const y = center + Math.sin(angle) * points[i];
      return `${x},${y}`;
    }).join(' ');

    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
    
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          総合評価
        </h3>
        <div className="flex justify-center">
          <svg width={size} height={size} className="overflow-visible">
            {/* Grid */}
            {gridLevels.map((level, i) => (
              <polygon
                key={i}
                points={angles.map(angle => {
                  const x = center + Math.cos(angle) * (radius * level);
                  const y = center + Math.sin(angle) * (radius * level);
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Axes */}
            {angles.map((angle, i) => (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={center + Math.cos(angle) * radius}
                y2={center + Math.sin(angle) * radius}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Data polygon */}
            <polygon
              points={polygonPoints}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            
            {/* Data points */}
            {angles.map((angle, i) => {
              const x = center + Math.cos(angle) * points[i];
              const y = center + Math.sin(angle) * points[i];
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#3b82f6"
                />
              );
            })}
            
            {/* Labels for 4-axis radar chart */}
            <text x={center} y={center - radius - 15} textAnchor="middle" className="text-xs fill-gray-600">
              マイルストーン達成度
            </text>
            <text x={center + radius + 15} y={center + 4} textAnchor="start" className="text-xs fill-gray-600">
              日次Todo達成度
            </text>
            <text x={center} y={center + radius + 20} textAnchor="middle" className="text-xs fill-gray-600">
              週次Todo達成度
            </text>
            <text x={center - radius - 15} y={center + 4} textAnchor="end" className="text-xs fill-gray-600">
              タスク妥当性
            </text>
          </svg>
        </div>
      </div>
    );
  };

  const getLatestScores = () => {
    if (evaluationData.length === 0) return { achievement: 0, design: 0, consistency: 0 };
    const latest = evaluationData[evaluationData.length - 1];
    return {
      achievement: latest.achievement_score,
      design: latest.goal_design_score,
      consistency: latest.consistency_score
    };
  };

  const scores = getLatestScores();

  if (segmentId) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-medium flex items-center gap-2">
          <TrendingUp size={20} />
          個別領域評価
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <ScoreCard
            title="マイルストーン達成度"
            score={scores.achievement}
            icon={<Target size={20} color="white" />}
            color="bg-blue-500"
            description="マイルストーン全体の完了率"
          />
          <ScoreCard
            title="日次Todo達成度"
            score={scores.design}
            icon={<BarChart3 size={20} color="white" />}
            color="bg-green-500"
            description="日次Todo全体の完了率"
          />
          <ScoreCard
            title="週次Todo達成度"
            score={scores.consistency}
            icon={<TrendingUp size={20} color="white" />}
            color="bg-indigo-500"
            description="週次Todo全体の完了率"
          />
          <ScoreCard
            title="活動量"
            score={0} // scoreは使用せず、customValueを使用
            icon={<Users size={20} color="white" />}
            color="bg-orange-500"
            description="獲得ポイント数"
            unit="pts"
            customValue={evaluationData.length > 0 ? (evaluationData[evaluationData.length - 1].total_todos / 100).toFixed(1) : '0.0'}
          />
          <ScoreCard
            title="タスク妥当性"
            score={(() => {
              if (evaluationData.length === 0) return 0;
              const latestData = evaluationData[evaluationData.length - 1];
              console.log('🔍 Task Validity Debug:', {
                completed_todos: latestData.completed_todos,
                score: latestData.completed_todos / 100,
                percentage: Math.round((latestData.completed_todos / 100) * 100) + '%'
              });
              return latestData.completed_todos / 100;
            })()}
            icon={<TrendingUp size={20} color="white" />}
            color="bg-purple-500"
            description="期限内完了率によるタスク設計妥当性"
          />
        </div>

        <RadarChart data={scores} />
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="text-yellow-500" size={24} />;
      case 2:
        return <Medal className="text-gray-400" size={24} />;
      case 3:
        return <Award className="text-orange-600" size={24} />;
      default:
        return <span className="text-lg font-bold text-gray-500 w-6 text-center">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-medium flex items-center gap-2">
            <Trophy size={20} />
            活動量ランキング
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriodDays(7)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                periodDays === 7 
                  ? 'bg-apple-gray-700 text-white' 
                  : 'bg-apple-gray-100 hover:bg-apple-gray-200'
              }`}
            >
              週間
            </button>
            <button
              onClick={() => setPeriodDays(30)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                periodDays === 30 
                  ? 'bg-apple-gray-700 text-white' 
                  : 'bg-apple-gray-100 hover:bg-apple-gray-200'
              }`}
            >
              月間
            </button>
          </div>
        </div>
        <p className="text-sm text-apple-gray-600">
          各領域の活動量を比較し、最も活発に取り組んでいる分野を確認できます。
        </p>
      </div>
      
      <div className="space-y-3">
        {allSegmentsData.map((segment) => (
          <div 
            key={segment.id} 
            className={`p-4 border-2 rounded-xl transition-all hover:shadow-md ${getRankColor(segment.rank)}`}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {getRankIcon(segment.rank)}
              </div>
              
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{segment.name}</h3>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-apple-gray-700">
                      {segment.totalActivityPoints.toFixed(1)}
                    </span>
                    <span className="text-sm text-apple-gray-500 ml-1">pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {allSegmentsData.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Trophy size={48} className="mx-auto mb-4 opacity-20" />
            <p>まだ評価データがありません</p>
            <p className="text-sm mt-2">領域でタスクを完了すると、ここにランキングが表示されます</p>
          </div>
        )}
      </div>
    </div>
  );
});

EvaluationDashboard.displayName = 'EvaluationDashboard';

export default EvaluationDashboard;