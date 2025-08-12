import { query } from './database';
import { 
  Portfolio, 
  PortfolioHolding, 
  Transaction, 
  Stock, 
  StockPrice, 
  PortfolioPerformance,
  AIAnalysisReport,
  PortfolioRecommendation,
  NPSPerformance,
  CreatePortfolioRequest,
  AddHoldingRequest,
  AddTransactionRequest,
  PortfolioSummary,
  PortfolioDashboard
} from '@/types';

// ===== 포트폴리오 관리 =====

export async function createPortfolio(userId: number, data: CreatePortfolioRequest): Promise<Portfolio> {
  const sql = `
    INSERT INTO portfolios (user_id, name, description, investment_goal, target_amount, currency)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    userId,
    data.name,
    data.description || null,
    data.investment_goal,
    data.target_amount || null,
    data.currency || 'KRW'
  ]);
  
  return getPortfolio((result as any).insertId);
}

export async function getPortfolio(portfolioId: number): Promise<Portfolio> {
  const sql = `
    SELECT * FROM portfolios 
    WHERE id = ? AND is_active = TRUE
  `;
  
  const portfolios = await query<Portfolio>(sql, [portfolioId]);
  if (portfolios.length === 0) {
    throw new Error('Portfolio not found');
  }
  
  return portfolios[0];
}

export async function getUserPortfolios(userId: number): Promise<Portfolio[]> {
  const sql = `
    SELECT * FROM portfolios 
    WHERE user_id = ? AND is_active = TRUE
    ORDER BY created_at DESC
  `;
  
  return query<Portfolio>(sql, [userId]);
}

export async function updatePortfolio(portfolioId: number, data: Partial<Portfolio>): Promise<Portfolio> {
  const fields = [];
  const values = [];
  
  if (data.name) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.investment_goal) {
    fields.push('investment_goal = ?');
    values.push(data.investment_goal);
  }
  if (data.target_amount !== undefined) {
    fields.push('target_amount = ?');
    values.push(data.target_amount);
  }
  
  if (fields.length === 0) {
    return getPortfolio(portfolioId);
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(portfolioId);
  
  const sql = `UPDATE portfolios SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, values);
  
  return getPortfolio(portfolioId);
}

export async function deletePortfolio(portfolioId: number): Promise<void> {
  const sql = `UPDATE portfolios SET is_active = FALSE WHERE id = ?`;
  await query(sql, [portfolioId]);
}

// ===== 주식 관리 =====

export async function getOrCreateStock(symbol: string, stockData?: Partial<Stock>): Promise<Stock> {
  // 기존 주식 조회
  let stocks = await query<Stock>('SELECT * FROM stocks WHERE symbol = ? AND is_active = TRUE', [symbol]);
  
  if (stocks.length > 0) {
    return stocks[0];
  }
  
  // 새 주식 생성
  const sql = `
    INSERT INTO stocks (symbol, name, market, country, currency, sector, industry, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    symbol,
    stockData?.name || symbol,
    stockData?.market || 'UNKNOWN',
    stockData?.country || 'US',
    stockData?.currency || 'USD',
    stockData?.sector || null,
    stockData?.industry || null,
    stockData?.description || null
  ]);
  
  stocks = await query<Stock>('SELECT * FROM stocks WHERE id = ?', [(result as any).insertId]);
  return stocks[0];
}

export async function searchStocks(searchTerm: string, limit: number = 10): Promise<Stock[]> {
  const sql = `
    SELECT * FROM stocks 
    WHERE (symbol LIKE ? OR name LIKE ?) AND is_active = TRUE
    ORDER BY 
      CASE 
        WHEN symbol = ? THEN 1
        WHEN symbol LIKE ? THEN 2
        WHEN name LIKE ? THEN 3
        ELSE 4
      END,
      symbol
    LIMIT ?
  `;
  
  const searchPattern = `%${searchTerm}%`;
  return query<Stock>(sql, [
    searchPattern, searchPattern, 
    searchTerm, `${searchTerm}%`, `${searchTerm}%`,
    limit
  ]);
}

// ===== 포트폴리오 보유 종목 관리 =====

export async function addHolding(portfolioId: number, data: AddHoldingRequest): Promise<PortfolioHolding> {
  // 주식 정보 가져오기 또는 생성
  const stock = await getOrCreateStock(data.stock_symbol);
  
  // 기존 보유 종목 확인
  const existingHoldings = await query<PortfolioHolding>(
    'SELECT * FROM portfolio_holdings WHERE portfolio_id = ? AND stock_id = ?',
    [portfolioId, stock.id]
  );
  
  if (existingHoldings.length > 0) {
    // 기존 보유 종목 업데이트 (평균 매수가 계산)
    const existing = existingHoldings[0];
    const newTotalShares = existing.shares + data.shares;
    const newTotalCost = existing.total_cost + (data.shares * data.purchase_price);
    const newAvgPrice = newTotalCost / newTotalShares;
    
    const sql = `
      UPDATE portfolio_holdings 
      SET shares = ?, avg_purchase_price = ?, total_cost = ?, last_purchase_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await query(sql, [
      newTotalShares,
      newAvgPrice,
      newTotalCost,
      data.purchase_date,
      existing.id
    ]);
    
    return getHolding(existing.id);
  } else {
    // 새 보유 종목 추가
    const sql = `
      INSERT INTO portfolio_holdings 
      (portfolio_id, stock_id, shares, avg_purchase_price, total_cost, first_purchase_date, last_purchase_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const totalCost = data.shares * data.purchase_price;
    const result = await query(sql, [
      portfolioId,
      stock.id,
      data.shares,
      data.purchase_price,
      totalCost,
      data.purchase_date,
      data.purchase_date
    ]);
    
    return getHolding((result as any).insertId);
  }
}

export async function getHolding(holdingId: number): Promise<PortfolioHolding> {
  const sql = `
    SELECT 
      h.*,
      s.symbol, s.name, s.market, s.country, s.currency, s.sector, s.industry,
      sp.price as current_price,
      (h.shares * sp.price) as current_value,
      ((h.shares * sp.price) - h.total_cost) as gain_loss,
      (((h.shares * sp.price) - h.total_cost) / h.total_cost * 100) as gain_loss_percent
    FROM portfolio_holdings h
    JOIN stocks s ON h.stock_id = s.id
    LEFT JOIN stock_prices sp ON s.id = sp.stock_id AND sp.price_date = CURDATE()
    WHERE h.id = ?
  `;
  
  const holdings = await query<any>(sql, [holdingId]);
  if (holdings.length === 0) {
    throw new Error('Holding not found');
  }
  
  const holding = holdings[0];
  return {
    id: holding.id,
    portfolio_id: holding.portfolio_id,
    stock_id: holding.stock_id,
    stock: {
      id: holding.stock_id,
      symbol: holding.symbol,
      name: holding.name,
      market: holding.market,
      country: holding.country,
      currency: holding.currency,
      sector: holding.sector,
      industry: holding.industry,
      is_active: true
    },
    shares: holding.shares,
    avg_purchase_price: holding.avg_purchase_price,
    total_cost: holding.total_cost,
    current_price: holding.current_price,
    current_value: holding.current_value,
    gain_loss: holding.gain_loss,
    gain_loss_percent: holding.gain_loss_percent,
    first_purchase_date: holding.first_purchase_date,
    last_purchase_date: holding.last_purchase_date
  };
}

export async function getPortfolioHoldings(portfolioId: number): Promise<PortfolioHolding[]> {
  const sql = `
    SELECT 
      h.*,
      s.symbol, s.name, s.market, s.country, s.currency, s.sector, s.industry,
      sp.price as current_price,
      (h.shares * sp.price) as current_value,
      ((h.shares * sp.price) - h.total_cost) as gain_loss,
      (((h.shares * sp.price) - h.total_cost) / h.total_cost * 100) as gain_loss_percent
    FROM portfolio_holdings h
    JOIN stocks s ON h.stock_id = s.id
    LEFT JOIN stock_prices sp ON s.id = sp.stock_id AND sp.price_date = CURDATE()
    WHERE h.portfolio_id = ?
    ORDER BY h.total_cost DESC
  `;
  
  const results = await query<any>(sql, [portfolioId]);
  
  return results.map(holding => ({
    id: holding.id,
    portfolio_id: holding.portfolio_id,
    stock_id: holding.stock_id,
    stock: {
      id: holding.stock_id,
      symbol: holding.symbol,
      name: holding.name,
      market: holding.market,
      country: holding.country,
      currency: holding.currency,
      sector: holding.sector,
      industry: holding.industry,
      is_active: true
    },
    shares: holding.shares,
    avg_purchase_price: holding.avg_purchase_price,
    total_cost: holding.total_cost,
    current_price: holding.current_price,
    current_value: holding.current_value,
    gain_loss: holding.gain_loss,
    gain_loss_percent: holding.gain_loss_percent,
    first_purchase_date: holding.first_purchase_date,
    last_purchase_date: holding.last_purchase_date
  }));
}

// ===== 거래 내역 관리 =====

export async function addTransaction(portfolioId: number, data: AddTransactionRequest): Promise<Transaction> {
  const stock = await getOrCreateStock(data.stock_symbol);
  
  const sql = `
    INSERT INTO transactions 
    (portfolio_id, stock_id, transaction_type, shares, price, total_amount, commission, notes, transaction_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const totalAmount = data.shares * data.price;
  const result = await query(sql, [
    portfolioId,
    stock.id,
    data.transaction_type,
    data.shares,
    data.price,
    totalAmount,
    data.commission || 0,
    data.notes || null,
    data.transaction_date
  ]);
  
  // 포트폴리오 보유 종목 업데이트
  if (data.transaction_type === 'buy') {
    await addHolding(portfolioId, {
      stock_symbol: data.stock_symbol,
      shares: data.shares,
      purchase_price: data.price,
      purchase_date: data.transaction_date,
      notes: data.notes
    });
  } else {
    // 매도의 경우 보유 수량 감소 로직 구현
    await updateHoldingAfterSale(portfolioId, stock.id, data.shares);
  }
  
  return getTransaction((result as any).insertId);
}

async function updateHoldingAfterSale(portfolioId: number, stockId: number, soldShares: number): Promise<void> {
  const holdings = await query<PortfolioHolding>(
    'SELECT * FROM portfolio_holdings WHERE portfolio_id = ? AND stock_id = ?',
    [portfolioId, stockId]
  );
  
  if (holdings.length === 0) {
    throw new Error('Cannot sell stock not in portfolio');
  }
  
  const holding = holdings[0];
  if (holding.shares < soldShares) {
    throw new Error('Cannot sell more shares than owned');
  }
  
  const newShares = holding.shares - soldShares;
  if (newShares === 0) {
    // 전량 매도시 보유 종목 삭제
    await query('DELETE FROM portfolio_holdings WHERE id = ?', [holding.id]);
  } else {
    // 부분 매도시 수량과 총 비용 업데이트
    const newTotalCost = (holding.total_cost / holding.shares) * newShares;
    await query(
      'UPDATE portfolio_holdings SET shares = ?, total_cost = ? WHERE id = ?',
      [newShares, newTotalCost, holding.id]
    );
  }
}

export async function getTransaction(transactionId: number): Promise<Transaction> {
  const sql = `
    SELECT 
      t.*,
      s.symbol, s.name, s.market, s.country, s.currency, s.sector, s.industry
    FROM transactions t
    JOIN stocks s ON t.stock_id = s.id
    WHERE t.id = ?
  `;
  
  const transactions = await query<any>(sql, [transactionId]);
  if (transactions.length === 0) {
    throw new Error('Transaction not found');
  }
  
  const transaction = transactions[0];
  return {
    id: transaction.id,
    portfolio_id: transaction.portfolio_id,
    stock_id: transaction.stock_id,
    stock: {
      id: transaction.stock_id,
      symbol: transaction.symbol,
      name: transaction.name,
      market: transaction.market,
      country: transaction.country,
      currency: transaction.currency,
      sector: transaction.sector,
      industry: transaction.industry,
      is_active: true
    },
    transaction_type: transaction.transaction_type,
    shares: transaction.shares,
    price: transaction.price,
    total_amount: transaction.total_amount,
    commission: transaction.commission,
    notes: transaction.notes,
    transaction_date: transaction.transaction_date,
    created_at: transaction.created_at
  };
}

export async function getPortfolioTransactions(portfolioId: number, limit: number = 50): Promise<Transaction[]> {
  const sql = `
    SELECT 
      t.*,
      s.symbol, s.name, s.market, s.country, s.currency, s.sector, s.industry
    FROM transactions t
    JOIN stocks s ON t.stock_id = s.id
    WHERE t.portfolio_id = ?
    ORDER BY t.transaction_date DESC, t.created_at DESC
    LIMIT ?
  `;
  
  const results = await query<any>(sql, [portfolioId, limit]);
  
  return results.map(transaction => ({
    id: transaction.id,
    portfolio_id: transaction.portfolio_id,
    stock_id: transaction.stock_id,
    stock: {
      id: transaction.stock_id,
      symbol: transaction.symbol,
      name: transaction.name,
      market: transaction.market,
      country: transaction.country,
      currency: transaction.currency,
      sector: transaction.sector,
      industry: transaction.industry,
      is_active: true
    },
    transaction_type: transaction.transaction_type,
    shares: transaction.shares,
    price: transaction.price,
    total_amount: transaction.total_amount,
    commission: transaction.commission,
    notes: transaction.notes,
    transaction_date: transaction.transaction_date,
    created_at: transaction.created_at
  }));
}

// ===== 주가 데이터 관리 =====

export async function updateStockPrice(stockId: number, priceData: Partial<StockPrice>): Promise<StockPrice> {
  const sql = `
    INSERT INTO stock_prices 
    (stock_id, price, open_price, high_price, low_price, volume, change_amount, change_percent, market_cap, price_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    price = VALUES(price),
    open_price = VALUES(open_price),
    high_price = VALUES(high_price),
    low_price = VALUES(low_price),
    volume = VALUES(volume),
    change_amount = VALUES(change_amount),
    change_percent = VALUES(change_percent),
    market_cap = VALUES(market_cap),
    updated_at = CURRENT_TIMESTAMP
  `;
  
  await query(sql, [
    stockId,
    priceData.price || 0,
    priceData.open_price || null,
    priceData.high_price || null,
    priceData.low_price || null,
    priceData.volume || null,
    priceData.change_amount || null,
    priceData.change_percent || null,
    priceData.market_cap || null,
    priceData.price_date || new Date().toISOString().split('T')[0]
  ]);
  
  const prices = await query<StockPrice>(
    'SELECT * FROM stock_prices WHERE stock_id = ? AND price_date = ?',
    [stockId, priceData.price_date || new Date().toISOString().split('T')[0]]
  );
  
  return prices[0];
}

export async function getStockPrices(stockIds: number[], date?: string): Promise<StockPrice[]> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const placeholders = stockIds.map(() => '?').join(',');
  
  const sql = `
    SELECT * FROM stock_prices 
    WHERE stock_id IN (${placeholders}) AND price_date = ?
    ORDER BY stock_id
  `;
  
  return query<StockPrice>(sql, [...stockIds, targetDate]);
}

// ===== 포트폴리오 대시보드 =====

export async function getPortfolioDashboard(portfolioId: number): Promise<PortfolioDashboard> {
  const portfolio = await getPortfolio(portfolioId);
  const holdings = await getPortfolioHoldings(portfolioId);
  const transactions = await getPortfolioTransactions(portfolioId, 10);
  
  // 포트폴리오 요약 계산
  const totalValue = holdings.reduce((sum, h) => sum + (h.current_value || h.total_cost), 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.total_cost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalReturnPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  
  const summary: PortfolioSummary = {
    portfolio,
    total_value: totalValue,
    total_cost: totalCost,
    total_gain_loss: totalGainLoss,
    total_return_percent: totalReturnPercent,
    daily_change: 0, // TODO: 계산 로직 구현
    daily_change_percent: 0, // TODO: 계산 로직 구현
    cash_balance: 0, // TODO: 현금 잔고 관리
    holdings_count: holdings.length,
    last_updated: new Date().toISOString()
  };
  
  // 섹터별 분산도 계산
  const sectorAllocation = calculateSectorAllocation(holdings, totalValue);
  
  // 성과 차트 데이터 (임시)
  const performanceChart: any[] = [];
  
  // AI 추천 조회 (임시)
  const aiRecommendations: PortfolioRecommendation[] = [];
  
  // 국민연금 비교 데이터
  const npsComparison = await getNPSPerformanceData();
  
  return {
    summary,
    holdings,
    recent_transactions: transactions,
    performance_chart: performanceChart,
    sector_allocation: sectorAllocation,
    ai_recommendations: aiRecommendations,
    nps_comparison: npsComparison
  };
}

function calculateSectorAllocation(holdings: PortfolioHolding[], totalValue: number) {
  const sectorMap = new Map<string, { value: number; percentage: number }>();
  
  holdings.forEach(holding => {
    const sector = holding.stock.sector || 'Unknown';
    const value = holding.current_value || holding.total_cost;
    const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
    
    if (sectorMap.has(sector)) {
      const existing = sectorMap.get(sector)!;
      sectorMap.set(sector, {
        value: existing.value + value,
        percentage: existing.percentage + percentage
      });
    } else {
      sectorMap.set(sector, { value, percentage });
    }
  });
  
  return Array.from(sectorMap.entries()).map(([sector, data]) => ({
    sector,
    percentage: data.percentage,
    value: data.value
  }));
}

// ===== 국민연금 성과 데이터 =====

export async function getNPSPerformanceData(): Promise<NPSPerformance[]> {
  const sql = `
    SELECT * FROM nps_performance 
    WHERE data_date = (SELECT MAX(data_date) FROM nps_performance)
    ORDER BY fund_type
  `;
  
  return query<NPSPerformance>(sql);
}

export async function updateNPSPerformanceData(data: Omit<NPSPerformance, 'id'>): Promise<void> {
  const sql = `
    INSERT INTO nps_performance 
    (fund_type, return_1m, return_3m, return_6m, return_1y, return_3y, return_5y, return_since_inception, aum, data_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    return_1m = VALUES(return_1m),
    return_3m = VALUES(return_3m),
    return_6m = VALUES(return_6m),
    return_1y = VALUES(return_1y),
    return_3y = VALUES(return_3y),
    return_5y = VALUES(return_5y),
    return_since_inception = VALUES(return_since_inception),
    aum = VALUES(aum)
  `;
  
  await query(sql, [
    data.fund_type,
    data.return_1m,
    data.return_3m,
    data.return_6m,
    data.return_1y,
    data.return_3y,
    data.return_5y,
    data.return_since_inception,
    data.aum,
    data.data_date
  ]);
}