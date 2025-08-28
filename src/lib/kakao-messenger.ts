/**
 * 카카오톡 메시지 전송 라이브러리
 * 메르 포스트 분석 결과를 카카오톡으로 자동 전송
 */

interface AnalysisResult {
  title: string;
  comment: string;
  insight: string;
  stocks: string[];
  date: string;
  postUrl: string;
}

interface KakaoMessageTemplate {
  object_type: string;
  text: string;
  link?: {
    web_url?: string;
    mobile_web_url?: string;
  };
  button_title?: string;
}

export class KakaoMessenger {
  private accessToken: string;
  private apiUrl = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * 분석 결과를 카카오톡 메시지로 전송
   */
  async sendAnalysisResult(result: AnalysisResult): Promise<boolean> {
    try {
      const message = this.formatAnalysisMessage(result);
      const response = await this.sendMessage(message);
      
      if (response.ok) {
        console.log('✅ 카카오톡 메시지 전송 완료');
        return true;
      } else {
        console.error('❌ 카카오톡 메시지 전송 실패:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ 카카오톡 메시지 전송 오류:', error);
      return false;
    }
  }

  /**
   * 분석 결과를 카카오톡 메시지 형식으로 포맷팅
   */
  private formatAnalysisMessage(result: AnalysisResult): KakaoMessageTemplate {
    const messageText = `🎯 메르 포스트 분석 완료!

📝 ${result.title}

💭 메르님 한줄 코멘트:
${result.comment}

📊 언급 종목: ${result.stocks.join(', ')}

💡 투자 인사이트:
${result.insight}

📅 분석 시간: ${new Date(result.date).toLocaleString('ko-KR')}`;

    return {
      object_type: 'text',
      text: messageText,
      link: {
        web_url: result.postUrl,
        mobile_web_url: result.postUrl
      },
      button_title: '포스트 보기'
    };
  }

  /**
   * 카카오톡 메시지 API 호출
   */
  private async sendMessage(template: KakaoMessageTemplate): Promise<Response> {
    const formData = new URLSearchParams();
    formData.append('template_object', JSON.stringify(template));

    return fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    });
  }

  /**
   * 간단한 텍스트 메시지 전송
   */
  async sendSimpleMessage(text: string): Promise<boolean> {
    try {
      const template: KakaoMessageTemplate = {
        object_type: 'text',
        text: text
      };

      const response = await this.sendMessage(template);
      
      if (response.ok) {
        console.log('✅ 카카오톡 간단 메시지 전송 완료');
        return true;
      } else {
        console.error('❌ 카카오톡 메시지 전송 실패:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ 카카오톡 메시지 전송 오류:', error);
      return false;
    }
  }

  /**
   * 주식 가격 알림 메시지 전송
   */
  async sendStockAlert(ticker: string, currentPrice: number, changePercent: number): Promise<boolean> {
    const emoji = changePercent >= 0 ? '📈' : '📉';
    const text = `${emoji} ${ticker} 주가 알림

현재가: ${currentPrice.toLocaleString()}원
등락률: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%

📱 메르 블로그에서 자세한 분석을 확인해보세요!`;

    return this.sendSimpleMessage(text);
  }
}

export default KakaoMessenger;