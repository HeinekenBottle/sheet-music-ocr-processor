// Enhanced Pre-Trade Checklist with Advanced Probability Calculation
function showEnhancedPreTradeChecklist() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 10px;
            max-width: 400px;
            margin: 0 auto;
          }
          .checklist-title {
            text-align: center;
            font-weight: bold;
            margin: 5px 0 15px 0;
            color: #4285f4;
            font-size: 16px;
          }
          .form-row {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
          }
          .form-column {
            flex: 1;
          }
          .checklist-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
          }
          .checklist-item input[type="checkbox"] {
            margin-right: 8px;
            transform: scale(1.3);
          }
          .checklist-item label {
            flex: 1;
            font-size: 14px;
          }
          .required {
            font-weight: bold;
            color: #c00;
          }
          .key-point {
            font-weight: bold;
          }
          .grouping {
            margin-top: 12px;
            border-top: 1px solid #eee;
            padding-top: 8px;
          }
          .grouping-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: #555;
          }
          .trading-buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
          }
          .go-button {
            background-color: #0f9d58;
            color: white;
            padding: 10px 0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            width: 48%;
            font-size: 16px;
          }
          .no-go-button {
            background-color: #db4437;
            color: white;
            padding: 10px 0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            width: 48%;
            font-size: 16px;
          }
          .timestamp {
            text-align: center;
            font-size: 12px;
            color: #777;
            margin-top: 15px;
          }
          .decision-status {
            text-align: center;
            margin: 15px auto 10px auto;
            padding: 10px;
            border-radius: 5px;
            font-weight: bold;
            display: none;
          }
          .go-status {
            background-color: #d9ead3;
            color: #0f9d58;
          }
          .no-go-status {
            background-color: #f4cccc;
            color: #db4437;
          }
          .shortcut-tip {
            font-size: 11px;
            color: #666;
            font-style: italic;
            margin-left: 8px;
          }
          
          /* Success Probability Indicator CSS */
          .success-probability {
            margin: 15px 0;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
          }
          .probability-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
          }
          .probability-title {
            font-weight: bold;
            color: #555;
            font-size: 14px;
          }
          .probability-value {
            font-weight: bold;
            font-size: 18px;
            color: #4285f4;
          }
          .probability-meter {
            height: 10px;
            background-color: #e0e0e0;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 8px;
          }
          .probability-fill {
            height: 100%;
            width: 0%;
            background-color: #4285f4;
            transition: width 0.5s ease, background-color 0.5s ease;
          }
          .probability-factors {
            font-size: 12px;
            color: #555;
            margin-top: 5px;
          }
          .top-factor, .concern {
            margin: 2px 0;
          }
          .top-factor {
            color: #0f9d58;
          }
          .concern {
            color: #ea4335;
          }
          /* Context factors section */
          .context-factors {
            border-top: 1px solid #eee;
            padding-top: 10px;
            margin-top: 10px;
          }
          .context-factor-label {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 5px;
          }
          .context-selectors {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
          }
          .context-selectors select {
            flex: 1;
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #ddd;
          }
          .streak-indicator {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 5px;
          }
          .streak-positive {
            background-color: #d9ead3;
          }
          .streak-negative {
            background-color: #f4cccc;
          }
        </style>
      </head>
      <body>
        <div class="checklist-title">PRE-TRADE QUICK CHECKLIST</div>
        
        <div class="form-row">
          <div class="form-column">
            <label for="model-type" style="display: block; margin-bottom: 5px; font-weight: bold;">Model Type:</label>
            <select id="model-type" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;" onchange="updateProbabilityDisplay()">
              <option value="">Select Model...</option>
              <option value="FVG-RD">FVG-RD</option>
              <option value="RD-Cont">RD-Cont</option>
            </select>
          </div>
          
          <div class="form-column">
            <label for="setup-type" style="display: block; margin-bottom: 5px; font-weight: bold;">Setup Type:</label>
            <select id="setup-type" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;" onchange="updateProbabilityDisplay()">
              <option value="">Select Setup...</option>
              <option value="AM-FPFVG">AM-FPFVG</option>
              <option value="PM-FPFVG">PM-FPFVG</option>
              <option value="Strong-FVG">Strong-FVG</option>
              <option value="Top/Bottom-FVG">Top/Bottom-FVG</option>
              <option value="Asia-FPFVG">Asia-FPFVG</option>
              <option value="NWOG">NWOG</option>
              <option value="NDOG">NDOG</option>
              <option value="Old-NDOG">Old-NDOG</option>
              <option value="Macro-FVG">Macro-FVG</option>
              <option value="News-FVG">News-FVG</option>
              <option value="Prev-Day-H/L">Prev-Day-H/L</option>
            </select>
          </div>
        </div>
        
        <!-- Context Factors Section -->
        <div class="context-factors">
          <div class="context-factor-label">Market Context Factors:</div>
          <div class="context-selectors">
            <select id="liquidity-resistance" onchange="updateProbabilityDisplay()">
              <option value="low">Low Liquidity Resistance</option>
              <option value="moderate">Moderate Liquidity Resistance</option>
              <option value="high">High Liquidity Resistance</option>
            </select>
            <select id="price-clarity" onchange="updateProbabilityDisplay()">
              <option value="clear">Clear Price Action</option>
              <option value="mixed">Mixed Price Action</option>
              <option value="unclear">Unclear Price Action</option>
            </select>
          </div>
          
          <div class="context-factor-label">
            Trading Streak Context: 
            <span id="streak-status" class="streak-indicator">Unknown</span>
          </div>
          <div class="context-selectors">
            <select id="previous-result" onchange="updateProbabilityDisplay()">
              <option value="none">No Previous Trade</option>
              <option value="win">Previous Trade: Win</option>
              <option value="loss">Previous Trade: Loss</option>
              <option value="twoWins">Two Consecutive Wins</option>
              <option value="twoLosses">Two Consecutive Losses</option>
            </select>
            <select id="trade-count" onchange="updateProbabilityDisplay()">
              <option value="1">1st Trade Today</option>
              <option value="2">2nd Trade Today</option>
              <option value="3">3rd Trade Today</option>
              <option value="4">4th Trade Today</option>
              <option value="5+">5+ Trades Today</option>
            </select>
          </div>
        </div>
        
        <!-- Enhanced Success Probability Indicator -->
        <div class="success-probability">
          <div class="probability-header">
            <span class="probability-title">Trade Success Probability</span>
            <span class="probability-value" id="probability-value">--</span>
          </div>
          <div class="probability-meter">
            <div class="probability-fill" id="probability-gauge"></div>
          </div>
          <div class="probability-factors">
            <div class="top-factor"><span id="top-factor-icon">🔍</span> <span id="top-factor-value">Analyzing setup...</span></div>
            <div class="concern"><span id="concern-icon">⚠️</span> <span id="concern-value">Complete checklist items</span></div>
          </div>
        </div>
        
        <div class="grouping">
          <div class="grouping-title">SETUP VERIFICATION</div>
          <div class="checklist-item">
            <input type="checkbox" id="patternValid" class="required-check" onchange="updateProbabilityDisplay()">
            <label for="patternValid" class="required">Valid pattern structure confirmed</label>
          </div>
          <div class="checklist-item">
            <input type="checkbox" id="confluencePresent" onchange="updateProbabilityDisplay()">
            <label for="confluencePresent">Multiple confluence factors present</label>
          </div>
          <div class="checklist-item">
            <input type="checkbox" id="keyLevel" onchange="updateProbabilityDisplay()">
            <label for="keyLevel" class="key-point">Price at key FVG/liquidity level</label>
          </div>
        </div>
        
        <div class="grouping">
          <div class="grouping-title">RISK ASSESSMENT</div>
          <div class="checklist-item">
            <input type="checkbox" id="stopLossPlaced" class="required-check" onchange="updateProbabilityDisplay()">
            <label for="stopLossPlaced" class="required">Stop loss clearly defined</label>
          </div>
          <div class="checklist-item">
            <input type="checkbox" id="riskRatio" onchange="updateProbabilityDisplay()">
            <label for="riskRatio" class="key-point">Risk:Reward > 1:1.5</label>
          </div>
          <div class="checklist-item">
            <input type="checkbox" id="positionSize" class="required-check" onchange="updateProbabilityDisplay()">
            <label for="positionSize" class="required">Position size is appropriate</label>
          </div>
        </div>
        
        <div class="grouping">
          <div class="grouping-title">FINAL CHECKS</div>
          <div class="checklist-item">
            <input type="checkbox" id="newsCheck" onchange="updateProbabilityDisplay()">
            <label for="newsCheck">No conflicting news events</label>
          </div>
          <div class="checklist-item">
            <input type="checkbox" id="entryCandle" class="required-check" onchange="updateProbabilityDisplay()">
            <label for="entryCandle" class="required">Entry candle confirmation</label>
            <span class="shortcut-tip">⌘1</span>
          </div>
          <div class="checklist-item">
            <input type="checkbox" id="mentalState" onchange="updateProbabilityDisplay()">
            <label for="mentalState">Clear mental state for trading</label>
          </div>
        </div>
        
        <div id="decision" class="decision-status"></div>
        
        <div class="trading-buttons">
          <button id="no-go" class="no-go-button">NO-GO</button>
          <button id="go" class="go-button">GO</button>
        </div>
        
        <div class="timestamp" id="timestamp"></div>
        
        <script>
          // Update timestamp
          document.getElementById('timestamp').textContent = new Date().toLocaleTimeString();
          
          // Model performance data
          const modelPerformance = {
            "FVG-RD": { winRate: 0.8571, qualityImpact: 0.25, timeOfDayVariance: 0.10 },
            "RD-Cont": { winRate: 0.64, qualityImpact: 0.20, timeOfDayVariance: 0.08 }
          };
          
          // Setup type performance data
          const setupPerformance = {
            "AM-FPFVG": { winRate: 0.65, qualityImpact: 0.14, timeOfDayVariance: 0.12 },
            "PM-FPFVG": { winRate: 0.59, qualityImpact: 0.13, timeOfDayVariance: 0.10 },
            "Strong-FVG": { winRate: 0.54, qualityImpact: 0.10, timeOfDayVariance: 0.05 },
            "Top/Bottom-FVG": { winRate: 0.48, qualityImpact: 0.18, timeOfDayVariance: 0.07 },
            "Asia-FPFVG": { winRate: 0.56, qualityImpact: 0.11, timeOfDayVariance: 0.15 },
            "NWOG": { winRate: 0.60, qualityImpact: 0.12, timeOfDayVariance: 0.08 },
            "NDOG": { winRate: 0.58, qualityImpact: 0.11, timeOfDayVariance: 0.07 },
            "Old-NDOG": { winRate: 0.52, qualityImpact: 0.10, timeOfDayVariance: 0.06 },
            "Macro-FVG": { winRate: 0.55, qualityImpact: 0.09, timeOfDayVariance: 0.08 },
            "News-FVG": { winRate: 0.53, qualityImpact: 0.10, timeOfDayVariance: 0.09 },
            "Prev-Day-H/L": { winRate: 0.58, qualityImpact: 0.12, timeOfDayVariance: 0.07 }
          };

          // Default values if not specified
          const defaultModel = { winRate: 0.58, qualityImpact: 0.12, timeOfDayVariance: 0.07 };
          const defaultSetup = { winRate: 0.52, qualityImpact: 0.10, timeOfDayVariance: 0.08 };

          // Time of day performance (24-hour format)
          const timePerformance = {
            9: 0.10,  // Market open boost
            10: 0.05, // Still good
            11: 0.00, // Neutral
            12: -0.02, // Lunch hour dip
            13: -0.01, // Still lunch
            14: 0.03, // Afternoon picking up
            15: 0.08, // Power hour boost
            16: -0.05 // Late day caution
          };
          
          // Day of week performance (0=Sunday, 1=Monday, etc.)
          const dayPerformance = {
            0: -0.10, // Sunday (closed market)
            1: 0.05,  // Monday
            2: 0.10,  // Tuesday (best day)
            3: 0.02,  // Wednesday
            4: 0.03,  // Thursday
            5: -0.01, // Friday
            6: -0.10  // Saturday (closed market)
          };

          // Session-specific model adjustments
          const sessionPerformance = {
            "RD-Cont": {
              "MOC": 0.15,        // Best for RD-Cont
              "Lunch Macro": 0.05,
              "NY Open": 0.08
            },
            "FVG-RD": {
              "Lunch Macro": 0.12, // Best for FVG-RD
              "MOC": 0.05,
              "NY Open": 0.03
            }
          };
          
          // Streak context impact (from psychological metrics)
          const streakImpact = {
            "win": -0.05,        // Slight negative after win (-5%)
            "loss": 0.15,        // Major positive after loss (+15%)
            "twoWins": -0.10,    // Significant negative after two wins (-10%)
            "twoLosses": -0.05   // Slight negative after two losses (too few samples) (-5%)
          };
          
          // Trade count per day impact
          const tradeCountImpact = {
            "1": 0.00,     // Neutral for first trade
            "2": 0.02,     // Slight boost for second
            "3": 0.05,     // Best performance on 3rd trade
            "4": 0.00,     // Neutral 
            "5+": -0.10    // Significant negative (overtrading risk)
          };
          
          // Context factor impacts
          const contextFactorImpact = {
            "liquidityResistance": {
              "low": 0.00,       // Default (no adjustment)
              "moderate": -0.05, // -5% for moderate resistance
              "high": -0.15      // -15% for high resistance
            },
            "priceClarity": {
              "clear": 0.00,     // Default (no adjustment)
              "mixed": -0.05,    // -5% for mixed clarity
              "unclear": -0.15   // -15% for unclear price action
            }
          };
          
          // Checklist item weights (in decimal) - unchanged
          const itemWeights = {
            // Setup verification
            "patternValid": { weight: 0.15, positive: true, critical: true },
            "confluencePresent": { weight: 0.10, positive: true },
            "keyLevel": { weight: 0.12, positive: true },
            
            // Risk assessment
            "stopLossPlaced": { weight: 0.18, positive: true, critical: true },
            "riskRatio": { weight: 0.12, positive: true },
            "positionSize": { weight: 0.10, positive: true, critical: true },
            
            // Final checks
            "newsCheck": { weight: 0.08, positive: true },
            "entryCandle": { weight: 0.15, positive: true, critical: true },
            "mentalState": { weight: 0.05, positive: true }
          };
          
          // ENHANCED: Calculate success probability incorporating all factors
          function calculateSuccessProbability() {
            // 1. Get the selected model and setup types
            const modelType = document.getElementById('model-type').value;
            const setupType = document.getElementById('setup-type').value;
            
            const model = modelPerformance[modelType] || defaultModel;
            const setup = setupPerformance[setupType] || defaultSetup;
            
            // 2. Start with combined baseline probability
            // If both are selected, combine them with a weighted average favoring the model
            let baseWinRate;
            if (modelType && setupType) {
              baseWinRate = (model.winRate * 0.6) + (setup.winRate * 0.4);
            } else if (modelType) {
              baseWinRate = model.winRate;
            } else if (setupType) {
              baseWinRate = setup.winRate;
            } else {
              // If neither selected, use a general average
              baseWinRate = 0.55;
            }
            
            let probability = baseWinRate * 100;
            
            // 3. Apply session and day adjustments with higher weight
            const currentHour = new Date().getHours();
            const currentDay = new Date().getDay(); // 0=Sunday through 6=Saturday
            
            // Time of day adjustment
            if (timePerformance[currentHour] !== undefined) {
              // Use the higher of the two time of day variance factors
              const timeVariance = Math.max(model.timeOfDayVariance || 0, setup.timeOfDayVariance || 0);
              const timeAdjustment = timePerformance[currentHour] * 100 * timeVariance * 10;
              probability += timeAdjustment;
            }
            
            // Day of week adjustment with 1.5x weight
            if (dayPerformance[currentDay] !== undefined) {
              probability += dayPerformance[currentDay] * 100;
            }
            
            // Session-specific model adjustments
            if (modelType && sessionPerformance[modelType]) {
              let currentSession = '';
              if (currentHour >= 9 && currentHour < 10) currentSession = "NY Open";
              else if (currentHour >= 11 && currentHour < 13) currentSession = "Lunch Macro";
              else if (currentHour >= 15 && currentHour < 16) currentSession = "MOC";
              
              if (currentSession && sessionPerformance[modelType][currentSession]) {
                probability += sessionPerformance[modelType][currentSession] * 100;
              }
            }
            
            // 4. Apply pattern quality (if available)
            const qualityScore = getPatternQualityScore(modelType, setupType);
            if (qualityScore > 0) {
              // Use the better quality impact value between model and setup
              const qualityImpact = Math.max(model.qualityImpact || 0, setup.qualityImpact || 0);
              const qualityAdjustment = (qualityScore - 3.0) * (qualityImpact * 100);
              probability += qualityAdjustment;
            }
            
            // 5. NEW: Apply streak context from psychological metrics
            const streakContext = document.getElementById('previous-result').value;
            if (streakContext && streakContext !== 'none' && streakImpact[streakContext]) {
              probability += streakImpact[streakContext] * 100;
              
              // Update streak status indicator
              updateStreakStatus(streakContext);
            }
            
            // 6. NEW: Apply trade count context
            const tradeCount = document.getElementById('trade-count').value;
            if (tradeCount && tradeCountImpact[tradeCount]) {
              probability += tradeCountImpact[tradeCount] * 100;
            }
            
            // 7. NEW: Apply market context factors
            const liquidityResistance = document.getElementById('liquidity-resistance').value;
            if (liquidityResistance && contextFactorImpact.liquidityResistance[liquidityResistance]) {
              probability += contextFactorImpact.liquidityResistance[liquidityResistance] * 100;
            }
            
            const priceClarity = document.getElementById('price-clarity').value;
            if (priceClarity && contextFactorImpact.priceClarity[priceClarity]) {
              probability += contextFactorImpact.priceClarity[priceClarity] * 100;
            }
            
            // 8. Apply based on checked items
            const checkedItems = getCheckedItems();
            const uncheckedCriticalItems = [];
            const positiveFactors = [];
            
            // Process each checklist item
            Object.keys(itemWeights).forEach(item => {
              const itemDetails = itemWeights[item];
              
              if (checkedItems.includes(item)) {
                // Item is checked, add its positive weight
                probability += itemDetails.weight * 100;
                
                // Track as a positive factor if significant
                if (itemDetails.weight >= 0.10) {
                  positiveFactors.push({ 
                    id: item, 
                    impact: itemDetails.weight,
                    name: getItemName(item)
                  });
                }
              } else {
                // Item is not checked
                if (itemDetails.critical) {
                  // Critical item missing - significant penalty
                  probability -= itemDetails.weight * 150;
                  
                  // Track missing critical items
                  uncheckedCriticalItems.push({
                    id: item,
                    impact: itemDetails.weight * 1.5,
                    name: getItemName(item)
                  });
                } else {
                  // Regular item missing - normal negative weight
                  probability -= itemDetails.weight * 100;
                }
              }
            });
            
            // 9. Cap probability between 10% and 95%
            probability = Math.min(Math.max(probability, 10), 95);
            
            // 10. Return all calculated data
            return {
              probability: Math.round(probability),
              positiveFactors: positiveFactors.sort((a, b) => b.impact - a.impact),
              concerns: uncheckedCriticalItems.sort((a, b) => b.impact - a.impact),
              qualityScore: qualityScore
            };
          }
          
          // Update streak status indicator
          function updateStreakStatus(streakContext) {
            const streakElement = document.getElementById('streak-status');
            streakElement.textContent = '';
            streakElement.className = 'streak-indicator';
            
            switch(streakContext) {
              case 'win':
                streakElement.textContent = 'After Win (57% Win Rate)';
                streakElement.classList.add('streak-negative');
                break;
              case 'loss':
                streakElement.textContent = 'After Loss (100% Win Rate)';
                streakElement.classList.add('streak-positive');
                break;
              case 'twoWins':
                streakElement.textContent = 'After Two Wins (43% Win Rate)';
                streakElement.classList.add('streak-negative');
                break;
              case 'twoLosses':
                streakElement.textContent = 'After Two Losses (Limited Data)';
                break;
              default:
                streakElement.textContent = 'No Streak Context';
            }
          }

          // Function to get checked items - unchanged
          function getCheckedItems() {
            return Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
              .map(checkbox => checkbox.id);
          }

          // Function to get pattern quality score based on model and setup type - unchanged
          function getPatternQualityScore(modelType, setupType) {
            try {
              // Quality scores by model type
              const modelQualityMap = {
                "FVG-RD": 4.58,
                "RD-Cont": 3.7
              };
              
              // Quality scores by setup type
              const setupQualityMap = {
                "AM-FPFVG": 3.6, 
                "PM-FPFVG": 4.17,
                "Strong-FVG": 3.7,
                "Top/Bottom-FVG": 3.31,
                "Asia-FPFVG": 3.89,
                "NWOG": 4.58,
                "NDOG": 3.89,
                "Old-NDOG": 3.33,
                "Macro-FVG": 3.55,
                "News-FVG": 3.5,
                "Prev-Day-H/L": 3.6
              };
              
              // If both are specified, use a weighted average
              if (modelType && setupType) {
                const modelQuality = modelQualityMap[modelType] || 3.5;
                const setupQuality = setupQualityMap[setupType] || 3.5;
                return (modelQuality * 0.6) + (setupQuality * 0.4);
              } else if (modelType) {
                return modelQualityMap[modelType] || 3.5;
              } else if (setupType) {
                return setupQualityMap[setupType] || 3.5;
              }
              
              return 3.5; // Default if neither is specified
            } catch (e) {
              return 3.5; // Default quality score if we can't determine it
            }
          }

          // Function to get readable item name - unchanged
          function getItemName(itemId) {
            // Map item IDs to readable names
            const nameMap = {
              "patternValid": "Valid pattern structure",
              "confluencePresent": "Multiple confluence factors",
              "keyLevel": "Price at key level",
              "stopLossPlaced": "Stop loss defined",
              "riskRatio": "Favorable risk-reward ratio",
              "positionSize": "Appropriate position size",
              "newsCheck": "No conflicting news",
              "entryCandle": "Entry candle confirmation",
              "mentalState": "Clear mental state"
            };
            
            return nameMap[itemId] || itemId;
          }

          // Function to update the probability display
          function updateProbabilityDisplay() {
            const result = calculateSuccessProbability();
            const probability = result.probability;
            
            // Update value display
            const valueDisplay = document.getElementById('probability-value');
            valueDisplay.textContent = \`\${probability}%\`;
            
            // Update gauge
            const gauge = document.getElementById('probability-gauge');
            gauge.style.width = \`\${probability}%\`;
            
            // Color coding based on probability
            if (probability >= 70) {
              gauge.style.backgroundColor = '#0f9d58'; // Green for high probability
              valueDisplay.style.color = '#0f9d58';
            } else if (probability >= 50) {
              gauge.style.backgroundColor = '#fbbc04'; // Yellow for medium
              valueDisplay.style.color = '#fbbc04';
            } else {
              gauge.style.backgroundColor = '#ea4335'; // Red for low
              valueDisplay.style.color = '#ea4335';
            }
            
            // Update top factor and concern
            const topFactorElement = document.getElementById('top-factor-value');
            const concernElement = document.getElementById('concern-value');
            
            if (result.positiveFactors.length > 0) {
              const topFactor = result.positiveFactors[0];
              topFactorElement.textContent = topFactor.name;
              document.getElementById('top-factor-icon').textContent = '✅';
            } else {
              topFactorElement.textContent = 'No significant strengths identified';
              document.getElementById('top-factor-icon').textContent = '❓';
            }
            
            if (result.concerns.length > 0) {
              const topConcern = result.concerns[0];
              concernElement.textContent = \`Missing: \${topConcern.name}\`;
              document.getElementById('concern-icon').textContent = '⚠️';
            } else {
              if (probability < 60) {
                concernElement.textContent = 'Probability below 60%';
                document.getElementById('concern-icon').textContent = '🔍';
              } else {
                concernElement.textContent = 'No critical concerns';
                document.getElementById('concern-icon').textContent = '👍';
              }
            }
          }

          // Add event listeners to all checkboxes and selects to update probability
          document.querySelectorAll('input[type="checkbox"], select').forEach(element => {
            element.addEventListener('change', updateProbabilityDisplay);
          });

          // Initialize the probability display
          updateProbabilityDisplay();
          
          // Set up keyboard shortcuts
          document.addEventListener('keydown', function(e) {
            // CMD/CTRL + 1 for quick check of entry candle
            if ((e.metaKey || e.ctrlKey) && e.key === '1') {
              const checkbox = document.getElementById('entryCandle');
              checkbox.checked = !checkbox.checked;
              updateProbabilityDisplay();
              e.preventDefault();
            }
            // Enter key for GO button
            else if (e.key === 'Enter') {
              document.getElementById('go').click();
              e.preventDefault();
            }
            // Escape key for NO-GO
            else if (e.key === 'Escape') {
              document.getElementById('no-go').click();
              e.preventDefault();
            }
          });
          
          // GO button handler
          document.getElementById('go').addEventListener('click', function() {
            // Check required items
            const requiredChecks = document.querySelectorAll('.required-check');
            let allRequiredChecked = true;
            
            for (const check of requiredChecks) {
              if (!check.checked) {
                allRequiredChecked = false;
                check.parentElement.style.backgroundColor = '#ffebee';
                setTimeout(() => {
                  check.parentElement.style.backgroundColor = '';
                }, 2000);
              }
            }
            
            const decision = document.getElementById('decision');
            decision.style.display = 'block';
            
            if (allRequiredChecked) {
              decision.textContent = '✅ GO - ALL CHECKS PASSED';
              decision.className = 'decision-status go-status';
              
              // Log the successful check with probability
              const checkedItems = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.id);
              
              // Get the current probability
              const probability = document.getElementById('probability-value').textContent.replace('%', '');
              
              // Get the selected model and setup types for logging
              const modelType = document.getElementById('model-type').value;
              const setupType = document.getElementById('setup-type').value;
              
              // Include model and setup type in the checked items for logging
              const enhancedCheckedItems = [...checkedItems];
              if (modelType) enhancedCheckedItems.push('model:' + modelType);
              if (setupType) enhancedCheckedItems.push('setup:' + setupType);
              
              // Include context factors in logging
              const liquidity = document.getElementById('liquidity-resistance').value;
              const clarity = document.getElementById('price-clarity').value;
              const streak = document.getElementById('previous-result').value;
              const tradeCount = document.getElementById('trade-count').value;
              
              enhancedCheckedItems.push('liquidity:' + liquidity);
              enhancedCheckedItems.push('clarity:' + clarity);
              enhancedCheckedItems.push('streak:' + streak);
              enhancedCheckedItems.push('tradeCount:' + tradeCount);
              
              google.script.run.logTradeCheckWithProbability(true, enhancedCheckedItems, probability);
              
              // Auto-close after 1.5 seconds
              setTimeout(() => {
                google.script.host.close();
              }, 1500);
            } else {
              decision.textContent = '⚠️ REQUIRED CHECKS MISSING';
              decision.className = 'decision-status no-go-status';
            }
          });
          
          // NO-GO button handler
          document.getElementById('no-go').addEventListener('click', function() {
            const decision = document.getElementById('decision');
            decision.style.display = 'block';
            decision.textContent = '❌ NO-GO - TRADE CANCELED';
            decision.className = 'decision-status no-go-status';
            
            // Log the no-go decision with probability
            const checkedItems = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
              .map(cb => cb.id);
            
            // Get the current probability
            const probability = document.getElementById('probability-value').textContent.replace('%', '');
            
            // Get the selected model and setup types for logging
            const modelType = document.getElementById('model-type').value;
            const setupType = document.getElementById('setup-type').value;
            
            // Include model and setup type in the checked items for logging
            const enhancedCheckedItems = [...checkedItems];
            if (modelType) enhancedCheckedItems.push('model:' + modelType);
            if (setupType) enhancedCheckedItems.push('setup:' + setupType);
            
            // Include context factors in logging
            const liquidity = document.getElementById('liquidity-resistance').value;
            const clarity = document.getElementById('price-clarity').value;
            const streak = document.getElementById('previous-result').value;
            const tradeCount = document.getElementById('trade-count').value;
            
            enhancedCheckedItems.push('liquidity:' + liquidity);
            enhancedCheckedItems.push('clarity:' + clarity);
            enhancedCheckedItems.push('streak:' + streak);
            enhancedCheckedItems.push('tradeCount:' + tradeCount);
            
            google.script.run.logTradeCheckWithProbability(false, enhancedCheckedItems, probability);
            
            // Auto-close after 1.5 seconds
            setTimeout(() => {
              google.script.host.close();
            }, 1500);
          });
        </script>
      </body>
    </html>
  `)
  .setWidth(420)
  .setHeight(620) // Increased height for additional features
  .setTitle('Enhanced Pre-Trade Checklist');
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Enhanced Pre-Trade Checklist');
}

/**
 * Records a trade check with probability data for continuous improvement
 * @param {boolean} goDecision - Whether the trade was executed or not
 * @param {string[]} checkedItems - Array of checked item IDs and context factors
 * @param {number} probability - The calculated probability
 */
function logTradeCheckWithProbability(goDecision, checkedItems, probability) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Create or get the tracking sheet
    let trackingSheet = ss.getSheetByName('Probability Tracking');
    if (!trackingSheet) {
      trackingSheet = ss.insertSheet('Probability Tracking');
      
      // Set up headers
      trackingSheet.getRange(1, 1, 1, 8).setValues([
        ['Timestamp', 'Trade Date', 'Calculated Probability', 'Decision', 'Model Type', 'Setup Type', 'Context Factors', 'Actual Result']
      ]);
      
      // Format headers
      trackingSheet.getRange(1, 1, 1, 8)
        .setFontWeight('bold')
        .setBackground('#e0e0e0');
        
      // Auto-size columns
      for (let i = 1; i <= 8; i++) {
        trackingSheet.autoResizeColumn(i);
      }
    }
    
    // Extract model and setup type from checked items
    let modelType = "Not specified";
    let setupType = "Not specified";
    let contextFactors = [];
    
    checkedItems.forEach(item => {
      if (item.startsWith('model:')) {
        modelType = item.substring(6);
      } else if (item.startsWith('setup:')) {
        setupType = item.substring(6);
      } else if (item.startsWith('liquidity:') || 
                 item.startsWith('clarity:') || 
                 item.startsWith('streak:') || 
                 item.startsWith('tradeCount:')) {
        contextFactors.push(item);
      }
    });
    
    // Get the active cell for reference
    let tradeDate = new Date().toISOString().slice(0, 10); // Default to today
    try {
      const activeCell = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveCell();
      if (activeCell) {
        const activeRow = activeCell.getRow();
        const sheet = activeCell.getSheet();
        
        // Try to get the date from column A if we're in a valid row
        if (activeRow > 1) {
          const dateCell = sheet.getRange(activeRow, 1);
          const dateCellValue = dateCell.getValue();
          if (dateCellValue instanceof Date) {
            tradeDate = Utilities.formatDate(dateCellValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          }
        }
      }
    } catch (e) {
      // If we can't get the active cell, just use today's date
      Logger.log('Could not determine active cell: ' + e.toString());
    }
    
    // Add the new row
    const nextRow = trackingSheet.getLastRow() + 1;
    trackingSheet.getRange(nextRow, 1, 1, 7).setValues([
      [
        new Date(), // Timestamp
        tradeDate, // Trade date
        probability, // Calculated probability
        goDecision ? 'GO' : 'NO-GO', // Decision
        modelType, // Model type
        setupType, // Setup type
        contextFactors.join(', ') // Context factors
      ]
    ]);
    
    // Leave the "Actual Result" column (8) blank to be filled later
    
    return true;
  } catch(e) {
    Logger.log('Error logging trade check with probability: ' + e.toString());
    return false;
  }
}

/**
 * Update the actual result of a previously logged trade
 * This can be run at the end of each trading day or when reviewing past trades
 */
function updateTradeResults() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const trackingSheet = ss.getSheetByName('Probability Tracking');
    const dataEntrySheet = ss.getSheetByName('Data Entry Form');
    
    if (!trackingSheet || !dataEntrySheet) {
      Logger.log('Required sheets not found');
      return false;
    }
    
    // Get all data from both sheets
    const trackingData = trackingSheet.getDataRange().getValues();
    const dataEntryData = dataEntrySheet.getDataRange().getValues();
    
    // Skip headers
    const trackingRows = trackingData.slice(1);
    const dataEntryRows = dataEntryData.slice(1);
    
    // Create a map of trade dates to results
    const tradeResults = {};
    dataEntryRows.forEach(row => {
      // Assume date is in column A (index 0) and result is in column O (index 14)
      const tradeDate = row[0];
      const result = row[14];
      
      if (tradeDate instanceof Date && result) {
        const dateStr = Utilities.formatDate(tradeDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        if (!tradeResults[dateStr]) {
          tradeResults[dateStr] = [];
        }
        tradeResults[dateStr].push(result);
      }
    });
    
    // Update tracking rows without results
    let updatedCount = 0;
    
    trackingRows.forEach((row, index) => {
      const rowIndex = index + 2; // Adjust for 1-based rows and header
      
      // Only update rows without results
      if (!row[7]) {
        const tradeDate = row[1];
        const dateStr = typeof tradeDate === 'string' ? tradeDate : 
                      Utilities.formatDate(tradeDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        
        // Find matching results
        if (tradeResults[dateStr] && tradeResults[dateStr].length > 0) {
          // Use the first result for simplicity, or can use a different logic
          const result = tradeResults[dateStr][0];
          
          // Update the result column (column 8)
          trackingSheet.getRange(rowIndex, 8).setValue(result);
          updatedCount++;
        }
      }
    });
    
    Logger.log(`Updated ${updatedCount} trade results in Probability Tracking`);
    return true;
  } catch (e) {
    Logger.log('Error updating trade results: ' + e.toString());
    return false;
  }
}

/**
 * Analyze probability accuracy
 * This calculates how well our probability estimates predict actual outcomes
 */
function analyzeTradeChecklist() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const trackingSheet = ss.getSheetByName('Probability Tracking');
    
    if (!trackingSheet) {
      Logger.log('Probability Tracking sheet not found');
      return;
    }
    
    // Get all data
    const trackingData = trackingSheet.getDataRange().getValues();
    
    // Skip header
    const rows = trackingData.slice(1);
    
    // Filter to only include rows with results
    const completedTrades = rows.filter(row => row[7]);
    
    if (completedTrades.length === 0) {
      Logger.log('No completed trades found for analysis');
      return;
    }
    
    // Group by probability ranges
    const probabilityRanges = {
      "90-100%": { trades: 0, wins: 0 },
      "80-89%": { trades: 0, wins: 0 },
      "70-79%": { trades: 0, wins: 0 },
      "60-69%": { trades: 0, wins: 0 },
      "50-59%": { trades: 0, wins: 0 },
      "40-49%": { trades: 0, wins: 0 },
      "30-39%": { trades: 0, wins: 0 },
      "20-29%": { trades: 0, wins: 0 },
      "10-19%": { trades: 0, wins: 0 },
      "0-9%": { trades: 0, wins: 0 }
    };
    
    // Analyze each trade
    completedTrades.forEach(trade => {
      const probability = parseFloat(trade[2]);
      const actualResult = trade[7].toString().toLowerCase();
      const isWin = actualResult.includes('win');
      
      // Determine which range this falls into
      let range;
      if (probability >= 90) range = "90-100%";
      else if (probability >= 80) range = "80-89%";
      else if (probability >= 70) range = "70-79%";
      else if (probability >= 60) range = "60-69%";
      else if (probability >= 50) range = "50-59%";
      else if (probability >= 40) range = "40-49%";
      else if (probability >= 30) range = "30-39%";
      else if (probability >= 20) range = "20-29%";
      else if (probability >= 10) range = "10-19%";
      else range = "0-9%";
      
      // Update counts
      probabilityRanges[range].trades++;
      if (isWin) probabilityRanges[range].wins++;
    });
    
    // Calculate accuracy for each range
    let analysisText = "Probability Model Accuracy Analysis:\n\n";
    
    // Track overall calibration
    let totalSquaredError = 0;
    let totalTradesWithProbability = 0;
    
    Object.entries(probabilityRanges).forEach(([range, data]) => {
      if (data.trades > 0) {
        const actualWinRate = data.wins / data.trades;
        const expectedWinRate = parseFloat(range.split('-')[0]) / 100; // Use the lower bound for simplicity
        
        analysisText += `${range} Probability\n`;
        analysisText += `  - Trades: ${data.trades}\n`;
        analysisText += `  - Actual Win Rate: ${(actualWinRate * 100).toFixed(1)}%\n`;
        analysisText += `  - Deviation: ${((actualWinRate - expectedWinRate) * 100).toFixed(1)}%\n\n`;
        
        // Update calibration metrics
        totalSquaredError += Math.pow(actualWinRate - expectedWinRate, 2) * data.trades;
        totalTradesWithProbability += data.trades;
      }
    });
    
    // Calculate overall calibration error (Brier score)
    if (totalTradesWithProbability > 0) {
      const brierScore = totalSquaredError / totalTradesWithProbability;
      analysisText += `Overall Calibration Error (Brier Score): ${brierScore.toFixed(3)}\n`;
      analysisText += `Lower score indicates better calibration (0 = perfect, 0.25 = random)`;
    }
    
    // Create or update analysis sheet
    let analysisSheet = ss.getSheetByName('Probability Analysis');
    if (!analysisSheet) {
      analysisSheet = ss.insertSheet('Probability Analysis');
    }
    
    // Clear existing content
    analysisSheet.clear();
    
    // Add analysis text
    analysisSheet.getRange(1, 1).setValue("Analysis Generated: " + new Date().toLocaleString());
    analysisSheet.getRange(3, 1).setValue(analysisText);
    
    // Format the text
    analysisSheet.getRange(3, 1).setWrap(true);
    analysisSheet.setColumnWidth(1, 500);
    
    // Create a chart comparing expected vs. actual win rates
    const ranges = Object.keys(probabilityRanges);
    const expectedRates = ranges.map(range => parseFloat(range.split('-')[0]) / 100);
    const actualRates = ranges.map(range => {
      const data = probabilityRanges[range];
      return data.trades > 0 ? data.wins / data.trades : null;
    });
    
    // Populate data for chart
    analysisSheet.getRange(3, 3).setValue("Probability Range");
    analysisSheet.getRange(3, 4).setValue("Expected Win Rate");
    analysisSheet.getRange(3, 5).setValue("Actual Win Rate");
    
    for (let i = 0; i < ranges.length; i++) {
      if (actualRates[i] !== null) {
        analysisSheet.getRange(4 + i, 3).setValue(ranges[i]);
        analysisSheet.getRange(4 + i, 4).setValue(expectedRates[i]);
        analysisSheet.getRange(4 + i, 5).setValue(actualRates[i]);
      }
    }
    
    // Create chart
    const chart = analysisSheet.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(analysisSheet.getRange(3, 3, ranges.length + 1, 3))
      .setPosition(15, 1, 0, 0)
      .setOption('title', 'Expected vs. Actual Win Rates by Probability Range')
      .setOption('legend', {position: 'top'})
      .setOption('vAxis', {title: 'Win Rate', format: 'percent'})
      .setOption('hAxis', {title: 'Probability Range'})
      .build();
    
    analysisSheet.insertChart(chart);
    
    Logger.log('Probability analysis completed');
    return true;
  } catch (e) {
    Logger.log('Error analyzing trade probabilities: ' + e.toString());
    return false;
  }
}

/**
 * Records a trade check with probability data for continuous improvement
 * @param {boolean} goDecision - Whether the trade was executed or not
 * @param {string[]} checkedItems - Array of checked item IDs
 * @param {number} probability - The calculated probability
 */
function logTradeCheckWithProbability(goDecision, checkedItems, probability) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Create or get the tracking sheet
    let trackingSheet = ss.getSheetByName('Probability Tracking');
    if (!trackingSheet) {
      trackingSheet = ss.insertSheet('Probability Tracking');
      
      // Set up headers
      trackingSheet.getRange(1, 1, 1, 6).setValues([
        ['Timestamp', 'Trade Date', 'Calculated Probability', 'Decision', 'Checked Items', 'Actual Result']
      ]);
      
      // Format headers
      trackingSheet.getRange(1, 1, 1, 6)
        .setFontWeight('bold')
        .setBackground('#e0e0e0');
    }
    
    // Get the active cell for reference (assume it's in the data entry form)
    let tradeDate = new Date().toISOString().slice(0, 10); // Default to today
    try {
      const activeCell = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveCell();
      if (activeCell) {
        const activeRow = activeCell.getRow();
        const sheet = activeCell.getSheet();
        
        // Try to get the date from column A if we're in a valid row
        if (activeRow > 1) {
          const dateCell = sheet.getRange(activeRow, 1);
          const dateCellValue = dateCell.getValue();
          if (dateCellValue instanceof Date) {
            tradeDate = Utilities.formatDate(dateCellValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          }
        }
      }
    } catch (e) {
      // If we can't get the active cell, just use today's date
      Logger.log('Could not determine active cell: ' + e.toString());
    }
    
    // Add the new row
    const nextRow = trackingSheet.getLastRow() + 1;
    trackingSheet.getRange(nextRow, 1, 1, 5).setValues([
      [
        new Date(), // Timestamp
        tradeDate, // Trade date
        probability, // Calculated probability
        goDecision ? 'GO' : 'NO-GO', // Decision
        checkedItems.join(', ') // Checked items
      ]
    ]);
    
    // Leave the "Actual Result" column (6) blank to be filled later
    
    return true;
  } catch(e) {
    Logger.log('Error logging trade check with probability: ' + e.toString());
    return false;
  }
}