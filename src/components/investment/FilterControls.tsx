'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Filter, 
  Search, 
  Grid3x3, 
  List, 
  SortAsc,
  X,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface FilterControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  totalCount: number;
  filteredCount: number;
  onReset?: () => void;
}

export default function FilterControls({
  searchTerm,
  setSearchTerm,
  selectedSector,
  setSelectedSector,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  totalCount,
  filteredCount,
  onReset
}: FilterControlsProps) {

  const sectors = [
    { value: 'all', label: '전체 섹터' },
    { value: 'technology', label: '기술' },
    { value: 'finance', label: '금융' },
    { value: 'healthcare', label: '헬스케어' },
    { value: 'consumer', label: '소비재' },
    { value: 'energy', label: '에너지' },
    { value: 'industrial', label: '산업재' },
    { value: 'materials', label: '소재' },
    { value: 'utilities', label: '유틸리티' },
    { value: 'real-estate', label: '부동산' },
  ];

  const sortOptions = [
    { value: 'rank', label: '포트폴리오 순위', icon: SortAsc },
    { value: 'value', label: '시장 가치', icon: TrendingUp },
    { value: 'change-positive', label: '상승률 높은순', icon: TrendingUp },
    { value: 'change-negative', label: '하락률 높은순', icon: TrendingDown },
    { value: 'alphabetical', label: '알파벳순', icon: SortAsc },
  ];

  const hasActiveFilters = searchTerm || selectedSector !== 'all' || sortBy !== 'rank';

  return (
    <Card className="p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 검색 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="종목명 또는 티커로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* 섹터 필터 */}
        <Select value={selectedSector} onValueChange={setSelectedSector}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sectors.map((sector) => (
              <SelectItem key={sector.value} value={sector.value}>
                {sector.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 정렬 */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <option.icon className="h-3 w-3" />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 뷰 모드 */}
        <div className="flex rounded-lg border">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* 초기화 */}
        {hasActiveFilters && onReset && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReset}
            className="whitespace-nowrap"
          >
            <X className="h-4 w-4 mr-2" />
            초기화
          </Button>
        )}
      </div>

      {/* 필터 상태 및 결과 요약 */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="flex items-center gap-2 flex-wrap">
          {searchTerm && (
            <Badge variant="secondary">
              검색: "{searchTerm}"
            </Badge>
          )}
          {selectedSector !== 'all' && (
            <Badge variant="secondary">
              섹터: {sectors.find(s => s.value === selectedSector)?.label}
            </Badge>
          )}
          {sortBy !== 'rank' && (
            <Badge variant="secondary">
              정렬: {sortOptions.find(s => s.value === sortBy)?.label}
            </Badge>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {filteredCount !== totalCount && (
            <span>{filteredCount}개 표시 / </span>
          )}
          총 {totalCount}개 종목
        </div>
      </div>
    </Card>
  );
}