/**
 * 🎯 각 종목별 회사 설명 태그를 stocks DB에 자동 생성 및 저장
 * 메르가 언급한 종목들에 대한 상세한 회사 설명과 태그 추가
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class CompanyDescriptionUpdater {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
    
    // DB 잠금 타임아웃 설정
    this.db.configure("busyTimeout", 30000); // 30초 대기
  }

  async updateAllCompanyDescriptions() {
    console.log('🏢 모든 종목의 회사 설명 및 태그 업데이트 시작...');
    
    // 메르가 언급한 모든 종목 가져오기
    const mentionedStocks = await this.getMentionedStocks();
    console.log(`📊 메르 언급 종목 ${mentionedStocks.length}개 발견`);
    
    for (const stock of mentionedStocks) {
      console.log(`\n🔍 ${stock.ticker} (${stock.company_name}) 업데이트 중...`);
      
      const companyInfo = this.getCompanyInfo(stock.ticker, stock.company_name);
      
      await this.updateStockInfo(stock.ticker, companyInfo);
      console.log(`  ✅ ${stock.ticker} 업데이트 완료: ${companyInfo.description.substring(0, 50)}...`);
    }
    
    console.log('\n✅ 모든 종목의 회사 설명 업데이트 완료');
    this.db.close();
  }

  async getMentionedStocks() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT ticker, company_name, market, mention_count
        FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0
        ORDER BY mention_count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 종목별 상세한 회사 정보 생성
   */
  getCompanyInfo(ticker, companyName) {
    // 주요 종목들의 상세 정보
    const companyData = {
      // 한국 주요 종목
      '005930': {
        description: '글로벌 메모리 반도체 시장 1위 기업으로 DRAM, NAND 플래시, SSD 등 메모리 솔루션과 갤럭시 스마트폰, 디스플레이 패널을 제조하는 종합 전자기업. AI 반도체 슈퍼사이클의 핵심 수혜주로 HBM 메모리 분야에서 독점적 지위 확보',
        tags: ['반도체', '메모리', 'AI', 'HBM', '스마트폰', '디스플레이', '글로벌', '기술주']
      },

      // 미국 주요 종목들  
      'TSLA': {
        description: '일론 머스크가 이끄는 전기차와 자율주행 기술의 글로벌 선도기업으로 Model S/3/X/Y 라인업과 FSD 자율주행 소프트웨어, 에너지 저장 시스템을 통한 지속가능한 교통 혁신 추진',
        tags: ['전기차', '자율주행', 'FSD', '배터리', '일론머스크', '지속가능', '혁신', '모빌리티']
      },

      'NVDA': {
        description: 'AI 칩 시장 80% 이상 압도적 점유율을 보유한 AI 인프라의 절대강자로 H100, A100 GPU와 CUDA 소프트웨어 생태계를 통해 데이터센터 AI 컴퓨팅 시장을 독점하는 AI 혁명의 핵심 기업',
        tags: ['AI칩', 'GPU', 'CUDA', '데이터센터', 'H100', '머신러닝', '딥러닝', '반도체']
      },

      'AAPL': {
        description: '전 세계 20억개 이상 활성 기기를 보유한 애플 생태계의 창조자로 iPhone, Mac, iPad 등 프리미엄 하드웨어와 App Store, iCloud 등 서비스를 완벽 통합한 세계 최대 시가총액 기업',
        tags: ['아이폰', '애플생태계', 'iOS', '프리미엄', '서비스', '팀쿡', '혁신', '브랜드']
      },

      'GOOGL': {
        description: '전 세계 검색 시장 90% 이상 점유율과 YouTube, Android, Chrome을 통한 디지털 생태계 지배력으로 광고 수익 모델을 기반으로 AI, 클라우드, 자율주행 등 미래 기술에 투자하는 알파벳',
        tags: ['검색엔진', '구글', '광고', 'YouTube', 'Android', 'AI', '클라우드', '알파벳']
      },

      'MSFT': {
        description: 'OpenAI 투자와 Copilot 통합을 통한 AI 생태계 선점으로 Azure 클라우드와 Office 365를 중심으로 기업용 소프트웨어 시장을 지배하며 구독 기반 안정적 성장을 지속하는 마이크로소프트',
        tags: ['마이크로소프트', 'Azure', 'Office365', 'AI', 'Copilot', '클라우드', '구독모델', '기업용']
      },

      'AMZN': {
        description: '전자상거래 시장의 선구자이자 AWS 클라우드 서비스 1위 사업자로 물류 네트워크와 Prime 생태계를 바탕으로 소매업을 혁신하고 클라우드 인프라로 높은 수익성을 창출하는 아마존',
        tags: ['아마존', '전자상거래', 'AWS', '클라우드', 'Prime', '물류', '베조스', '혁신']
      },

      'META': {
        description: 'Facebook, Instagram, WhatsApp으로 전 세계 30억 명 이상이 사용하는 소셜 미디어 플랫폼을 운영하며 메타버스와 VR/AR 기술 투자를 통해 차세대 소셜 플랫폼 구축을 추진하는 메타',
        tags: ['메타', '페이스북', '인스타그램', '소셜미디어', '메타버스', 'VR', 'AR', '광고']
      },

      'NFLX': {
        description: '전 세계 2억 3천만 구독자를 보유한 스트리밍 서비스 1위 업체로 오리지널 콘텐츠 제작과 글로벌 배급을 통해 엔터테인먼트 산업을 디지털 전환시킨 넷플릭스',
        tags: ['넷플릭스', '스트리밍', 'OTT', '콘텐츠', '구독', '오리지널', '엔터테인먼트', '미디어']
      }
    };

    // 기본 정보가 있으면 반환
    if (companyData[ticker]) {
      return companyData[ticker];
    }

    // 기본 정보가 없으면 시장과 이름 기반으로 생성
    const isKorean = ticker.length === 6 && !isNaN(Number(ticker));
    const market = this.getMarket(ticker);
    
    return {
      description: `${companyName}은(는) ${market} 시장에 상장된 기업으로 메르의 투자 블로그에서 ${isKorean ? '국내' : '해외'} 투자 종목으로 언급되었습니다. 해당 기업의 사업 모델과 성장 전망에 대한 분석을 통해 투자 가치를 평가하고 있습니다.`,
      tags: [
        isKorean ? '국내기업' : '해외기업',
        market,
        '투자종목',
        '메르언급',
        '성장성',
        '투자분석'
      ]
    };
  }

  getMarket(ticker) {
    if (ticker.length === 6 && !isNaN(Number(ticker))) {
      return 'KOSPI/KOSDAQ';
    } else {
      return 'NASDAQ/NYSE';
    }
  }

  async updateStockInfo(ticker, companyInfo) {
    return new Promise((resolve, reject) => {
      const tagsJson = JSON.stringify(companyInfo.tags);
      
      this.db.run(`
        UPDATE stocks 
        SET 
          description = ?,
          tags = ?,
          updated_at = datetime('now')
        WHERE ticker = ?
      `, [
        companyInfo.description,
        tagsJson,
        ticker
      ], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }
}

// 실행
const updater = new CompanyDescriptionUpdater();
updater.updateAllCompanyDescriptions().catch(console.error);