import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const debugData = await request.json();
    
    console.log('🎯 CHART DEBUG 정보:');
    console.log('==================');
    console.log('Ticker:', debugData.ticker);
    console.log('Total Points:', debugData.totalPoints);
    console.log('Markers With Data:', debugData.markersWithData);
    console.log('Marker Dates:', debugData.markerDates);
    console.log('Show Markers:', debugData.showMarkers);
    console.log('Sample Point (2025-05-29 or first):', debugData.samplePoint);
    console.log('Posts By Date Keys:', debugData.postsByDateKeys);
    console.log('Sentiment Keys:', debugData.sentimentKeys);
    console.log('==================');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug API 오류:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}