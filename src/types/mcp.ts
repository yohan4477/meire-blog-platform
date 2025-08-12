// MCP (Model Context Protocol) 타입 정의

// MCP Memory 서버 관련 타입들
export interface MCPEntity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface MCPRelation {
  from: string;
  to: string;
  relationType: string;
}

export interface MCPObservation {
  entityName: string;
  contents: string[];
}

// MCP Memory 서버 API 함수들 (시뮬레이션)
export async function mcp__memory__create_entities(params: { entities: MCPEntity[] }): Promise<void> {
  // 실제 구현에서는 MCP memory 서버와 통신
  console.log('MCP Memory: Creating entities:', params.entities.length);
  
  // 시뮬레이션: 로컬 스토리지나 캐시에 저장
  try {
    const existingEntities = JSON.parse(localStorage.getItem('mcp_entities') || '[]');
    const updatedEntities = [...existingEntities, ...params.entities];
    localStorage.setItem('mcp_entities', JSON.stringify(updatedEntities));
  } catch (error) {
    console.warn('Could not store entities in localStorage:', error);
  }
}

export async function mcp__memory__add_observations(params: { observations: MCPObservation[] }): Promise<void> {
  console.log('MCP Memory: Adding observations:', params.observations.length);
  
  try {
    const existingObservations = JSON.parse(localStorage.getItem('mcp_observations') || '[]');
    const updatedObservations = [...existingObservations, ...params.observations];
    localStorage.setItem('mcp_observations', JSON.stringify(updatedObservations));
  } catch (error) {
    console.warn('Could not store observations in localStorage:', error);
  }
}

export async function mcp__memory__search_nodes(params: { query: string }): Promise<MCPEntity[]> {
  console.log('MCP Memory: Searching nodes for query:', params.query);
  
  try {
    const entities = JSON.parse(localStorage.getItem('mcp_entities') || '[]') as MCPEntity[];
    
    // 간단한 검색 구현
    const results = entities.filter(entity => 
      entity.name.toLowerCase().includes(params.query.toLowerCase()) ||
      entity.entityType.toLowerCase().includes(params.query.toLowerCase()) ||
      entity.observations.some(obs => obs.toLowerCase().includes(params.query.toLowerCase()))
    );
    
    return results;
  } catch (error) {
    console.warn('Could not search entities in localStorage:', error);
    return [];
  }
}

export async function mcp__memory__create_relations(params: { relations: MCPRelation[] }): Promise<void> {
  console.log('MCP Memory: Creating relations:', params.relations.length);
  
  try {
    const existingRelations = JSON.parse(localStorage.getItem('mcp_relations') || '[]');
    const updatedRelations = [...existingRelations, ...params.relations];
    localStorage.setItem('mcp_relations', JSON.stringify(updatedRelations));
  } catch (error) {
    console.warn('Could not store relations in localStorage:', error);
  }
}

// MCP Fetch 서버 관련 타입들
export interface MCPFetchRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface MCPFetchResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  success: boolean;
  error?: string;
}

// MCP Fetch 서버 API 함수 (시뮬레이션)
export async function mcp__fetch__request(params: MCPFetchRequest): Promise<MCPFetchResponse> {
  console.log('MCP Fetch: Making request to:', params.url);
  
  try {
    // 실제 구현에서는 MCP fetch 서버를 통해 요청
    // 여기서는 시뮬레이션된 응답 반환
    
    if (params.url.includes('reuters.com')) {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          articles: [
            {
              title: 'Reuters: Global Markets Update',
              description: 'Stock markets showing mixed signals amid economic uncertainty',
              url: 'https://reuters.com/markets/update',
              publishedAt: new Date().toISOString()
            }
          ]
        }),
        success: true
      };
    }
    
    if (params.url.includes('bloomberg.com')) {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          articles: [
            {
              title: 'Bloomberg: Fed Policy Impact Analysis',
              description: 'Federal Reserve decisions affecting market volatility',
              url: 'https://bloomberg.com/fed-policy',
              publishedAt: new Date().toISOString()
            }
          ]
        }),
        success: true
      };
    }
    
    // 기본 응답
    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articles: [] }),
      success: true
    };
    
  } catch (error) {
    return {
      status: 500,
      headers: {},
      body: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// MCP Time 서버 관련 타입들
export interface MCPTimeSchedule {
  id: string;
  cron: string;
  action: string;
  parameters: any;
  enabled: boolean;
}

export interface MCPTimeEvent {
  id: string;
  timestamp: string;
  action: string;
  parameters: any;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

// MCP Time 서버 API 함수들 (시뮬레이션)
export async function mcp__time__schedule(params: MCPTimeSchedule): Promise<void> {
  console.log('MCP Time: Scheduling task:', params.id);
  
  try {
    const existingSchedules = JSON.parse(localStorage.getItem('mcp_schedules') || '[]');
    const updatedSchedules = [...existingSchedules, params];
    localStorage.setItem('mcp_schedules', JSON.stringify(updatedSchedules));
  } catch (error) {
    console.warn('Could not store schedule in localStorage:', error);
  }
}

export async function mcp__time__get_current_time(): Promise<string> {
  return new Date().toISOString();
}

export async function mcp__time__create_event(params: Omit<MCPTimeEvent, 'id' | 'timestamp'>): Promise<MCPTimeEvent> {
  const event: MCPTimeEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...params
  };
  
  try {
    const existingEvents = JSON.parse(localStorage.getItem('mcp_events') || '[]');
    const updatedEvents = [...existingEvents, event];
    localStorage.setItem('mcp_events', JSON.stringify(updatedEvents));
  } catch (error) {
    console.warn('Could not store event in localStorage:', error);
  }
  
  return event;
}

// 통합 MCP 클라이언트 인터페이스
export interface MCPClient {
  memory: {
    createEntities: (entities: MCPEntity[]) => Promise<void>;
    addObservations: (observations: MCPObservation[]) => Promise<void>;
    searchNodes: (query: string) => Promise<MCPEntity[]>;
    createRelations: (relations: MCPRelation[]) => Promise<void>;
  };
  fetch: {
    request: (params: MCPFetchRequest) => Promise<MCPFetchResponse>;
  };
  time: {
    schedule: (schedule: MCPTimeSchedule) => Promise<void>;
    getCurrentTime: () => Promise<string>;
    createEvent: (event: Omit<MCPTimeEvent, 'id' | 'timestamp'>) => Promise<MCPTimeEvent>;
  };
}

// MCP 클라이언트 싱글톤
class MCPClientImpl implements MCPClient {
  memory = {
    createEntities: mcp__memory__create_entities,
    addObservations: mcp__memory__add_observations,
    searchNodes: mcp__memory__search_nodes,
    createRelations: mcp__memory__create_relations
  };
  
  fetch = {
    request: mcp__fetch__request
  };
  
  time = {
    schedule: mcp__time__schedule,
    getCurrentTime: mcp__time__get_current_time,
    createEvent: mcp__time__create_event
  };
}

export const mcpClient = new MCPClientImpl();

// 편의 함수들
export function createMCPEntity(name: string, type: string, observations: string[]): MCPEntity {
  return {
    name,
    entityType: type,
    observations
  };
}

export function createMCPRelation(from: string, to: string, relationType: string): MCPRelation {
  return {
    from,
    to,
    relationType
  };
}

export function createMCPObservation(entityName: string, contents: string[]): MCPObservation {
  return {
    entityName,
    contents
  };
}