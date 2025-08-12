import { UserProfile } from './financial-news-curator';
import { mcpClient } from '@/types/mcp';

// 사용자 프로필 관리 인터페이스
export interface UserPreferences {
  notifications_enabled: boolean;
  notification_types: ('BREAKING' | 'DIGEST' | 'PORTFOLIO' | 'INSIGHTS')[];
  update_frequency: 'REAL_TIME' | 'HOURLY' | 'DAILY';
  digest_time: string; // HH:MM 형식
  email_notifications: boolean;
  push_notifications: boolean;
  theme_preference: 'LIGHT' | 'DARK' | 'AUTO';
  language: 'ko' | 'en';
}

export interface ExtendedUserProfile extends UserProfile {
  email?: string;
  created_date: string;
  last_active: string;
  preferences: UserPreferences;
  subscription_tier: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  api_usage: {
    daily_requests: number;
    monthly_requests: number;
    last_reset: string;
  };
}

// 사용자 프로필 관리자
export class UserProfileManager {
  private static instance: UserProfileManager;
  private profileCache: Map<string, ExtendedUserProfile> = new Map();
  
  private constructor() {
    this.loadProfilesFromStorage();
  }

  static getInstance(): UserProfileManager {
    if (!UserProfileManager.instance) {
      UserProfileManager.instance = new UserProfileManager();
    }
    return UserProfileManager.instance;
  }

  // 사용자 프로필 생성
  async createUserProfile(userId: string, initialData: Partial<UserProfile>): Promise<ExtendedUserProfile> {
    const defaultPreferences: UserPreferences = {
      notifications_enabled: true,
      notification_types: ['BREAKING', 'DIGEST', 'PORTFOLIO'],
      update_frequency: 'HOURLY',
      digest_time: '09:00',
      email_notifications: false,
      push_notifications: true,
      theme_preference: 'AUTO',
      language: 'ko'
    };

    const profile: ExtendedUserProfile = {
      id: userId,
      interests: initialData.interests || ['technology', 'market analysis'],
      sectors: initialData.sectors || ['Technology', 'Finance'],
      portfolio_symbols: initialData.portfolio_symbols || [],
      risk_tolerance: initialData.risk_tolerance || 'MEDIUM',
      news_frequency: initialData.news_frequency || 'HOURLY',
      content_types: initialData.content_types || ['NEWS', 'ANALYSIS'],
      email: '',
      created_date: new Date().toISOString(),
      last_active: new Date().toISOString(),
      preferences: defaultPreferences,
      subscription_tier: 'FREE',
      api_usage: {
        daily_requests: 0,
        monthly_requests: 0,
        last_reset: new Date().toISOString()
      }
    };

    // 캐시에 저장
    this.profileCache.set(userId, profile);
    
    // 영구 저장소에 저장
    await this.saveProfileToStorage(profile);
    
    // MCP 메모리에 저장
    await this.saveProfileToMemory(profile);

    return profile;
  }

  // 사용자 프로필 가져오기
  async getUserProfile(userId: string): Promise<ExtendedUserProfile | null> {
    // 캐시에서 먼저 확인
    if (this.profileCache.has(userId)) {
      const profile = this.profileCache.get(userId)!;
      // 마지막 활동 시간 업데이트
      profile.last_active = new Date().toISOString();
      return profile;
    }

    // 영구 저장소에서 로드
    const profile = await this.loadProfileFromStorage(userId);
    if (profile) {
      this.profileCache.set(userId, profile);
      profile.last_active = new Date().toISOString();
      return profile;
    }

    return null;
  }

  // 사용자 프로필 업데이트
  async updateUserProfile(
    userId: string, 
    updates: Partial<ExtendedUserProfile>
  ): Promise<ExtendedUserProfile | null> {
    const existingProfile = await this.getUserProfile(userId);
    if (!existingProfile) {
      throw new Error(`User profile not found: ${userId}`);
    }

    const updatedProfile: ExtendedUserProfile = {
      ...existingProfile,
      ...updates,
      id: userId, // ID는 변경 불가
      last_active: new Date().toISOString()
    };

    // 캐시 업데이트
    this.profileCache.set(userId, updatedProfile);
    
    // 영구 저장소 업데이트
    await this.saveProfileToStorage(updatedProfile);
    
    // MCP 메모리 업데이트
    await this.updateProfileInMemory(updatedProfile);

    return updatedProfile;
  }

  // 사용자 선호 설정 업데이트
  async updateUserPreferences(
    userId: string, 
    preferences: Partial<UserPreferences>
  ): Promise<ExtendedUserProfile | null> {
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      throw new Error(`User profile not found: ${userId}`);
    }

    const updatedPreferences = {
      ...profile.preferences,
      ...preferences
    };

    return this.updateUserProfile(userId, { preferences: updatedPreferences });
  }

  // 포트폴리오 업데이트
  async updatePortfolio(
    userId: string, 
    portfolioSymbols: string[]
  ): Promise<ExtendedUserProfile | null> {
    return this.updateUserProfile(userId, { portfolio_symbols: portfolioSymbols });
  }

  // 관심사 업데이트
  async updateInterests(
    userId: string, 
    interests: string[], 
    sectors: string[]
  ): Promise<ExtendedUserProfile | null> {
    return this.updateUserProfile(userId, { interests, sectors });
  }

  // API 사용량 추적
  async trackAPIUsage(userId: string): Promise<void> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return;

    const now = new Date();
    const lastReset = new Date(profile.api_usage.last_reset);
    
    // 일일 리셋 (자정 기준)
    if (now.getDate() !== lastReset.getDate()) {
      profile.api_usage.daily_requests = 0;
    }
    
    // 월별 리셋
    if (now.getMonth() !== lastReset.getMonth()) {
      profile.api_usage.monthly_requests = 0;
    }

    profile.api_usage.daily_requests++;
    profile.api_usage.monthly_requests++;
    profile.api_usage.last_reset = now.toISOString();

    await this.updateUserProfile(userId, { api_usage: profile.api_usage });
  }

  // 사용량 제한 차이
  async checkUsageLimits(userId: string): Promise<{
    canUse: boolean;
    dailyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    monthlyUsed: number;
  }> {
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      return {
        canUse: false,
        dailyLimit: 0,
        monthlyLimit: 0,
        dailyUsed: 0,
        monthlyUsed: 0
      };
    }

    const limits = this.getUsageLimits(profile.subscription_tier);
    
    return {
      canUse: profile.api_usage.daily_requests < limits.daily && 
              profile.api_usage.monthly_requests < limits.monthly,
      dailyLimit: limits.daily,
      monthlyLimit: limits.monthly,
      dailyUsed: profile.api_usage.daily_requests,
      monthlyUsed: profile.api_usage.monthly_requests
    };
  }

  // 개인화 콘텐츠 설정 생성
  async generatePersonalizationSettings(userId: string): Promise<{
    content_filters: any;
    notification_settings: any;
    curation_preferences: any;
  }> {
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      throw new Error(`User profile not found: ${userId}`);
    }

    return {
      content_filters: {
        sectors: profile.sectors,
        interests: profile.interests,
        portfolio_symbols: profile.portfolio_symbols,
        risk_tolerance: profile.risk_tolerance,
        min_importance_score: this.getMinImportanceScore(profile.risk_tolerance)
      },
      notification_settings: {
        enabled: profile.preferences.notifications_enabled,
        types: profile.preferences.notification_types,
        frequency: profile.preferences.update_frequency,
        digest_time: profile.preferences.digest_time
      },
      curation_preferences: {
        content_types: profile.content_types,
        news_frequency: profile.news_frequency,
        language: profile.preferences.language
      }
    };
  }

  // 모든 사용자 목록 (관리용)
  async getAllUsers(): Promise<ExtendedUserProfile[]> {
    return Array.from(this.profileCache.values());
  }

  // 비활성 사용자 정리
  async cleanupInactiveUsers(daysSinceLastActive: number = 90): Promise<string[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActive);
    
    const inactiveUserIds: string[] = [];
    
    for (const [userId, profile] of this.profileCache.entries()) {
      const lastActive = new Date(profile.last_active);
      if (lastActive < cutoffDate) {
        inactiveUserIds.push(userId);
        this.profileCache.delete(userId);
        await this.deleteProfileFromStorage(userId);
      }
    }
    
    return inactiveUserIds;
  }

  // 개인 정보 삭제
  async deleteUserProfile(userId: string): Promise<void> {
    this.profileCache.delete(userId);
    await this.deleteProfileFromStorage(userId);
    // MCP 메모리에서도 삭제
    // 실제 구현에서는 mcp__memory__delete_entities 호출
  }

  // 유틸리티 메서드들
  private async loadProfilesFromStorage(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('user_profiles');
        if (stored) {
          const profiles = JSON.parse(stored) as ExtendedUserProfile[];
          profiles.forEach(profile => {
            this.profileCache.set(profile.id, profile);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profiles from storage:', error);
    }
  }

  private async saveProfileToStorage(profile: ExtendedUserProfile): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const allProfiles = Array.from(this.profileCache.values());
        localStorage.setItem('user_profiles', JSON.stringify(allProfiles));
      }
    } catch (error) {
      console.error('Failed to save profile to storage:', error);
    }
  }

  private async loadProfileFromStorage(userId: string): Promise<ExtendedUserProfile | null> {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`user_profile_${userId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to load profile from storage:', error);
      return null;
    }
  }

  private async deleteProfileFromStorage(userId: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`user_profile_${userId}`);
        // 전체 프로필 목록도 업데이트
        const allProfiles = Array.from(this.profileCache.values());
        localStorage.setItem('user_profiles', JSON.stringify(allProfiles));
      }
    } catch (error) {
      console.error('Failed to delete profile from storage:', error);
    }
  }

  private async saveProfileToMemory(profile: ExtendedUserProfile): Promise<void> {
    try {
      await mcpClient.memory.createEntities([{
        name: `user_profile_${profile.id}`,
        entityType: 'user_profile',
        observations: [
          `User ID: ${profile.id}`,
          `Interests: ${profile.interests.join(', ')}`,
          `Sectors: ${profile.sectors.join(', ')}`,
          `Portfolio: ${profile.portfolio_symbols?.join(', ') || 'None'}`,
          `Risk Tolerance: ${profile.risk_tolerance}`,
          `Subscription: ${profile.subscription_tier}`,
          `Created: ${profile.created_date}`,
          `Last Active: ${profile.last_active}`
        ]
      }]);
    } catch (error) {
      console.error('Failed to save profile to memory:', error);
    }
  }

  private async updateProfileInMemory(profile: ExtendedUserProfile): Promise<void> {
    try {
      await mcpClient.memory.addObservations([{
        entityName: `user_profile_${profile.id}`,
        contents: [
          `Profile updated: ${new Date().toISOString()}`,
          `Current interests: ${profile.interests.join(', ')}`,
          `Current sectors: ${profile.sectors.join(', ')}`,
          `Current portfolio: ${profile.portfolio_symbols?.join(', ') || 'None'}`,
          `Last active: ${profile.last_active}`
        ]
      }]);
    } catch (error) {
      console.error('Failed to update profile in memory:', error);
    }
  }

  private getUsageLimits(tier: string): { daily: number; monthly: number } {
    switch (tier) {
      case 'FREE':
        return { daily: 50, monthly: 1000 };
      case 'PREMIUM':
        return { daily: 500, monthly: 10000 };
      case 'ENTERPRISE':
        return { daily: 5000, monthly: 100000 };
      default:
        return { daily: 10, monthly: 100 };
    }
  }

  private getMinImportanceScore(riskTolerance: string): number {
    switch (riskTolerance) {
      case 'LOW':
        return 0.8; // 높은 중요도의 뉴스만
      case 'MEDIUM':
        return 0.5; // 중간 이상 중요도
      case 'HIGH':
        return 0.2; // 모든 뉴스
      default:
        return 0.5;
    }
  }
}

// 편의 함수들
export async function createUser(userId: string, initialData?: Partial<UserProfile>): Promise<ExtendedUserProfile> {
  const manager = UserProfileManager.getInstance();
  return manager.createUserProfile(userId, initialData || {});
}

export async function getUser(userId: string): Promise<ExtendedUserProfile | null> {
  const manager = UserProfileManager.getInstance();
  return manager.getUserProfile(userId);
}

export async function updateUser(userId: string, updates: Partial<ExtendedUserProfile>): Promise<ExtendedUserProfile | null> {
  const manager = UserProfileManager.getInstance();
  return manager.updateUserProfile(userId, updates);
}

export async function updateUserPortfolio(userId: string, symbols: string[]): Promise<ExtendedUserProfile | null> {
  const manager = UserProfileManager.getInstance();
  return manager.updatePortfolio(userId, symbols);
}

export async function updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<ExtendedUserProfile | null> {
  const manager = UserProfileManager.getInstance();
  return manager.updateUserPreferences(userId, preferences);
}

export async function generatePersonalizationConfig(userId: string) {
  const manager = UserProfileManager.getInstance();
  return manager.generatePersonalizationSettings(userId);
}

export default UserProfileManager;