import { format } from 'date-fns';

/**
 * アプリケーション全体で統一された日付文字列を生成
 * 全ての習慣Todo関連の処理でこの関数を使用することで、
 * 日付の不整合を防ぐ
 */
export const getTodayString = (): string => {
  const today = new Date();
  return format(today, 'yyyy-MM-dd');
};

/**
 * 指定した日付を統一フォーマットの文字列に変換
 */
export const formatDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * デバッグ用: 現在時刻と生成された日付文字列をログ出力
 */
export const logDateDebug = (context: string): string => {
  const dateString = getTodayString();
  const now = new Date();
  console.log(`[DateUtils] ${context}: ${dateString} (generated at ${now.toISOString()})`);
  return dateString;
};