export interface MacroEvent {
  id: string;
  log_no?: string; // 연결된 포스트 ID
  date: string; // YYYY-MM-DD
  title: string;
  titleKr: string;
  type: 'economic' | 'central-bank' | 'earnings' | 'holiday' | 'other';
  importance: 'high' | 'medium' | 'low';
  description: string;
  impact: {
    scenario: string;
    effect: string;
  }[];
  source?: string;
  relatedStocks?: string[];
}