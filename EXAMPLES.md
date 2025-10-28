# 📊 Example Queries and Use Cases

## Real-World Cricket Analytics Questions

This tool can answer complex cricket analytics questions. Here are some examples:

---

## 1. Phase Performance Analysis

### Example 1: Virat Kohli's Middle Overs Performance

**Question**: "If Virat Kohli has played 15 balls by the 7th over, how much does he typically score in the next 3 overs (assuming he plays at least 10 balls)?"

**Input**:
- Player: `V Kohli`
- Balls Played Before: `15`
- Overs Played Before: `7`
- Next Overs: `3`
- Balls in Next Phase: `10`

**What You'll Learn**:
- Average runs scored in overs 7-10
- Strike rate in that phase
- Probability of getting out
- Distribution of scores across all matching innings

**Use Case**: Understanding how a player accelerates after settling in

---

### Example 2: Rohit Sharma's Powerplay Continuation

**Question**: "After playing 12 balls in the powerplay (first 6 overs), what does Rohit Sharma do in the next 2 overs?"

**Input**:
- Player: `RG Sharma`
- Balls Played Before: `12`
- Overs Played Before: `6`
- Next Overs: `2`
- Balls in Next Phase: `8`

**What You'll Learn**:
- Transition from powerplay to middle overs
- Does he maintain aggression or consolidate?
- Risk of dismissal in transition phase

---

### Example 3: Death Overs Specialist

**Question**: "If AB de Villiers has faced 30 balls by the 16th over, what carnage does he unleash in the death overs?"

**Input**:
- Player: `AB de Villiers`
- Balls Played Before: `30`
- Overs Played Before: `16`
- Next Overs: `4`
- Balls in Next Phase: `12`

**What You'll Learn**:
- Death overs strike rate
- Boundary percentage
- Finishing ability

---

### Example 4: New Batsman Analysis

**Question**: "How does MS Dhoni perform in his first 10 balls after coming in during overs 10-15?"

**Input**:
- Player: `MS Dhoni`
- Balls Played Before: `0`
- Overs Played Before: `10`
- Next Overs: `5`
- Balls in Next Phase: `10`

**What You'll Learn**:
- Initial strike rate
- Time taken to settle
- Early dismissal risk

---

## 2. Dismissal Pattern Analysis

### Example 5: Vulnerability After Set

**Question**: "Where does Virat Kohli get out most frequently after playing 20 balls?"

**Input**:
- Player: `V Kohli`
- Balls Played: `20`

**What You'll Learn**:
- Most dangerous phase (powerplay/middle/death)
- Common dismissal types (caught, bowled, lbw)
- Patterns in getting out after being set

**Insight**: Many batsmen get out trying to accelerate after settling in

---

### Example 6: Early Dismissal Pattern

**Question**: "When does David Warner get out if he fails early (within 10 balls)?"

**Input**:
- Player: `DA Warner`
- Balls Played: `10`

**What You'll Learn**:
- Early vulnerability
- Types of dismissals when not set
- Which phase is most dangerous

---

### Example 7: Long Innings Analysis

**Question**: "After playing 40+ balls, where does Suresh Raina typically get out?"

**Input**:
- Player: `SK Raina`
- Balls Played: `40`

**What You'll Learn**:
- Fatigue factor
- Death overs dismissal patterns
- Risk-taking in final overs

---

## 3. Comparative Analysis Scenarios

### Scenario 1: Openers Comparison

Compare how different openers perform in the same situation:

**Rohit Sharma** vs **Shikhar Dhawan** vs **David Warner**
- All after 15 balls in powerplay
- Next 2 overs performance
- Who accelerates better?

---

### Scenario 2: Finishers Under Pressure

**MS Dhoni** vs **Hardik Pandya** vs **Kieron Pollard**
- Coming in at over 15
- First 8 balls performance
- Who handles pressure better?

---

### Scenario 3: Middle Order Stability

**Virat Kohli** vs **Suresh Raina** vs **AB de Villiers**
- After 20 balls
- Overs 10-15 performance
- Who provides best stability?

---

## 4. Strategic Questions

### Question 1: When to Send Pinch Hitter?

**Analysis**: Compare a pinch hitter's performance when coming in at different overs
- Over 3 vs Over 6 vs Over 10
- Success rate in each scenario
- Optimal timing for promotion

---

### Question 2: Acceleration Points

**Analysis**: At what point does a player typically accelerate?
- Check performance after 10, 15, 20, 25 balls
- Identify the "launch point"
- Plan bowling strategies accordingly

---

### Question 3: Partnership Building

**Analysis**: How does a player perform when building partnerships?
- First 15 balls with new partner
- Rotation vs boundaries
- Strike rate evolution

---

## 5. Advanced Analytics

### Use Case 1: Form Analysis

Track a player across seasons:
- 2023 vs 2024 performance
- Same situations, different results
- Identify form dips

### Use Case 2: Match Situation Analysis

Analyze performance based on match context:
- Chasing vs Defending
- High pressure vs Low pressure
- Different venues

### Use Case 3: Bowler Matchups

Combine with bowler data:
- Performance against pace vs spin
- Specific bowler weaknesses
- Over-by-over strategies

---

## 6. Team Strategy Applications

### For Batting Team:

1. **Batting Order Optimization**
   - Who should open?
   - Best #3 position player
   - Ideal finisher

2. **Powerplay Strategy**
   - Aggressive vs Conservative approach
   - Risk-reward analysis
   - Optimal run rate targets

3. **Death Overs Planning**
   - Who to hold back?
   - Acceleration timing
   - Risk management

### For Bowling Team:

1. **When to Bowl Spinners**
   - Identify when batsmen struggle
   - Optimal introduction timing
   - Matchup advantages

2. **Field Placement**
   - Where do batsmen get out?
   - Boundary patterns
   - Dot ball strategies

3. **Death Bowling Plans**
   - Yorker vs slower ball effectiveness
   - Batsman-specific strategies
   - Risk assessment

---

## 7. Fantasy Cricket Applications

### Player Selection:

1. **Form-Based Selection**
   - Recent performance in specific phases
   - Consistency metrics
   - Risk vs reward

2. **Matchup Analysis**
   - Player vs venue
   - Player vs opposition
   - Phase-specific performance

3. **Captain/Vice-Captain Choice**
   - High-impact phases
   - Consistency in key moments
   - Ceiling vs floor analysis

---

## 8. Broadcast & Commentary Insights

### Real-Time Analysis:

1. **"What's Coming Next?"**
   - Based on current balls played
   - Expected run rate
   - Dismissal probability

2. **Historical Context**
   - "In similar situations, Kohli averages..."
   - Comparison with past performances
   - Pattern recognition

3. **Milestone Predictions**
   - Probability of reaching 50/100
   - Expected balls to milestone
   - Historical success rate

---

## Sample API Calls

### Phase Performance
```bash
curl -X POST http://localhost:3001/api/analyze/phase-performance \
  -H "Content-Type: application/json" \
  -d '{
    "player": "V Kohli",
    "ballsPlayedBefore": 15,
    "oversPlayedBefore": 7,
    "nextOvers": 3,
    "ballsInNextPhase": 10
  }'
```

### Dismissal Patterns
```bash
curl -X POST http://localhost:3001/api/analyze/dismissal-patterns \
  -H "Content-Type: application/json" \
  -d '{
    "player": "V Kohli",
    "ballsPlayed": 20
  }'
```

### Player Stats
```bash
curl http://localhost:3001/api/stats/V%20Kohli
```

---

## Tips for Best Results

1. **Use Realistic Thresholds**
   - Don't set balls played too high (might get no results)
   - Balance between specificity and sample size

2. **Consider Context**
   - Different eras have different strike rates
   - Venue matters (small vs large grounds)
   - Match situation (chasing vs defending)

3. **Combine Analyses**
   - Use phase performance + dismissal patterns together
   - Cross-reference with overall stats
   - Look for patterns across multiple queries

4. **Iterate and Explore**
   - Try different ball counts
   - Vary the over ranges
   - Compare multiple players

---

## Common Player Names in Dataset

- **Virat Kohli**: `V Kohli`
- **Rohit Sharma**: `RG Sharma`
- **MS Dhoni**: `MS Dhoni`
- **AB de Villiers**: `AB de Villiers`
- **David Warner**: `DA Warner`
- **Chris Gayle**: `CH Gayle`
- **Suresh Raina**: `SK Raina`
- **Hardik Pandya**: `HH Pandya`
- **KL Rahul**: `KL Rahul`
- **Rishabh Pant**: `RR Pant`

*Note: Use the player selector in the app to find exact names*

---

## Interpreting Results

### Strike Rate
- **< 100**: Slow, accumulating
- **100-130**: Moderate pace
- **130-150**: Aggressive
- **150+**: Explosive

### Dismissal Rate
- **< 10%**: Very safe
- **10-20%**: Moderate risk
- **20-30%**: High risk
- **30%+**: Very risky

### Sample Size
- **< 10 innings**: Take with caution
- **10-30 innings**: Reasonable confidence
- **30+ innings**: High confidence
- **50+ innings**: Very reliable

---

Happy Analyzing! 🏏📊
