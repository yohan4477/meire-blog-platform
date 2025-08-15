import { NextRequest, NextResponse } from 'next/server';
import { getMerryInsightAI, CausalChain } from '@/lib/merry-insight-ai';
import { query } from '@/lib/database';

/**
 * 메르 논리체인 분석 API
 * GET: 기존 분석 결과 조회
 * POST: 새로운 포스트 분석
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const limit = parseInt(searchParams.get('limit') || '10');

    const merryAI = getMerryInsightAI();
    const chains = await merryAI.getCausalChains(
      postId ? parseInt(postId) : undefined, 
      limit
    );

    return NextResponse.json({
      success: true,
      data: {
        chains,
        total: chains.length,
        message: `${chains.length}개의 논리체인을 찾았습니다.`
      }
    });

  } catch (error) {
    console.error('논리체인 조회 실패:', error);
    return NextResponse.json({
      success: false,
      error: '논리체인 조회에 실패했습니다.'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, forceReAnalysis = false } = body;

    if (!postId) {
      return NextResponse.json({
        success: false,
        error: 'postId가 필요합니다.'
      }, { status: 400 });
    }

    // 1. 포스트 정보 가져오기
    const posts = await query<{
      id: number;
      title: string;
      content: string;
      excerpt: string;
    }>('SELECT id, title, content, excerpt FROM blog_posts WHERE id = ?', [postId]);

    if (posts.length === 0) {
      return NextResponse.json({
        success: false,
        error: '포스트를 찾을 수 없습니다.'
      }, { status: 404 });
    }

    const post = posts[0];

    // 2. 기존 분석이 있는지 확인
    if (!forceReAnalysis) {
      const existingChains = await query<{id: number}>(
        'SELECT id FROM causal_chains WHERE source_post_id = ?', 
        [postId]
      );

      if (existingChains.length > 0) {
        return NextResponse.json({
          success: true,
          data: {
            message: '이미 분석된 포스트입니다.',
            existing: true,
            chainCount: existingChains.length
          }
        });
      }
    }

    // 3. 논리체인 추출 실행
    console.log(`🧠 [API] 포스트 ${postId} 논리체인 분석 시작`);
    
    const merryAI = getMerryInsightAI();
    const causalChain = await merryAI.extractCausalChain(
      postId, 
      post.content || post.excerpt, 
      post.title
    );

    if (!causalChain) {
      return NextResponse.json({
        success: false,
        error: '이 포스트에서 의미있는 논리체인을 찾을 수 없습니다.',
        data: {
          analyzed: true,
          chainFound: false
        }
      });
    }

    console.log(`✅ [API] 포스트 ${postId} 논리체인 분석 완료`);

    return NextResponse.json({
      success: true,
      data: {
        chain: causalChain,
        message: `논리체인 추출 완료: ${causalChain.steps.length}단계, 신뢰도 ${causalChain.confidence_score}`,
        analyzed: true,
        chainFound: true
      }
    });

  } catch (error) {
    console.error('논리체인 분석 실패:', error);
    return NextResponse.json({
      success: false,
      error: '논리체인 분석에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PUT: 논리체인 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, updates } = body;

    if (!chainId || !updates) {
      return NextResponse.json({
        success: false,
        error: 'chainId와 updates가 필요합니다.'
      }, { status: 400 });
    }

    // 허용된 업데이트 필드들
    const allowedFields = ['confidence_score', 'prediction_horizon', 'investment_thesis'];
    const updateFields = [];
    const updateValues = [];

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        updateFields.push(`${field} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: '업데이트할 유효한 필드가 없습니다.'
      }, { status: 400 });
    }

    updateValues.push(chainId);

    await query(
      `UPDATE causal_chains SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: {
        message: '논리체인이 업데이트되었습니다.',
        updatedFields: Object.keys(updates).filter(f => allowedFields.includes(f))
      }
    });

  } catch (error) {
    console.error('논리체인 업데이트 실패:', error);
    return NextResponse.json({
      success: false,
      error: '논리체인 업데이트에 실패했습니다.'
    }, { status: 500 });
  }
}

// DELETE: 논리체인 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');

    if (!chainId) {
      return NextResponse.json({
        success: false,
        error: 'chainId가 필요합니다.'
      }, { status: 400 });
    }

    // CASCADE 삭제로 관련 단계와 연관성도 자동 삭제됨
    const result = await query(
      'DELETE FROM causal_chains WHERE id = ?',
      [parseInt(chainId)]
    );

    return NextResponse.json({
      success: true,
      data: {
        message: '논리체인이 삭제되었습니다.',
        deletedChainId: chainId
      }
    });

  } catch (error) {
    console.error('논리체인 삭제 실패:', error);
    return NextResponse.json({
      success: false,
      error: '논리체인 삭제에 실패했습니다.'
    }, { status: 500 });
  }
}